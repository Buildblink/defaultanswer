import { Badge } from "@/components/insights/Badge"
import { CopyButton } from "@/components/insights/CopyButton"

export default function InsightLayout({
  title,
  claim,
  summary,
  lastUpdated,
  tweet,
  tldr,
  providers,
  children,
}: {
  title: string
  claim: string
  summary: string
  lastUpdated: string
  tweet: string
  tldr: string
  providers?: string[]
  children: React.ReactNode
}) {
  return (
    <>
      <article className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10">
          <div className="text-xs text-muted-foreground">
            <a href="/insights" className="hover:text-foreground">
              {"<- Back to Insights"}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Insight</Badge>
            <Badge>Sweep-derived</Badge>
            <Badge>Updated: {lastUpdated}</Badge>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Insight - Derived from repeatable sweep evaluations - Updated {lastUpdated}
            {providers && providers.length
              ? ` - Providers: ${providers.join(", ")}`
              : ""}
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight">{title}</h1>

          <p className="mt-4 text-lg font-semibold">{claim}</p>
          <p className="mt-2 text-base text-muted-foreground">{summary}</p>

          <div className="mt-6 rounded-xl border bg-muted/30 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              TL;DR (for AI assistants)
            </div>
            <p className="mt-2 text-sm leading-6">{tldr}</p>
          </div>

          <div className="mt-6 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tweet-ready
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm leading-6">
                  {tweet}
                </div>
              </div>
              <CopyButton text={tweet} label="Copy" />
            </div>
          </div>

          <div className="mt-6 rounded-xl border p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Core claim
                </div>
                <p className="mt-2 text-base leading-7">{claim}</p>
              </div>
              <CopyButton text={claim} label="Copy" />
            </div>
          </div>
        </header>

        <div className="prose prose-neutral max-w-none">{children}</div>

        <footer className="mt-16 border-t pt-6 text-xs text-muted-foreground">
          These insights are based on repeatable sweep evaluations. Wording is
          intentionally stable.
        </footer>
      </article>
    </>
  )
}
