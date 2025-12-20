import OpenAI from 'openai'

const DEFAULT_MODEL = 'text-embedding-3-small'

let openaiClient: OpenAI | null = null

function getOpenAI(apiKey: string): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Generate an embedding vector for text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embeddings')
  }

  const cleaned = text.trim()
  if (!cleaned) {
    throw new Error('Cannot embed empty text')
  }

  const openai = getOpenAI(apiKey)
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODEL,
    input: cleaned,
  })

  const embedding = response.data?.[0]?.embedding
  if (!embedding) {
    throw new Error('No embedding returned from OpenAI')
  }

  return embedding
}

