import { getBrainServerClient } from '@/lib/supabase/server'

export type BrainProject = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export type BrainSource = {
  id: string
  project_id: string
  user_id: string
  source_type: 'file' | 'url' | 'manual' | null
  title: string | null
  original_file_name?: string | null
  content?: string | null
  metadata?: Record<string, any> | null
  updated_at?: string
  // Legacy/optional fields
  url?: string | null
  status: 'ready'
  created_at: string
}

export type BrainChunk = {
  id: string
  project_id: string
  source_id: string
  user_id: string
  chunk_text: string
  embedding: number[]
  chunk_index: number
  token_count: number | null
  metadata?: Record<string, any> | null
  status?: string | null
  created_at: string
}

type ChunkInsert = {
  content: string
  embedding: number[]
  chunkIndex: number
  tokenCount?: number | null
}

const TABLES = {
  projects: 'brain_projects',
  sources: 'brain_sources',
  chunks: 'brain_chunks',
}

export async function getProjectsForUser(
  userId: string
): Promise<BrainProject[]> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.projects)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  return (data as BrainProject[]) || []
}

export async function getProjectById(
  userId: string,
  projectId: string
): Promise<BrainProject | null> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.projects)
    .select('*')
    .eq('user_id', userId)
    .eq('id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch project: ${error.message}`)
  }

  return data as BrainProject
}

export async function createProject(
  userId: string,
  params: { name: string; description?: string | null }
): Promise<BrainProject> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.projects)
    .insert({
      user_id: userId,
      name: params.name,
      description: params.description ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`)
  }

  return data as BrainProject
}

export async function getSourcesForProject(
  userId: string,
  projectId: string
): Promise<BrainSource[]> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.sources)
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`)
  }

  return (data as BrainSource[]) || []
}

export async function getSourceById(
  userId: string,
  sourceId: string
): Promise<BrainSource | null> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.sources)
    .select('*')
    .eq('user_id', userId)
    .eq('id', sourceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch source: ${error.message}`)
  }

  return data as BrainSource
}

export async function createFileSource(
  userId: string,
  projectId: string,
  params: { title: string | null; storagePath: string; originalFileName: string }
): Promise<BrainSource> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.sources)
    .insert({
      user_id: userId,
      project_id: projectId,
      source_type: 'file',
      title: params.title ?? params.originalFileName,
      original_file_name: params.originalFileName,
      metadata: {
        storagePath: params.storagePath,
        originalFileName: params.originalFileName,
      },
      status: 'ready',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create file source: ${error.message}`)
  }

  return data as BrainSource
}

export async function createUrlSource(
  userId: string,
  projectId: string,
  params: { title: string | null; url: string }
): Promise<BrainSource> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.sources)
    .insert({
      user_id: userId,
      project_id: projectId,
      source_type: 'url',
      title: params.title ?? params.url,
      metadata: { originalUrl: params.url },
      status: 'ready',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create URL source: ${error.message}`)
  }

  return data as BrainSource
}

export async function setSourceStatus(
  sourceId: string,
  status: BrainSource['status']
): Promise<void> {
  if (status !== 'ready') {
    throw new Error(`Invalid status ${status}`)
  }

  const client = getBrainServerClient()
  const { error } = await client
    .from(TABLES.sources)
    .update({ status })
    .eq('id', sourceId)

  if (error) {
    throw new Error(`Failed to update source status: ${error.message}`)
  }
}

export async function createChunks(
  userId: string,
  projectId: string,
  sourceId: string,
  chunks: ChunkInsert[]
): Promise<BrainChunk[]> {
  if (!chunks.length) {
    return []
  }

  const client = getBrainServerClient()
  const payload = chunks.map((chunk, idx) => {
    let safeText = ''
    try {
      safeText = sanitizeChunkText(chunk.content)
    } catch (err) {
      console.error('Failed sanitizing chunk', idx, err)
      safeText = ''
    }

    return {
      user_id: userId,
      project_id: projectId,
      source_id: sourceId,
      chunk_text: safeText,
      chunk_index: chunk.chunkIndex,
      token_count: chunk.tokenCount ?? null,
      embedding: chunk.embedding,
      metadata: { token_count: chunk.tokenCount ?? null },
      status: 'ready',
    }
  })

  const { data, error } = await client
    .from(TABLES.chunks)
    // @ts-ignore Supabase types not generated for brain tables
    .insert(payload)
    .select()

  if (error) {
    throw new Error(`Failed to save chunks: ${error.message}`)
  }

  return (data as BrainChunk[]) || []
}

export function sanitizeChunkText(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\u2028/g, ' ')
    .replace(/\u2029/g, ' ')
    .replace(/\\/g, '\\\\')
}

type SearchResult = {
  chunk: BrainChunk
  score: number
}

export async function getChunksBySource(
  userId: string,
  sourceId: string
): Promise<BrainChunk[]> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.chunks)
    .select('*')
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .order('chunk_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch chunks: ${error.message}`)
  }

  return (data as BrainChunk[]) || []
}

