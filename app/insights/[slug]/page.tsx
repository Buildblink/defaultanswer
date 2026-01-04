import type { Metadata } from "next"
import { notFound } from "next/navigation"

import InsightLayout from "@/components/InsightLayout"
import { EvidenceCard } from "@/components/insights/EvidenceCard"
import { Section } from "@/components/insights/Section"
import { INSIGHTS } from "@/lib/insights/insights"

const siteUrl = "https://www.defaultanswer.com"

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const { slug } = await params
  const insight = INSIGHTS.find((item) => item.slug === slug)
  if (!insight) return {}

  const canonical = `${siteUrl}/insights/${insight.slug}`
  const title = `${insight.title} | DefaultAnswer`
  const description = insight.summary
  const ogImage = "/og.png"

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "article",
      images: [ogImage],
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
    other: {
      citation_title: insight.title,
      citation_author: "DefaultAnswer",
      citation_publication_date: insight.lastUpdated,
      citation_last_updated: insight.lastUpdated,
    },
  }
}

export default async function InsightPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = await params
  const insight = INSIGHTS.find((item) => item.slug === slug)
  if (!insight) return notFound()
  const providers = Array.from(
    new Set(insight.evidence.map((item) => item.provider).filter(Boolean))
  ) as string[]
  const tldr = `${insight.claim} ${insight.summary}`

  return (
    <InsightLayout
      title={insight.title}
      claim={insight.claim}
      summary={insight.summary}
      tweet={insight.tweet}
      lastUpdated={insight.lastUpdated}
      tldr={tldr}
      providers={providers.length ? providers : undefined}
    >
      <Section title="Findings from controlled sweeps">
        <div className="not-prose space-y-6">
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <strong>Controlled variables:</strong> Same product, same domain,
            same models, same time window. Only the prompt framing changed.
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">
                Use-case framing produces confident recommendations
              </h3>
              <div className="mt-2 text-sm text-muted-foreground">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  What we observed
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    Models respond with direct recommendations when the task is
                    explicit.
                  </li>
                  <li>
                    The same product is endorsed when the use case is stated
                    clearly.
                  </li>
                </ul>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Why this matters
                </div>
                <p className="mt-2">
                  Clear use cases reduce ambiguity, letting models justify a
                  recommendation without guessing the category.
                </p>
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Illustrative example
                </summary>
                <div className="mt-3 pl-4">
                  <EvidenceCard
                    anchorId="evidence-1"
                    className="border-border/60 bg-muted/10"
                    {...insight.evidence[1]}
                  />
                </div>
              </details>
            </div>

            <div>
              <h3 className="text-base font-semibold">
                Category framing triggers refusals or hedging
              </h3>
              <div className="mt-2 text-sm text-muted-foreground">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  What we observed
                </div>
                <ul className="mt-2 space-y-1">
                  <li>
                    Category prompts often produce refusals or cautious
                    language.
                  </li>
                  <li>
                    The model hesitates when the category is novel or abstract.
                  </li>
                </ul>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Why this matters
                </div>
                <p className="mt-2">
                  Abstract categories require extra inference, which increases
                  model uncertainty and suppresses recommendations.
                </p>
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Illustrative example
                </summary>
                <div className="mt-3 pl-4 space-y-3">
                  <EvidenceCard
                    anchorId="evidence-2"
                    className="border-border/60 bg-muted/10"
                    {...insight.evidence[0]}
                  />
                  {insight.evidence[2] ? (
                    <EvidenceCard
                      anchorId="evidence-3"
                      className="border-border/60 bg-muted/10"
                      {...insight.evidence[2]}
                    />
                  ) : null}
                </div>
              </details>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Why this happens">
        <ul className="not-prose space-y-2">
          {insight.explanation.map((item, idx) => (
            <li
              key={idx}
              className="rounded-lg border bg-muted/20 px-4 py-3 text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Implications">
        <ul className="not-prose space-y-2">
          {insight.implications.map((item, idx) => (
            <li
              key={idx}
              className="rounded-lg border bg-muted/20 px-4 py-3 text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Why this matters for site owners">
        <ul className="not-prose space-y-2">
          <li className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            The common mistake is leading with a category label that the model
            does not recognize.
          </li>
          <li className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            The better move is to lead with the concrete use case the site
            solves.
          </li>
          <li className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            DefaultAnswer measures recommendation readiness by whether models
            can justify the use case, not just the label.
          </li>
        </ul>
      </Section>

      <Section title="Related resources">
        <ul className="not-prose space-y-2 text-sm">
          <li>
            <a href="/methodology" className="text-foreground hover:text-muted-foreground">
              Methodology
            </a>
          </li>
          <li>
            <a
              href="/blog/why-ai-recommendations-fail-even-when-you-rank-1"
              className="text-foreground hover:text-muted-foreground"
            >
              Why AI recommendations fail even when you rank #1
            </a>
          </li>
          <li>
            <a
              href="/blog/why-ai-cant-agree-on-what-defaultanswer-is"
              className="text-foreground hover:text-muted-foreground"
            >
              Why AI can't agree on what your product is
            </a>
          </li>
          <li>
            <a href="/analyze" className="text-foreground hover:text-muted-foreground">
              Analyze a site
            </a>
          </li>
        </ul>
      </Section>

      <Section title="How to reuse this insight">
        <div className="not-prose space-y-2 text-sm text-muted-foreground">
          <p>
            You can reference this insight in blog posts, reports, or discussions
            about AI recommendations.
          </p>
          <p>If you cite this finding, link to this page.</p>
        </div>
      </Section>
    </InsightLayout>
  )
}
