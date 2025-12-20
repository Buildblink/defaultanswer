import OpenAI from 'openai'
import { sanitizeChunkText } from '../db'

export type BrainChunkEntity = {
  name: string
  type:
    | 'brand'
    | 'product'
    | 'person'
    | 'company'
    | 'category'
    | 'feature'
    | 'metric'
    | 'other'
  is_target_brand?: boolean
  is_competitor?: boolean
  confidence: number
}

export type BrainChunkEntities = {
  entities?: BrainChunkEntity[]
  keywords?: string[]
  topics?: string[]
}

type ChunkForExtraction = { id: string; chunk_text: string }

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for entity extraction')
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

export async function extractEntitiesForChunks(
  chunks: ChunkForExtraction[]
): Promise<
  Array<{
    chunkId: string
    entities: BrainChunkEntities['entities']
    keywords: string[]
    topics: string[]
  }>
> {
  if (!chunks.length) return []

  const batches: ChunkForExtraction[][] = []
  const batchSize = 5
  for (let i = 0; i < chunks.length; i += batchSize) {
    batches.push(chunks.slice(i, i + batchSize))
  }

  const results: Array<{
    chunkId: string
    entities: BrainChunkEntities['entities']
    keywords: string[]
    topics: string[]
  }> = []

  for (const batch of batches) {
    try {
      const openai = getOpenAI()
      const response = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an information extraction engine for SEO and AI recommendation analysis. ' +
              'Given passages of text, identify entities (brand names, product names, company names, people, categories, features, metrics) and return strict JSON. ' +
              'Return concise keywords and topics. Keep arrays short and focused.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              chunks: batch.map((c) => ({
                id: c.id,
                text: sanitizeChunkText(c.chunk_text).slice(0, 2000),
              })),
            }),
          },
        ],
      })

      const content = response.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)
      const parsedResults = Array.isArray(parsed.results) ? parsed.results : []

      for (const item of parsedResults) {
        results.push({
          chunkId: item.chunkId || item.id || '',
          entities: item.entities || [],
          keywords: item.keywords || [],
          topics: item.topics || [],
        })
      }
    } catch (error) {
      console.error('[brain/entities] Batch extraction failed', error)
    }
  }

  return results
}

