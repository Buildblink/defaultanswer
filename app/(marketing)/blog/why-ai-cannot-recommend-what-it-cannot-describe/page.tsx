import Link from "next/link";
import { blogPosts } from "../posts";
import { BlogPostLayout } from "@/components/blog";

const post = blogPosts.find(
  (item) => item.slug === "why-ai-cannot-recommend-what-it-cannot-describe"
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
          This article focuses on observable AI behavior, not proprietary model internals or
          speculative ranking factors. It follows the{" "}
          <Link
            href="/methodology"
            className="underline hover:text-stone-900 dark:hover:text-stone-50"
          >
            methodology
          </Link>
          . It explains why many websites are skipped by AI assistants even when their content
          quality is high.
        </p>
      }
      coreClaim="AI assistants cannot recommend a website unless they can describe it clearly, directly, and without interpretation."
      keyIdea={
        <>
          Search engines retrieve documents. AI assistants generate answers. If a website cannot be
          summarized, categorized, and justified using visible on-page text, an AI system will
          avoid using it as a source, even if it ranks well or appears authoritative.
        </>
      }
      tldr={[
        "AI systems prefer sources they can describe in one or two sentences.",
        "Ambiguous positioning forces interpretation, which increases risk.",
        "Sites are skipped when definitions are implied instead of stated.",
        "Being well written is not the same as being describable.",
        "Recommendation-ready sites make categorization explicit.",
      ]}
      jumpNavItems={[
        { href: "#clear-description-vs-implied-meaning", label: "Clear description vs implied meaning" },
        { href: "#how-ai-forms-a-description", label: "How AI forms a description" },
        { href: "#common-description-failures", label: "Common description failures" },
        { href: "#recommendation-ready-definition", label: "Recommendation-ready definition" },
        { href: "#what-to-fix-first", label: "What to fix first" },
      ]}
      closingNote={
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Closing note
          </div>
          <p className="leading-relaxed">
            AI assistants do not avoid websites because they are bad. They avoid websites because
            they are hard to describe safely.
          </p>
          <p className="leading-relaxed">
            If a site cannot be summarized without interpretation, it will not be recommended.
          </p>
        </div>
      }
    >
          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <section id="clear-description-vs-implied-meaning" className="space-y-4">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                Clear description vs implied meaning
              </h2>

              <p className="leading-relaxed">Many websites assume their purpose is obvious.</p>

              <p className="leading-relaxed">They rely on:</p>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                <li>feature lists</li>
                <li>benefit statements</li>
                <li>brand language</li>
                <li>marketing headlines</li>
              </ul>

              <p className="leading-relaxed">Humans can infer meaning from this.</p>
              <p className="leading-relaxed">
                AI systems cannot rely on inference at the moment an answer must be formed.
              </p>
              <p className="leading-relaxed">
                For a related explanation of{" "}
                <Link
                  href="/blog/why-ai-recommendations-fail-even-when-you-rank-1"
                  className="underline hover:text-stone-900 dark:hover:text-stone-50"
                >
                  rankings ≠ recommending
                </Link>
                , see the companion article.
              </p>

              <p className="leading-relaxed">
                If the site never states what it is, who it is for, and what it offers in plain language, the
                description step fails.
              </p>
            </section>
          </div>

          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <section id="how-ai-forms-a-description" className="space-y-4">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                How AI forms a description
              </h2>

              <p className="leading-relaxed">When an AI assistant considers a source, it implicitly asks:</p>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                <li>What is this site?</li>
                <li>What category does it belong to?</li>
                <li>What problem does it solve?</li>
                <li>Who is it meant for?</li>
              </ul>

              <p className="leading-relaxed">These questions must be answerable using visible, self-contained text.</p>

              <p className="leading-relaxed">If the answers require:</p>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                <li>combining multiple sections</li>
                <li>interpreting brand language</li>
                <li>guessing intent</li>
              </ul>

              <p className="leading-relaxed">the source becomes risky to use.</p>
            </section>
          </div>

          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <section id="common-description-failures" className="space-y-6">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                Common description failures
              </h2>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                    1. The site explains what it does, but not what it is
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    "We help teams unlock better insights..."
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    This describes an activity, not an entity.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    AI systems need declarative statements:
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    <li>This is a diagnostic tool</li>
                    <li>This is a SaaS platform</li>
                    <li>This is an advisory service</li>
                  </ul>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Without that, categorization fails.
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                    2. The category is implied, not stated
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Some sites avoid naming their category to appear unique.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    This creates uncertainty.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    If an AI system cannot confidently place the site into a known category, it will choose a different
                    source that it can classify.
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                    3. The audience is never named
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Statements like:
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    <li>"Built for modern teams"</li>
                    <li>"Designed for growing businesses"</li>
                  </ul>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">are vague.</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    AI systems prefer explicit audience definitions:
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    <li>SaaS founders</li>
                    <li>marketing teams</li>
                    <li>agencies</li>
                    <li>developers</li>
                  </ul>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Ambiguity reduces recommendation confidence.
                  </p>
                </div>
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
                <li>Describe what it is in one sentence</li>
                <li>Identify who it is for without guessing</li>
                <li>Explain what it offers using visible text</li>
                <li>Categorize it consistently across scans</li>
              </ul>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
                <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Checklist</div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  <li>A clear declarative statement of what the site is</li>
                  <li>Explicit category naming</li>
                  <li>Named target audience</li>
                  <li>Plain-language description of the offering</li>
                  <li>No reliance on implied meaning</li>
                </ul>
              </div>
            </section>
          </div>

          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <section id="what-to-fix-first" className="space-y-4">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                What to fix first
              </h2>

              <p className="leading-relaxed">If AI systems struggle to recommend your site, start here:</p>

              <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
                <li>Add a one-sentence definition near the top of the homepage</li>
                <li>Explicitly state the category you belong to</li>
                <li>Name the audience you serve</li>
                <li>Remove marketing language that replaces definitions</li>
                <li>Ensure the same description appears consistently across pages</li>
              </ol>

              <p className="leading-relaxed">Clarity beats creativity at the moment an answer is generated.</p>
            </section>
          </div>

    </BlogPostLayout>
  );
}
