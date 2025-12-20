import {
  getSourcesForProject,
  searchChunksByEmbedding,
  type BrainChunk,
  type BrainSource,
} from './db'
import { getEmbedding } from './embeddings'

export async function semanticSearchProject(
  userId: string,
  projectId: string,
  query: string,
  topK = 8
): Promise<Array<{ chunk: BrainChunk; source: BrainSource | null; score: number }>> {
  const embedding = await getEmbedding(query)
  const searchResults = await searchChunksByEmbedding(
    userId,
    projectId,
    embedding,
    topK
  )

  const sources = await getSourcesForProject(userId, projectId)
  const sourceMap = new Map<string, BrainSource>(
    sources.map((source) => [source.id, source])
  )

  return searchResults.map(({ chunk, score }) => ({
    chunk: {
      ...chunk,
      chunk_text: chunk.chunk_text ?? (chunk as any).content,
    },
    source: sourceMap.get(chunk.source_id) || null,
    score,
  }))
}
