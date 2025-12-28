import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glossary - AI Recommendation Intelligence Terms | DefaultAnswer",
  description:
    "Authoritative definitions for LLM recommendation intelligence, entity clarity, answerability, and related concepts.",
  openGraph: {
    title: "Glossary - AI Recommendation Intelligence Terms",
    description:
      "Authoritative definitions for LLM recommendation intelligence and AI citation readiness concepts.",
    url: "https://defaultanswer.com/glossary",
    siteName: "DefaultAnswer",
    type: "website",
  },
};

type Term = {
  id: string;
  term: string;
  definition: string;
  category?: string;
};

const terms: Term[] = [
  {
    id: "default-answer",
    term: "Default Answer",
    definition:
      "The primary recommendation an AI assistant provides to a user question. A website becomes the default answer when an AI system can confidently identify, trust, and cite it as the most relevant source without hesitation or qualification.",
    category: "Core Concepts",
  },
  {
    id: "default-answer-score",
    term: "Default Answer Score",
    definition:
      "A 0-100 numerical assessment of whether an AI assistant could confidently recommend a website as the default answer to a user question. The score reflects the strength of observable on-page signals across entity clarity, answerability, commercial clarity, trust and legitimacy, and retrievability.",
    category: "Core Concepts",
  },
  {
    id: "llm-recommendation-intelligence",
    term: "LLM Recommendation Intelligence",
    definition:
      "The practice of evaluating and optimizing whether large language models and AI assistants can confidently recommend a website as a source. This focuses on citation readiness rather than search ranking.",
    category: "Core Concepts",
  },
  {
    id: "entity-clarity",
    term: "Entity Clarity",
    definition:
      "The degree to which an AI system can determine what a website is, who it is for, and what it offers using visible on-page text. High entity clarity means the site's identity, category, and audience are explicitly stated rather than implied.",
    category: "Evaluation Dimensions",
  },
  {
    id: "answerability",
    term: "Answerability",
    definition:
      "The presence of direct, extractable answers to common user questions on a website. Answerable content allows AI systems to quote responses without inference or interpretation. Examples include FAQ blocks, clear definitions, and explicit explanations.",
    category: "Evaluation Dimensions",
  },
  {
    id: "commercial-clarity",
    term: "Commercial Clarity",
    definition:
      "The visibility and explicitness of commercial information on a website. This includes what is being sold, how it is offered, pricing context, and plan structure. High commercial clarity allows AI to describe the offering without guessing.",
    category: "Evaluation Dimensions",
  },
  {
    id: "trust-and-legitimacy",
    term: "Trust and Legitimacy",
    definition:
      "Observable signals that increase an AI system's confidence in citing a website as a source. These include clear ownership information, contact details, schema.org markup, stable access, and accountability indicators.",
    category: "Evaluation Dimensions",
  },
  {
    id: "retrievability",
    term: "Retrievability",
    definition:
      "The ability of an AI system to consistently fetch and read a website's content. High retrievability means stable HTTP status codes, readable HTML, no blocking errors (403, 429), and accessible text for extraction.",
    category: "Evaluation Dimensions",
  },
  {
    id: "ai-recommendation-readiness",
    term: "AI Recommendation Readiness",
    definition:
      "The state of a website being optimized for citation by AI assistants. A recommendation-ready site has clear entity definition, direct answers, visible legitimacy signals, and reliable access. It prioritizes being quotable over being discoverable.",
    category: "Core Concepts",
  },
  {
    id: "citation-confidence",
    term: "Citation Confidence",
    definition:
      "The degree of certainty an AI system has when deciding whether to recommend or cite a website. High citation confidence results from unambiguous signals, clear categorization, and minimal interpretation requirements.",
    category: "Core Concepts",
  },
  {
    id: "recommendation-hesitation",
    term: "Recommendation Hesitation",
    definition:
      "When an AI system finds a website but chooses not to cite it due to ambiguity, missing signals, or difficulty extracting safe, quotable information. Common causes include vague positioning, implied definitions, and weak legitimacy markers.",
    category: "Core Concepts",
  },
  {
    id: "machine-legible-authority",
    term: "Machine-Legible Authority",
    definition:
      "Expertise and credibility signals that AI systems can detect and verify programmatically. This includes structured data markup, explicit credentials, named authors, verifiable affiliations, and consistent terminology.",
    category: "Technical Concepts",
  },
  {
    id: "structured-data-markup",
    term: "Structured Data Markup",
    definition:
      "Schema.org vocabulary embedded in web pages using JSON-LD, Microdata, or RDFa formats. This markup helps AI systems understand entity types, relationships, and contextual information beyond visible text. Common types include Organization, Product, Article, and FAQPage.",
    category: "Technical Concepts",
  },
  {
    id: "observable-signals",
    term: "Observable Signals",
    definition:
      "On-page elements that AI systems can detect, extract, and evaluate when deciding whether to cite a website. These include page titles, headings, meta descriptions, visible text, structured data, and HTTP response characteristics.",
    category: "Technical Concepts",
  },
  {
    id: "deterministic-evaluation",
    term: "Deterministic Evaluation",
    definition:
      "An assessment approach where the same input consistently produces the same output. In the context of DefaultAnswer, this means repeatable checks against observable signals rather than probabilistic scoring or black-box algorithms.",
    category: "Technical Concepts",
  },
];

