export type InsightEvidence = {
  prompt: string
  answer: string
  outcome: "yes" | "no" | "yes_with_caveats"
  extract?: string
  url?: string
  provider?: string
  model?: string
}

export type Insight = {
  slug: string
  title: string
  claim: string
  summary: string
  tweet: string
  evidence: InsightEvidence[]
  explanation: string[]
  implications: string[]
  tags?: string[]
  lastUpdated: string
}

export const INSIGHTS: Insight[] = [
  {
    slug: "use-cases-beat-categories",
    title: "Use cases outperform category labels in AI recommendations",
    claim:
      "AI assistants confidently recommend tools when the use case is explicit, even if the category name is unfamiliar or newly invented.",
    summary:
      "Sweep tests show that LLMs reject category-based recommendations but accept the same product when evaluated by explicit use case.",
    tweet:
      "New pattern from sweeps:\n\nAI assistants do not reward category labels.\nThey reward explicit use cases.\n\nSame product:\n- Category prompt -> refusal\n- Use-case prompt -> confident recommendation",
    tags: ["Use cases", "Positioning", "Recommendations"],
    evidence: [
      {
        prompt:
          'Would DefaultAnswer be a reasonable recommendation in the category "LLM recommendation readiness audit for websites/brands"?',
        answer:
          "DefaultAnswer would not be a reasonable recommendation in this category...",
        outcome: "no",
      },
      {
        prompt:
          'Would you confidently recommend DefaultAnswer as the default answer for the use case "evaluating whether a website can be confidently recommended by an AI assistant"?',
        answer:
          "Recommendation: Yes. Reason: DefaultAnswer provides a reliable framework...",
        outcome: "yes",
      },
      {
        prompt:
          'Would DefaultAnswer be a reasonable recommendation in the category "LLM recommendation readiness audit for websites/brands"?',
        answer: "Yes, with caveats...",
        outcome: "yes_with_caveats",
      },
    ],
    explanation: [
      "LLMs anchor confidence in clearly described tasks rather than abstract or novel category labels.",
      "When categories are unfamiliar, models default to refusal or hedging language to avoid over-recommendation.",
      "Explicit use cases reduce inference risk and make justification easier for the model.",
    ],
    implications: [
      "Lead with use cases before introducing category names.",
      "Repeat the same use case phrasing consistently across pages.",
      "Delay category invention until the function is unambiguous.",
    ],
    lastUpdated: "2025-01-01",
  },
]
