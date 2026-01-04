"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CopyButton } from "@/components/insights/CopyButton"

type RawSweepResult = {
  id?: string
  sweep_id?: string
  created_at?: string
  provider?: string
  model?: string
  prompt_key?: string
  prompt?: string
  prompt_text?: string | null
  response_text?: string | null
  mentioned?: boolean
  mention_rank?: number | null
  winner?: string | null
  confidence?: number | null
}

type RawSweepPayload = {
  sweep?: { created_at?: string }
  results?: RawSweepResult[]
}

type InsightEvidenceDraft = {
  prompt: string
  answer: string
  outcome: "yes" | "no" | "yes_with_caveats"
  provider?: string
  model?: string
}

type InsightDraft = {
  slug: string
  title: string
  claim: string
  summary: string
  tweet: string
  evidence: InsightEvidenceDraft[]
  explanation: string[]
  implications: string[]
  lastUpdated: string
}

function getPromptText(row: RawSweepResult) {
  return row.prompt_text || row.prompt || ""
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function classifyPrompt(prompt: string) {
  const lower = prompt.toLowerCase()
  if (lower.includes("use case") || lower.includes("use-case")) return "use-case"
  if (lower.includes("category")) return "category"
  return "other"
}

function inferOutcome(row: RawSweepResult) {
  const answer = (row.response_text || "").toLowerCase()
  if (answer.includes("with caveat") || answer.includes("with caution") || answer.includes("depends")) {
    return "yes_with_caveats" as const
  }
  if (row.mentioned === false) return "no" as const
  if (answer.includes("would not") || answer.includes("not a reasonable recommendation")) {
    return "no" as const
  }
  if (row.mentioned === true || row.mention_rank === 1 || answer.includes("recommend")) {
    return "yes" as const
  }
  return "no" as const
}

function pickEvidence(rows: RawSweepResult[]) {
  const scored = rows
    .filter((row) => getPromptText(row) && row.response_text)
    .map((row) => {
      const outcome = inferOutcome(row)
      const base = outcome === "yes" || outcome === "no" ? 2 : 1
      const confidence = typeof row.confidence === "number" ? row.confidence : 0
      const rankBonus = row.mention_rank === 1 ? 1 : 0
      return { row, outcome, score: base + confidence + rankBonus }
    })

  const byOutcome = {
    yes: scored.filter((item) => item.outcome === "yes").sort((a, b) => b.score - a.score),
    no: scored.filter((item) => item.outcome === "no").sort((a, b) => b.score - a.score),
    yes_with_caveats: scored
      .filter((item) => item.outcome === "yes_with_caveats")
      .sort((a, b) => b.score - a.score),
  }

  const picked: typeof scored = []
  if (byOutcome.yes[0]) picked.push(byOutcome.yes[0])
  if (byOutcome.no[0]) picked.push(byOutcome.no[0])
  if (byOutcome.yes_with_caveats[0]) picked.push(byOutcome.yes_with_caveats[0])

  const remaining = scored
    .filter((item) => !picked.includes(item))
    .sort((a, b) => b.score - a.score)

  while (picked.length < 4 && remaining.length) {
    picked.push(remaining.shift() as (typeof scored)[number])
  }

  return picked.slice(0, 4).map((item) => ({
    prompt: getPromptText(item.row),
    answer: item.row.response_text || "",
    outcome: item.outcome,
    provider: item.row.provider,
    model: item.row.model,
  }))
}

function buildTitle(rows: RawSweepResult[]) {
  const stats = rows.reduce(
    (acc, row) => {
      const promptText = getPromptText(row)
      const bucket = classifyPrompt(promptText)
      const outcome = inferOutcome(row)
      acc[bucket][outcome] += 1
      return acc
    },
    {
      category: { yes: 0, no: 0, yes_with_caveats: 0 },
      "use-case": { yes: 0, no: 0, yes_with_caveats: 0 },
      other: { yes: 0, no: 0, yes_with_caveats: 0 },
    }
  )

  if (stats["use-case"].yes >= 1 && stats.category.no >= 1) {
    return "Use cases outperform category labels in AI recommendations"
  }
  if (stats["use-case"].yes >= stats.category.yes) {
    return "Explicit use cases increase AI recommendation confidence"
  }
  return "Clear prompts drive more confident AI recommendations"
}

function buildTweet(claim: string) {
  return [
    "New sweep insight:",
    "",
    claim,
    "Clear tasks beat abstract labels.",
  ].join("\n")
}

function buildDraft(payload: RawSweepPayload): InsightDraft {
  const results = payload.results || []
  const title = buildTitle(results)
  const claim =
    "AI assistants recommend tools more confidently when the use case is explicit rather than framed as an abstract category."
  const summary =
    "Across sweep prompts, use-case wording produces clearer recommendations than category labels for the same product."
  const tweet = buildTweet(claim)
  const evidence = pickEvidence(results)
  const explanation = [
    "Explicit tasks reduce ambiguity for the model.",
    "Category labels force the model to infer the task, which introduces hedging.",
    "Use-case phrasing makes justification easier and more direct.",
  ]
  const implications = [
    "Lead with use cases before naming a category.",
    "Keep the same use-case phrasing consistent across pages.",
    "Introduce category labels only after the function is clear.",
  ]

  const lastUpdated = (payload.sweep?.created_at || new Date().toISOString()).slice(0, 10)

  return {
    slug: slugify(title),
    title,
    claim,
    summary,
    tweet,
    evidence,
    explanation,
    implications,
    lastUpdated,
  }
}

export default function InsightBuilderPage() {
  const [rawJson, setRawJson] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<InsightDraft | null>(null)

  function onGenerate() {
    setError(null)
    setDraft(null)
    try {
      const parsed = JSON.parse(rawJson) as RawSweepPayload | RawSweepPayload[]
      const payload = Array.isArray(parsed) ? { results: parsed.flatMap((item) => item.results || []) } : parsed
      if (!payload.results || !payload.results.length) {
        throw new Error("No sweep results found in JSON.")
      }
      setDraft(buildDraft(payload))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON.")
    }
  }

  const draftJson = useMemo(() => {
    if (!draft) return ""
    return JSON.stringify(draft, null, 2)
  }, [draft])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Insight Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Paste sweep JSON</label>
            <Textarea
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
              placeholder="Paste sweep JSON (downloaded from /admin/sweeps)"
              rows={10}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onGenerate} disabled={!rawJson.trim()}>
              Generate draft
            </Button>
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Draft Insight JSON</CardTitle>
          {draft ? <CopyButton text={draftJson} label="Copy JSON" /> : null}
        </CardHeader>
        <CardContent>
          <Textarea readOnly value={draftJson} rows={16} />
        </CardContent>
      </Card>
    </div>
  )
}
