import OpenAI from 'openai'

const DEFAULT_MODEL = 'text-embedding-3-small'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate an embedding vector for text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for embeddings')
  }

  const cleaned = text.trim()
  if (!cleaned) {
    throw new Error('Cannot embed empty text')
  }

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
