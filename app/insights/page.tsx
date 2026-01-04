import Link from "next/link"

import { Badge } from "@/components/insights/Badge"
import { CopyIconButton } from "@/components/insights/CopyIconButton"
import { INSIGHTS } from "@/lib/insights/insights"

function excerptText(text: string, limit = 140) {
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trim()}…`
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function InsightsIndex() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Insights</h1>
      <p className="mt-4 text-muted-foreground">
        Canonical findings derived from AI recommendation sweeps.
      </p>

      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {INSIGHTS.map((insight) => (
          <li key={insight.slug} className="h-full">
            <div className="flex h-full flex-col rounded-xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Updated: {formatDate(insight.lastUpdated)}
                  </div>
                  <Link href={`/insights/${insight.slug}`}>
                    <h2 className="text-xl font-medium">{insight.title}</h2>
                  </Link>
                </div>
                {insight.tweet ? (
                  <CopyIconButton text={insight.tweet} label="Copy tweet" />
                ) : null}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {excerptText(insight.claim, 160)}
              </p>

              {insight.tags && insight.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {insight.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              ) : null}

              <div className="mt-6">
                <Link
                  href={`/insights/${insight.slug}`}
                  className="text-sm font-medium text-foreground hover:text-muted-foreground"
                >
                  View insight
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