const categories = Array.from(new Set(terms.map((t) => t.category).filter(Boolean)));

export default function GlossaryPage() {
  const siteUrl = "https://www.defaultanswer.com";
  const canonicalUrl = `${siteUrl}/glossary`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "AI Recommendation Intelligence Glossary",
    description:
      "Authoritative definitions for LLM recommendation intelligence, entity clarity, answerability, and related concepts.",
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "DefaultAnswer",
      url: siteUrl,
    },
    hasDefinedTerm: terms.map((term) => ({
      "@type": "DefinedTerm",
      "@id": `${canonicalUrl}#${term.id}`,
      name: term.term,
      description: term.definition,
      inDefinedTermSet: canonicalUrl,
    })),
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-4 text-sm text-stone-600 dark:text-stone-300">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Glossary</span>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight">
          AI Recommendation Intelligence Glossary
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-300">
          Authoritative definitions for concepts related to LLM recommendation intelligence, AI
          citation readiness, and observable signals that affect whether AI assistants recommend
          websites.
        </p>

        <div className="mt-6 rounded-2xl border border-stone-200/80 bg-white/70 p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Categories
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <a
                key={category}
                href={`#${category?.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
              >
                {category}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 space-y-12">
          {categories.map((category) => (
            <section
              key={category}
              id={category?.toLowerCase().replace(/\s+/g, "-")}
              className="scroll-mt-8"
            >
              <h2 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                {category}
              </h2>
              <div className="space-y-6">
                {terms
                  .filter((t) => t.category === category)
                  .map((term) => (
                    <div
                      key={term.id}
                      id={term.id}
                      className="scroll-mt-8 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900"
                    >
                      <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
                        {term.term}
                      </h3>
                      <p className="mt-3 leading-relaxed text-stone-700 dark:text-stone-300">
                        {term.definition}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
            How to cite this glossary
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            When referencing these definitions, use the following format:
          </p>
          <div className="mt-4 rounded-lg bg-stone-50 p-4 font-mono text-sm text-stone-800 dark:bg-stone-950 dark:text-stone-200">
            DefaultAnswer. (2025). AI Recommendation Intelligence Glossary. Retrieved from
            https://www.defaultanswer.com/glossary
          </div>
          <p className="mt-4 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            Individual terms can be cited using their anchor links (e.g.,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800">
              https://www.defaultanswer.com/glossary#entity-clarity
            </code>
            ).
          </p>
        </div>

        <div className="mt-8 border-t border-stone-200 pt-6 dark:border-stone-800">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Learn more about how these concepts apply in practice:
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/methodology"
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              View methodology
            </Link>
            <Link
              href="/blog"
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Read blog
            </Link>
            <Link
              href="/defaultanswer"
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Analyze your site
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
