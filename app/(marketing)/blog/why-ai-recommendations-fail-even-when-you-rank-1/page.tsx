import Link from "next/link";
import { blogPosts } from "../posts";
import { BlogPostLayout } from "@/components/blog";

const post = blogPosts.find(
  (item) => item.slug === "why-ai-recommendations-fail-even-when-you-rank-1"
);
const siteUrl = "https://www.defaultanswer.com";
const canonicalUrl = `${siteUrl}/blog/${post?.slug}`;

export const metadata = {
  title: `${post?.title} | DefaultAnswer`,
  description: post?.description,
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: `${post?.title} | DefaultAnswer`,
    description: post?.description,
    type: "article",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function BlogPostPage() {
  if (!post) return null;

  return (
    <BlogPostLayout
      slug={post.slug}
      title={post.title}
      description={post.description}
      date={post.date}
      updatedAt={post.updatedAt}
      intro={
        <p>
          This article is intentionally limited to observable behavior and practical consequences. It
          does not rely on proprietary internals or speculative claims. For a related framing on
          description limits, see{" "}
          <Link
            href="/blog/why-ai-cannot-recommend-what-it-cannot-describe"
            className="underline hover:text-stone-900 dark:hover:text-stone-50"
          >
            cannot recommend what it cannot describe
          </Link>
          .
        </p>
      }
      coreClaim="AI assistants do not choose the best page. They choose the easiest source to use inside an answer."
      keyIdea="Search engines rank documents; AI systems generate answers. A website can rank highly and still be skipped if it is hard to describe, hard to quote, or hard to justify as a source."
      tldr={[
        "Search engines rank documents; AI assistants need sources they can quote and justify.",
        "Sites get skipped when definitions, answers, or legitimacy signals are hard to extract.",
        "Recommendation-ready means clear definition, self-contained answers, and visible legitimacy and access.",
      ]}
      jumpNavItems={[
        { href: "#ranking-not-recommending", label: "Ranking ≠ recommending" },
        { href: "#observable-source-selection-patterns", label: "Observable source selection patterns" },
        { href: "#common-failure-patterns", label: "Common failure patterns" },
        { href: "#recommendation-ready-definition", label: "Recommendation-ready definition" },
        { href: "#what-to-fix-first", label: "What to fix first" },
      ]}
      ctaPosition="middle-and-end"
      closingNote={
        <>
          <p className="leading-relaxed">
            AI recommendation is not about gaming a system. It is about being understandable under
            constraint.
          </p>
          <p className="leading-relaxed">
            Websites that are clear, explicit, answerable, legitimate, and retrievable are easier
            for AI systems to use.
          </p>
        </>
      }
    >
      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="ranking-not-recommending" className="space-y-4">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Ranking &ne; recommending
          </h2>

          <p className="leading-relaxed">
            Many websites that rank at the top of search results are never mentioned by AI
            assistants.
          </p>

          <p className="leading-relaxed">
            This is not a temporary gap, and it is not a failure of &quot;AI SEO.&quot; It follows
            directly from how AI systems answer questions.
          </p>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              In practice, ranking well does not guarantee being recommended. AI systems do not ask,
              "Which page should I show?" They ask, implicitly, "Which source can I use to answer
              this question clearly and safely?"
            </p>
          </div>

          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Relevance and authority can still coexist with uncertainty.</li>
            <li>Summaries can be hard to form when definitions are unclear.</li>
            <li>Sources can be skipped when justification is thin.</li>
          </ul>
        </section>
      </div>

      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="observable-source-selection-patterns" className="space-y-4">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Observable source selection patterns
          </h2>

          <p className="leading-relaxed">
            The internal mechanics of AI systems are proprietary. Their behavior is observable
            across common AI assistants. Several patterns are consistent.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                Clear description
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                Prefer sources that are easy to describe from visible definitions and offerings.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                Extractable answers
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                Favor extractable answers over comprehensive coverage or stitched-together sections.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                Justifiable sources
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                Avoid sources that require justification they cannot provide.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                Retrievable content
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                Use only content they can reliably retrieve at fetch time.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="common-failure-patterns" className="space-y-6">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Common failure patterns
          </h2>

          <p className="leading-relaxed">
            When AI assistants avoid a website, it is rarely because the content is low quality.
            More often, the site creates uncertainty at the moment an answer must be formed.
          </p>

          <div className="grid gap-4">
            {[
              {
                title: "1. The website never clearly states what it is",
                body: "Many sites describe features and benefits without a clear declarative statement about the entity itself. This is about categorization.",
                symptom: "The page explains what it does but never states what it is.",
              },
              {
                title: "2. Answers are spread across multiple sections or pages",
                body: "Content designed for exploration distributes information across long pages, secondary links, or interactive elements.",
                symptom: "Answering a question requires assembling information from several places.",
              },
              {
                title: "3. Key information requires interpretation",
                body: "Sites that rely on implied meaning or marketing phrasing force interpretation rather than extraction. Interpretation introduces risk.",
                symptom: "Important facts are implied rather than stated plainly.",
              },
              {
                title: "4. Commercial intent is unclear",
                body: "If pricing, plans, eligibility, or scope are unclear or hidden, the AI has fewer concrete facts to work with.",
                symptom: "Pricing or access boundaries are unclear.",
              },
              {
                title: "5. Legitimacy signals are missing or hard to verify",
                body: "When a site lacks clear organizational context or contact information, it becomes harder to justify citing it.",
                symptom: "No clear organizational context or contact information is visible.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950"
              >
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {item.body}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                  <span className="font-semibold text-stone-900 dark:text-stone-50">
                    Typical symptom:
                  </span>{" "}
                  {item.symptom}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="recommendation-ready-definition" className="space-y-4">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Recommendation-ready definition
          </h2>

          <p className="leading-relaxed">A website is recommendation-ready when an AI system can:</p>

          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Describe it clearly — what it is, who it is for, and what it offers can be stated directly.</li>
            <li>Extract answers easily — common questions can be answered using visible, self-contained text.</li>
            <li>Justify citing it — legitimacy and access signals are present and verifiable.</li>
          </ul>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Checklist
            </div>

            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {[
                "A clear statement of what the site is.",
                "Direct, self-contained answers to common questions.",
                "Key information stated plainly, without interpretation.",
                "Explicit pricing, access, and scope boundaries.",
                "Visible organizational context and contact information.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="what-to-fix-first" className="space-y-4">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            What to fix first
          </h2>

          <p className="leading-relaxed">
            In many cases, small changes remove disproportionate amounts of uncertainty. The goal is
            not to optimize everything. The goal is to reduce the moments where an AI system must
            guess.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Definition",
                body: "Add a short, visible statement that answers what it is, who it is for, and what it does.",
              },
              {
                title: "Self-contained answers",
                body: "Ensure common questions have direct, extractable answers in one place.",
              },
              {
                title: "Commercial clarity",
                body: "Make pricing, access, and scope explicit so the AI has concrete facts to cite.",
              },
              {
                title: "Legitimacy and access",
                body: "Provide visible organizational context, contact information, and reliable access signals.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950"
              >
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </BlogPostLayout>
  );
}
