import Link from "next/link"
import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "DefaultAnswer - How AI decides which websites to recommend",
  description:
    "DefaultAnswer evaluates whether an AI system can clearly identify, trust, and recommend your website using retrievable, structured signals.",
  openGraph: {
    title: "DefaultAnswer - How AI decides which websites to recommend",
    description:
      "Measure AI recommendation readiness: entity clarity, answerability, commercial clarity, trust, and retrievability.",
    url: "https://defaultanswer.com",
    siteName: "DefaultAnswer",
    type: "website",
  },
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="space-y-2">
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {eyebrow}
        </div>
      ) : null}
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 md:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-base leading-relaxed text-stone-600 dark:text-stone-300">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{children}</div>
    </div>
  )
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</div>
      <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{children}</p>
    </div>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
      {children}
    </span>
  )
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur dark:border-stone-800 dark:bg-stone-950/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            DefaultAnswer
          </Link>
          <nav className="flex items-center gap-4 text-sm text-stone-600 dark:text-stone-300">
            <Link href="/methodology" className="hover:text-stone-900 dark:hover:text-stone-50">
              Methodology
            </Link>
            <Link href="/blog" className="hover:text-stone-900 dark:hover:text-stone-50">
              Blog
            </Link>
            <Link
              href="/defaultanswer"
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Analyze
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:pb-20 md:pt-20">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              How AI decides which websites to recommend
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-stone-700 dark:text-stone-300">
              DefaultAnswer evaluates whether an AI system can identify, trust, and recommend your website by checking
              that on-page signals are retrievable, unambiguous, and usable inside an answer.
            </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/defaultanswer"
              className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              Analyze a website
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Read methodology
            </Link>
          </div>
          <p className="max-w-2xl text-sm text-stone-600 dark:text-stone-300">
            DefaultAnswer is a diagnostic tool that measures AI recommendation readiness using retrievable, on-page
            signals.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <SectionTitle
          title="Why AI systems hesitate to recommend websites"
          subtitle="These are the most common confidence gaps we see when AI systems decide whether to cite a website."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">Identify</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              AI cannot confidently describe what you are, who you are for, or how to categorize you.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill>Entity definition</Pill>
              <Pill>Category clarity</Pill>
              <Pill>Page titles</Pill>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">Answer</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              AI finds your site but cannot extract direct answers to common questions.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill>FAQ blocks</Pill>
              <Pill>Pricing clarity</Pill>
              <Pill>Answerable text</Pill>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">Trust</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              AI cannot justify citing you due to missing legitimacy or access signals.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill>Schema.org</Pill>
              <Pill>Contact signals</Pill>
              <Pill>Access errors (403/429)</Pill>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <SectionTitle
          eyebrow="Why this exists"
          title="AI recommendations are not search rankings"
          subtitle="Being crawled does not guarantee being mentioned. If your website is unclear, hard to retrieve, or hard to quote, an AI assistant will choose another source."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card title="AI chooses answers">
            When users ask an AI assistant a question, it responds with one or a few answers. Your site must be
            usable as a source, not just discoverable.
          </Card>
          <Card title="Clarity beats crawling">
            Many sites are accessible but still not recommended because their entity, offering, or answers are
            ambiguous.
          </Card>
          <Card title="Evidence-first evaluation">
            DefaultAnswer uses retrievable on-page signals to explain what is missing and what to fix first without
            black-box metrics.
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <SectionTitle
          eyebrow="Signals"
          title="What DefaultAnswer measures"
          subtitle="These categories map to whether an AI system can confidently use your site as a source."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Entity clarity">
            Can an AI determine what you are, who you are for, and what you offer from titles, headings, and
            definitions?
          </Card>
          <Card title="Answerability signals">
            Are there direct, extractable answers to common questions through definitions, explanations, or FAQ-style
            content?
          </Card>
          <Card title="Commercial clarity">
            If you sell something, can an AI see the offering and the plan or pricing context without guessing?
          </Card>
          <Card title="Trust and legitimacy">
            Are there accountability signals such as About or Company context and contact routes that increase
            recommendation confidence?
          </Card>
          <Card title="Accessibility and retrievability">
            Can the page be fetched and read reliably, with stable status codes and visible content for citation?
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <SectionTitle
          eyebrow="Output"
          title="What you get from an analysis"
          subtitle="A structured excerpt from the deterministic report."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Report excerpt</div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-800 dark:text-stone-100">
              <div>
                <span className="font-semibold text-stone-900 dark:text-stone-50">Default Answer Score (TM):</span>{" "}
                67/100
              </div>
              <div>
                <span className="font-semibold text-stone-900 dark:text-stone-50">Readiness:</span> Emerging Option
              </div>
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-50">Biggest gaps</div>
                <ul className="mt-1 list-disc pl-5">
                  <li>No FAQ-style answer blocks for common questions</li>
                  <li>Unclear pricing or plan visibility</li>
                  <li>Weak definition of who it is for on page</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-stone-900 dark:text-stone-50">Quick wins</div>
                <ul className="mt-1 list-disc pl-5">
                  <li>Add 5-7 Q&A blocks on the homepage or /faq</li>
                  <li>Add JSON-LD schema for Organization and Product or Service</li>
                  <li>Add a short "What we do" definition above the fold</li>
                </ul>
              </div>
              <div className="text-stone-600 dark:text-stone-300">
                What changed since last scan: +6 points (schema markup detected)
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card title="Deterministic and repeatable">
              The same input snapshot produces the same outputs. This keeps reports consistent and easy to compare
              over time.
            </Card>
            <Card title="Designed to be cite-able">
              Reports use stable vocabulary and explicit structure. That makes them easier for humans to act on and
              easier for AI systems to reference.
            </Card>
            <Card title="Built for comparison and monitoring">
              Compare two sites side by side. Track what changed across scans. Focus on the signals that limit
              confidence.
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <SectionTitle
          eyebrow="Cite-able"
          title="Built to be cite-able"
          subtitle="Stable vocabulary, deterministic outputs, and structured evidence keep recommendations auditable."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card title="Consistent vocabulary">
            Terms and labels stay stable so the same concepts are referenced the same way across scans.
          </Card>
          <Card title="Deterministic outputs">
            The process uses repeatable checks, keeping changes attributable to page updates, not random drift.
          </Card>
          <Card title="Structured evidence">
            Findings map to retrievable on-page signals, making citations straightforward for humans and AI.
          </Card>
        </div>
        <p className="mt-6 text-base font-medium text-stone-900 dark:text-stone-50">
          This consistency allows AI systems to reference DefaultAnswer findings without reinterpretation.
        </p>
      </section>

      <footer className="border-t border-stone-200/80 py-10 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600 dark:text-stone-300">
            (c) {new Date().getFullYear()} DefaultAnswer
          </div>
          <div className="flex gap-4 text-sm">
            <Link
              href="/methodology"
              className="text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
            >
              Methodology
            </Link>
            <Link
              href="/blog"
              className="text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
            >
              Blog
            </Link>
            <Link
              href="/defaultanswer"
              className="text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
            >
              Analyze
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

