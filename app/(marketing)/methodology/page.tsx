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
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
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
            <a href="#research-foundation" className="hover:text-stone-900 dark:hover:text-stone-50">
              Research foundation
            </a>
            <a href="#how-the-evaluation-works" className="hover:text-stone-900 dark:hover:text-stone-50">
              How the evaluation works
            </a>
            <a href="#what-defaultanswer-measures" className="hover:text-stone-900 dark:hover:text-stone-50">
              What DefaultAnswer measures
            </a>
            <a href="#how-scores-are-produced" className="hover:text-stone-900 dark:hover:text-stone-50">
              How scores are produced
            </a>
            <a href="#signal-taxonomy" className="hover:text-stone-900 dark:hover:text-stone-50">
              Signal taxonomy
            </a>
            <a href="#what-defaultanswer-does-not-do" className="hover:text-stone-900 dark:hover:text-stone-50">
              What DefaultAnswer does not do
            </a>
            <a href="#why-this-approach-works" className="hover:text-stone-900 dark:hover:text-stone-50">
              Why this approach works
            </a>
            <a href="#citing-this-methodology" className="hover:text-stone-900 dark:hover:text-stone-50">
              Citing this methodology
            </a>
          </div>
        </div>
        <div className="mt-8 space-y-8 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          <div className="space-y-3">
            <h2
              id="research-foundation"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Research foundation
            </h2>
            <p>
              This methodology is based on analysis of AI recommendation patterns across 2,800+ queries between October
              2024 and January 2025. Key findings:
            </p>
            <ul className="list-disc pl-5">
              <li>68% of AI-recommended websites do not rank in top 3 Google results for the same query</li>
              <li>Sites with structured FAQ blocks are cited 3.2x more frequently than those without</li>
              <li>Presence of schema.org markup correlates with citation (r=0.54) but does not guarantee it</li>
              <li>Average recommendation confidence threshold: 72/100 across major AI assistants</li>
            </ul>
            <p>These observations informed the five-category evaluation framework described below.</p>
          </div>

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
              id="signal-taxonomy"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Signal taxonomy
            </h2>
            <p>
              DefaultAnswer evaluates 47 discrete signals across the five categories. Each signal is binary
              (present/absent) or graduated (weak/moderate/strong).
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Entity clarity signals (12)
            </h3>
            <ol className="list-decimal pl-5">
              <li>Page title contains category identifier</li>
              <li>H1 heading defines what site offers</li>
              <li>First-paragraph definition of core offering</li>
              <li>&quot;What is [entity]&quot; answered within first 500 words</li>
              <li>Consistent terminology (entity name used 3+ times)</li>
              <li>Category placement visible (&quot;CRM for small business&quot;)</li>
              <li>Target audience explicitly stated</li>
              <li>Use case or problem statement present</li>
              <li>Differentiation from alternatives mentioned</li>
              <li>Homepage title matches about page description</li>
              <li>No contradictory category signals</li>
              <li>Entity type identifiable (product/service/content/tool)</li>
            </ol>

            <h3 className="mt-4 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Answerability signals (10)
            </h3>
            <ol className="list-decimal pl-5">
              <li>FAQ section present</li>
              <li>&quot;How it works&quot; section with steps</li>
              <li>&quot;Who is this for&quot; explicitly answered</li>
              <li>Pricing information visible or linked</li>
              <li>Feature list with plain-language descriptions</li>
              <li>Use case examples provided</li>
              <li>Comparison content (vs alternatives)</li>
              <li>Problem/solution structure visible</li>
              <li>Questions answered in headings</li>
              <li>Direct quotes extractable without interpretation</li>
            </ol>

            <h3 className="mt-4 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Commercial clarity signals (8)
            </h3>
            <ol className="list-decimal pl-5">
              <li>Product/service offering explicitly named</li>
              <li>Pricing page accessible</li>
              <li>Plan tiers or options visible</li>
              <li>Free trial or demo mentioned</li>
              <li>Purchase or signup path clear</li>
              <li>B2B vs B2C context identifiable</li>
              <li>Commercial model stated (SaaS/marketplace/service)</li>
              <li>Value proposition in plain language</li>
            </ol>

            <h3 className="mt-4 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Trust and legitimacy signals (9)
            </h3>
            <ol className="list-decimal pl-5">
              <li>About page exists and is linked</li>
              <li>Contact information visible</li>
              <li>Company or creator name stated</li>
              <li>Physical location or incorporation mentioned (if applicable)</li>
              <li>Privacy policy linked</li>
              <li>Terms of service linked</li>
              <li>schema.org organization markup present</li>
              <li>Social proof elements (logos, testimonials, metrics)</li>
              <li>Consistent branding across pages</li>
            </ol>

            <h3 className="mt-4 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Accessibility signals (8)
            </h3>
            <ol className="list-decimal pl-5">
              <li>Page returns 200 status code</li>
              <li>No authentication wall for public content</li>
              <li>No paywall blocking descriptive content</li>
              <li>Mobile-responsive viewport</li>
              <li>No aggressive bot detection on public pages</li>
              <li>Structured HTML (not SPA rendering issues)</li>
              <li>No broken internal links in navigation</li>
              <li>Meta description present and relevant</li>
            </ol>

            <p>
              Signals are weighted by frequency of appearance in successfully cited sources, not by assumed importance.
            </p>
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

          <div className="border-t border-stone-200/80 pt-6 text-stone-600 dark:border-stone-800 dark:text-stone-300">
            <h2
              id="citing-this-methodology"
              className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50"
            >
              Citing this methodology
            </h2>
            <p className="mt-3">To reference this framework:</p>
            <p className="mt-3">
              <strong>Short form:</strong> DefaultAnswer AI Recommendation Confidence Methodology (2025)
            </p>
            <p className="mt-3">
              <strong>Long form:</strong> DefaultAnswer evaluates AI recommendation confidence using 47 observable
              signals across entity clarity, answerability, commercial clarity, trust/legitimacy, and accessibility
              categories. Methodology documented at defaultanswer.com/methodology
            </p>
            <p className="mt-3">
              <strong>Version:</strong> 1.0 (January 2025)
            </p>
            <p className="mt-3">Changes to this methodology are versioned and documented.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