export async function getChunksForProject(
  userId: string,
  projectId: string
): Promise<BrainChunk[]> {
  const client = getBrainServerClient()
  const { data, error } = await client
    .from(TABLES.chunks)
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch chunks: ${error.message}`)
  }

  return (data as BrainChunk[]) || []
}

export async function updateChunkMetadata(
  userId: string,
  updates: Array<{ chunkId: string; metadataPatch: Record<string, any> }>
): Promise<void> {
  if (!updates.length) return
  const client = getBrainServerClient()

  for (const update of updates) {
    const { data: existing, error: fetchError } = await client
      .from(TABLES.chunks)
      .select('metadata')
      .eq('user_id', userId)
      .eq('id', update.chunkId)
      .single()

    if (fetchError) {
      console.error('[brain/db] Failed to fetch chunk metadata', fetchError)
      continue
    }

    const base =
      typeof existing?.metadata === 'string'
        ? (() => {
            try {
              return JSON.parse(existing.metadata)
            } catch {
              return {}
            }
          })()
        : existing?.metadata || {}

    const merged = { ...base, ...(update.metadataPatch || {}) }

    const { error: updateError } = await client
      .from(TABLES.chunks)
      .update({ metadata: merged })
      .eq('user_id', userId)
      .eq('id', update.chunkId)

    if (updateError) {
      console.error('[brain/db] Failed to update chunk metadata', updateError)
    }
  }
}

export async function updateSourceMetadata(
  userId: string,
  sourceId: string,
  metadataPatch: Record<string, any>
): Promise<void> {
  const client = getBrainServerClient()
  const { data: existing, error: fetchError } = await client
    .from(TABLES.sources)
    .select('metadata')
    .eq('user_id', userId)
    .eq('id', sourceId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch source metadata: ${fetchError.message}`)
  }

  const base =
    typeof existing?.metadata === 'string'
      ? (() => {
          try {
            return JSON.parse(existing.metadata)
          } catch {
            return {}
          }
        })()
      : existing?.metadata || {}

  const merged = { ...base, ...metadataPatch }

  const { error: updateError } = await client
    .from(TABLES.sources)
    .update({ metadata: merged })
    .eq('user_id', userId)
    .eq('id', sourceId)

  if (updateError) {
    throw new Error(`Failed to update source metadata: ${updateError.message}`)
  }
}

/**
 * Search chunks using pgvector similarity. Tries RPC first, falls back to a simple
 * limited query when RPC isn't available to avoid hard failures.
 */
export async function searchChunksByEmbedding(
  userId: string,
  projectId: string,
  embedding: number[],
  topK: number
): Promise<SearchResult[]> {
  const client = getBrainServerClient()

  // Preferred path: RPC for vector similarity
  const { data: rpcData, error: rpcError } = await client.rpc(
    'match_brain_chunks',
    {
      query_embedding: embedding,
      match_count: topK,
      project_id: projectId,
      user_id: userId,
    }
  )

  if (!rpcError && rpcData) {
    return (rpcData as any[]).map((row) => ({
      chunk: {
        id: row.id,
        project_id: row.project_id,
        source_id: row.source_id,
        user_id: row.user_id,
        chunk_text: row.chunk_text ?? row.content,
        embedding: row.embedding,
        chunk_index: row.chunk_index ?? row.chunkIndex ?? 0,
        token_count: row.token_count ?? row.tokenCount ?? null,
        metadata: row.metadata ?? {},
        status: row.status ?? null,
        created_at: row.created_at,
      } as BrainChunk,
      score:
        row.similarity ??
        row.score ??
        (typeof row.distance === 'number' ? 1 - row.distance : 0),
    }))
  }

  // Fallback: simple recency query (non-semantic) to avoid breaking the UI
  const { data: fallbackData, error: fallbackError } = await client
    .from(TABLES.chunks)
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(topK)

  if (fallbackError) {
    throw new Error(`Chunk search failed: ${fallbackError.message}`)
  }

  return (fallbackData as BrainChunk[]).map((chunk) => ({
    chunk,
    score: 0,
  }))
}

