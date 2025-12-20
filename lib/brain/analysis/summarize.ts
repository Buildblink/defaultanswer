import OpenAI from 'openai'
import { getChunksBySource, updateSourceMetadata, type BrainChunk } from '../db'

export type BrainSourceSummary = {
  summary_short: string
  summary_long: string
  key_points: string[]
  main_entities: string[]
}

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for source summarization')
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

function buildSourceContext(chunks: BrainChunk[]): string {
  if (!chunks.length) return ''
  const maxChars = 8000
  let acc = ''
  for (const chunk of chunks) {
    const next = `${chunk.chunk_index}: ${chunk.chunk_text}\n`
    if (acc.length + next.length > maxChars) break
    acc += next
  }
  return acc
}

export async function summarizeSourceFromChunks(opts: {
  userId: string
  projectId: string
  sourceId: string
}): Promise<BrainSourceSummary> {
  const chunks = await getChunksBySource(opts.userId, opts.sourceId)
  if (!chunks.length) {
    return {
      summary_short: '',
      summary_long: '',
      key_points: [],
      main_entities: [],
    }
  }

  const context = buildSourceContext(chunks)

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Summarize the following document. Return JSON with summary_short (1-2 sentences), summary_long (paragraph or bullets), key_points (array), and main_entities (array of strings). Keep it concise and factual.',
        },
        {
          role: 'user',
          content: context,
        },
      ],
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    const summary: BrainSourceSummary = {
      summary_short: parsed.summary_short || '',
      summary_long: parsed.summary_long || '',
      key_points: parsed.key_points || [],
      main_entities: parsed.main_entities || [],
    }

    await updateSourceMetadata(opts.userId, opts.sourceId, {
      summary,
    })

    return summary
  } catch (error) {
    console.error('[brain/summarize] Failed to summarize source', error)
    return {
      summary_short: '',
      summary_long: '',
      key_points: [],
      main_entities: [],
    }
  }
}

