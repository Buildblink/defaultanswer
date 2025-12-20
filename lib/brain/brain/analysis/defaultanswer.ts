import OpenAI from 'openai'
import {
  getChunksForProject,
  getSourcesForProject,
  type BrainChunk,
  type BrainSource,
} from '../db'
import { BrainChunkEntity } from './entities'

export type DefaultAnswerEntityStats = {
  name: string
  type: string
  totalMentions: number
  sources: Array<{
    sourceId: string
    sourceTitle: string
    mentionCount: number
  }>
}

export type DefaultAnswerProjectAnalysis = {
  projectId: string
  totalSources: number
  totalChunks: number
  entities: DefaultAnswerEntityStats[]
  brandEntities: DefaultAnswerEntityStats[]
  competitorEntities: DefaultAnswerEntityStats[]
  topics: string[]
  keywords: string[]
  defaultAnswerScore: number
  notes: string[]
}

type EntityAggregate = {
  name: string
  type: string
  totalMentions: number
  sources: Record<
    string,
    {
      sourceId: string
      sourceTitle: string
      mentionCount: number
    }
  >
  isBrand?: boolean
  isCompetitor?: boolean
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function aggregateEntities(
  chunks: BrainChunk[],
  sources: BrainSource[],
  brandNames: string[],
  competitorNames: string[]
): EntityAggregate[] {
  const sourceTitleMap = new Map<string, string>(
    sources.map((s) => [s.id, s.title || s.original_file_name || 'Untitled'])
  )
  const brandSet = new Set(brandNames.map(normalizeName))
  const competitorSet = new Set(competitorNames.map(normalizeName))
  const map = new Map<string, EntityAggregate>()

  for (const chunk of chunks) {
    const rawMeta = (chunk.metadata as any) || {}
    const meta =
      typeof rawMeta === 'string'
        ? (() => {
            try {
              return JSON.parse(rawMeta)
            } catch {
              return {}
            }
          })()
        : rawMeta
    const entities = meta?.entities as BrainChunkEntity[] | undefined
    if (!entities || !entities.length) continue

    for (const entity of entities) {
      if (!entity?.name) continue
      const key = normalizeName(entity.name)
      const existing = map.get(key) || {
        name: entity.name,
        type: entity.type || 'other',
        totalMentions: 0,
        sources: {},
        isBrand: false,
        isCompetitor: false,
      }
      existing.totalMentions += 1

      const sourceId = chunk.source_id
      const title = sourceTitleMap.get(sourceId) || 'Unknown source'
      if (!existing.sources[sourceId]) {
        existing.sources[sourceId] = {
          sourceId,
          sourceTitle: title,
          mentionCount: 0,
        }
      }
      existing.sources[sourceId].mentionCount += 1

      if (brandSet.has(key)) existing.isBrand = true
      if (competitorSet.has(key)) existing.isCompetitor = true

      map.set(key, existing)
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalMentions - a.totalMentions
  )
}

function topItemsCount(
  values: string[],
  limit = 15
): string[] {
  const counts = new Map<string, number>()
  for (const v of values) {
    if (!v) continue
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([v]) => v)
}

function computeScore(
  entities: EntityAggregate[],
  brandEntities: EntityAggregate[],
  competitorEntities: EntityAggregate[],
  topics: string[],
  totalChunks: number
): { score: number; notes: string[] } {
  const totalMentions = entities.reduce((sum, e) => sum + e.totalMentions, 0) || 1
  const brandMentions =
    brandEntities.reduce((sum, e) => sum + e.totalMentions, 0) || 0
  const competitorMentions =
    competitorEntities.reduce((sum, e) => sum + e.totalMentions, 0) || 0

  const brandShare = Math.min(1, brandMentions / totalMentions)
  const topicFocus = Math.min(1, topics.length > 0 ? 5 / topics.length : 0)
  const depthScore = Math.min(1, totalChunks / 50)

  let score =
    brandShare * 40 +
    topicFocus * 30 +
    depthScore * 30

  score = Math.max(0, Math.min(100, Math.round(score)))

  const notes: string[] = [
    `Brand share: ${(brandShare * 100).toFixed(1)}% of mentions (${brandMentions} of ${totalMentions}).`,
    `Topic focus: ${topics.slice(0, 5).join(', ') || 'No topics extracted'}.`,
    `Depth: ${totalChunks} chunks analyzed.`,
    `Competitor mentions: ${competitorMentions}.`,
  ]

  return { score, notes }
}

async function generateScoreNotes(
  analysis: DefaultAnswerProjectAnalysis
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Explain in plain English whether this project would rank as a default answer in AI search. Provide 3-5 concrete improvements. Return JSON: { "notes": [] }',
        },
        {
          role: 'user',
          content: JSON.stringify({
            score: analysis.defaultAnswerScore,
            brandEntities: analysis.brandEntities.slice(0, 5),
            competitorEntities: analysis.competitorEntities.slice(0, 5),
            topics: analysis.topics.slice(0, 10),
            keywords: analysis.keywords.slice(0, 10),
            totals: {
              chunks: analysis.totalChunks,
              sources: analysis.totalSources,
            },
          }),
        },
      ],
    })
    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed.notes)) {
      return parsed.notes
    }
  } catch (error) {
    console.error('[brain/defaultanswer] Failed to generate notes', error)
  }
  return []
}

