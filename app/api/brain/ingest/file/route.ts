import { NextResponse } from 'next/server'
import { chunkText } from '@/lib/brain/chunking'
import { getEmbedding } from '@/lib/brain/embeddings'
import {
  createChunks,
  getSourceById,
  setSourceStatus,
  updateChunkMetadata,
} from '@/lib/brain/db'
import { getUserIdFromRequest } from '@/lib/brain/auth'
import { downloadBrainFile } from '@/lib/brain/storage'
import { extractTextFromBuffer } from '@/lib/brain/text-extract'
import { extractEntitiesForChunks } from '@/lib/brain/analysis/entities'
import { summarizeSourceFromChunks } from '@/lib/brain/analysis/summarize'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let body: { sourceId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.sourceId) {
    return NextResponse.json(
      { error: 'sourceId is required' },
      { status: 400 }
    )
  }

  try {
    const source = await getSourceById(auth.userId, body.sourceId)
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    const metadata =
      typeof source.metadata === 'string'
        ? (() => {
            try {
              return JSON.parse(source.metadata)
            } catch {
              return null
            }
          })()
        : source.metadata

    if (
      source.source_type !== 'file' ||
      !metadata ||
      !metadata.storagePath
    ) {
      return NextResponse.json(
        { error: 'Source is not a file upload' },
        { status: 400 }
      )
    }

    const file = await downloadBrainFile(metadata.storagePath)
    const { text } = await extractTextFromBuffer(file.buffer, {
  filename: source.title || "file",
})




    const chunks = chunkText(text)
    const embeddedChunks = []
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk.content)
      embeddedChunks.push({
        content: chunk.content,
        embedding,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
      })
    }

    const savedChunks = await createChunks(
      auth.userId,
      source.project_id,
      source.id,
      embeddedChunks
    )

    // Enrich chunks with entities/keywords/topics (best-effort)
    try {
      const extraction = await extractEntitiesForChunks(
        savedChunks.map((chunk) => ({
          id: chunk.id,
          chunk_text: chunk.chunk_text,
        }))
      )

      await updateChunkMetadata(
        auth.userId,
        extraction.map((item) => ({
          chunkId: item.chunkId,
          metadataPatch: {
            entities: item.entities,
            keywords: item.keywords,
            topics: item.topics,
          },
        }))
      )
    } catch (err) {
      console.error('[brain/ingest/file] Enrichment failed', err)
    }

    // Source-level summary (best-effort)
    try {
      await summarizeSourceFromChunks({
        userId: auth.userId,
        projectId: source.project_id,
        sourceId: source.id,
      })
    } catch (err) {
      console.error('[brain/ingest/file] Summary failed', err)
    }

    await setSourceStatus(source.id, 'ready')

    return NextResponse.json({
      success: true,
      chunks: savedChunks.length,
      sourceId: source.id,
    })
  } catch (error) {
    console.error('[brain/ingest/file] Error', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingestion failed' },
      { status: 500 }
    )
  }
}

