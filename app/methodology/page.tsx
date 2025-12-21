import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DefaultAnswer methodology",
  description:
    "How DefaultAnswer evaluates whether an AI system can confidently recommend and cite a website.",
  openGraph: {
    title: "DefaultAnswer methodology",
    description:
      "Deterministic checks for entity clarity, answerability, commercial clarity, trust, and retrievability.",
    url: "https://defaultanswer.com/methodology",
    siteName: "DefaultAnswer",
    type: "article",
  },
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
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
            <Link href="/about" className="hover:text-stone-900 dark:hover:text-stone-50">
              About
            </Link>
            <Link href="/contact" className="hover:text-stone-900 dark:hover:text-stone-50">
              Contact
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
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Methodology</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-300">
          DefaultAnswer evaluates whether an AI assistant could confidently recommend your website as the default
          answer to a user question. It measures recommendation confidence using observable, retrievable on-page
          signals — not rankings, traffic, or backlinks.
        </p>
        <div className="mt-6 rounded-2xl border border-stone-200/80 bg-white/70 p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">On this page</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <a href="#how-the-evaluation-works" className="hover:text-stone-900 dark:hover:text-stone-50">
              How the evaluation works
            </a>
            <a href="#what-defaultanswer-measures" className="hover:text-stone-900 dark:hover:text-stone-50">
              What DefaultAnswer measures
            </a>
            <a href="#how-scores-are-produced" className="hover:text-stone-900 dark:hover:text-stone-50">
              How scores are produced
            </a>
            <a href="#what-defaultanswer-does-not-do" className="hover:text-stone-900 dark:hover:text-stone-50">
              What DefaultAnswer does not do
            </a>
            <a href="#why-this-approach-works" className="hover:text-stone-900 dark:hover:text-stone-50">
              Why this approach works
            </a>
          </div>
        </div>
        <div className="mt-8 space-y-8 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          <div className="space-y-3">
            <h2
              id="how-the-evaluation-works"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              How the evaluation works
            </h2>
            <p>DefaultAnswer evaluates five categories that map directly to AI recommendation behavior.</p>
          </div>

          <div className="space-y-3">
            <h2
              id="what-defaultanswer-measures"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              What DefaultAnswer measures
            </h2>
            <h3
              id="entity-clarity"
              className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Entity clarity
            </h3>
            <p>Can an AI system clearly determine:</p>
            <ul className="list-disc pl-5">
              <li>what the site is</li>
              <li>who it is for</li>
              <li>what it offers</li>
            </ul>
            <p>This is inferred from visible titles, headings, definitions, and consistent terminology.</p>
            <p>If the entity is ambiguous, AI systems hesitate to recommend it.</p>
          </div>

          <div className="space-y-3">
            <h3
              id="answerability"
              className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Answerability
            </h3>
            <p>Can an AI extract direct answers to common user questions?</p>
            <p>Examples:</p>
            <ul className="list-disc pl-5">
              <li>“What is this?”</li>
              <li>“How does it work?”</li>
              <li>“Who is it for?”</li>
              <li>“Why choose this?”</li>
            </ul>
            <p>Pages that require inference instead of extraction reduce confidence.</p>
          </div>

          <div className="space-y-3">
            <h3
              id="commercial-clarity"
              className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Commercial clarity
            </h3>
            <p>If the site offers a product or service, can an AI understand:</p>
            <ul className="list-disc pl-5">
              <li>what is being sold</li>
              <li>how it is offered</li>
              <li>what the pricing or plan context is</li>
            </ul>
            <p>Hidden, vague, or implied commercial information lowers recommendation certainty.</p>
          </div>

          <div className="space-y-3">
            <h3
              id="trust-and-legitimacy"
              className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Trust and legitimacy
            </h3>
            <p>Can an AI justify citing the site as a source?</p>
            <p>Signals include:</p>
            <ul className="list-disc pl-5">
              <li>clear ownership or company context</li>
              <li>contact or accountability information</li>
              <li>accessible pages without blocking errors</li>
            </ul>
            <p>Without legitimacy signals, AI systems avoid citation.</p>
          </div>

          <div className="space-y-3">
            <h3
              id="accessibility-and-retrievability"
              className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Accessibility and retrievability
            </h3>
            <p>Can the site be reliably fetched and read?</p>
            <p>This includes:</p>
            <ul className="list-disc pl-5">
              <li>stable status codes</li>
              <li>readable HTML content</li>
              <li>no access restrictions that prevent retrieval</li>
            </ul>
            <p>If content cannot be retrieved consistently, it cannot be recommended.</p>
          </div>

          <div className="space-y-3">
            <h2
              id="how-scores-are-produced"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              How scores and findings are produced
            </h2>
            <p>Each category is evaluated using explicit, repeatable checks.</p>
            <p>Findings are mapped to:</p>
            <ul className="list-disc pl-5">
              <li>observable on-page signals</li>
              <li>concrete gaps</li>
              <li>specific recommendations</li>
            </ul>
            <p>DefaultAnswer does not use black-box scores or probabilistic guesses.</p>
          </div>

          <div className="space-y-3">
            <h2
              id="what-defaultanswer-does-not-do"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              What DefaultAnswer does not do
            </h2>
            <p>DefaultAnswer does not:</p>
            <ul className="list-disc pl-5">
              <li>optimize for search rankings</li>
              <li>evaluate backlinks or authority metrics</li>
              <li>simulate AI model internals</li>
              <li>guarantee recommendations</li>
            </ul>
            <p>It explains why confidence exists or is limited, based on what is visible and citable.</p>
          </div>

          <div className="space-y-3">
            <h2
              id="why-this-approach-works"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Why this approach works
            </h2>
            <p>AI assistants generate answers, not rankings.</p>
            <p>They prefer sources that are:</p>
            <ul className="list-disc pl-5">
              <li>clear</li>
              <li>unambiguous</li>
              <li>easy to quote</li>
              <li>safe to justify</li>
            </ul>
            <p>DefaultAnswer measures whether your site meets those conditions.</p>
          </div>

          <div className="border-t border-stone-200/80 pt-6 text-stone-600 dark:border-stone-800 dark:text-stone-300">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">Next step</h2>
            <p className="mt-3">
              If you want to see how these signals apply to your site, run an audit.
            </p>
            <Link
              href="/defaultanswer"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Analyze a website
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