export async function analyzeProjectForDefaultAnswer(opts: {
  userId: string
  projectId: string
  brandNames?: string[]
  competitorNames?: string[]
}): Promise<DefaultAnswerProjectAnalysis> {
  const { userId, projectId } = opts
  const brandNames = opts.brandNames || []
  const competitorNames = opts.competitorNames || []

  const [chunks, sources] = await Promise.all([
    getChunksForProject(userId, projectId),
    getSourcesForProject(userId, projectId),
  ])

  const entities = aggregateEntities(chunks, sources, brandNames, competitorNames)
  const brandEntities = entities.filter((e) => e.isBrand)
  const competitorEntities = entities.filter((e) => e.isCompetitor)

  const topicsAll: string[] = []
  const keywordsAll: string[] = []
  for (const chunk of chunks) {
    const rawMeta = (chunk.metadata as any) || {}
    const meta =
      typeof rawMeta === 'string'
        ? (() => {
            try {
              return JSON.parse(rawMeta)
            } catch {
              return {}
            }
          })()
        : rawMeta
    if (Array.isArray(meta.topics)) {
      topicsAll.push(...meta.topics)
    }
    if (Array.isArray(meta.keywords)) {
      keywordsAll.push(...meta.keywords)
    }
  }

  const topicsTop = topItemsCount(topicsAll, 15)
  const keywordsTop = topItemsCount(keywordsAll, 20)

  const { score: defaultAnswerScore, notes: heuristicNotes } = computeScore(
    entities,
    brandEntities,
    competitorEntities,
    topicsTop,
    chunks.length
  )

  const analysis: DefaultAnswerProjectAnalysis = {
    projectId,
    totalSources: sources.length,
    totalChunks: chunks.length,
    entities: entities.map((e) => ({
      name: e.name,
      type: e.type,
      totalMentions: e.totalMentions,
      sources: Object.values(e.sources),
    })),
    brandEntities: brandEntities.map((e) => ({
      name: e.name,
      type: e.type,
      totalMentions: e.totalMentions,
      sources: Object.values(e.sources),
    })),
    competitorEntities: competitorEntities.map((e) => ({
      name: e.name,
      type: e.type,
      totalMentions: e.totalMentions,
      sources: Object.values(e.sources),
    })),
    topics: topicsTop,
    keywords: keywordsTop,
    defaultAnswerScore,
    notes: heuristicNotes,
  }

  const llmNotes = await generateScoreNotes(analysis)
  if (llmNotes.length) {
    analysis.notes = llmNotes
  }

  return analysis
}
