import Link from "next/link";
import Script from "next/script";
import { blogPosts } from "../posts";

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
  const published = post?.date ?? "";
  const updated = post?.updatedAt ?? published;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post?.title,
    description: post?.description,
    datePublished: published,
    dateModified: updated,
    author: {
      "@type": "Organization",
      name: "DefaultAnswer",
    },
    publisher: {
      "@type": "Organization",
      name: "DefaultAnswer",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    url: canonicalUrl,
    image: `${siteUrl}/og.png`,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "DefaultAnswer",
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <Script
        id="ld-blogposting-cannot-describe"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-sm text-stone-600 dark:text-stone-300">
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span>AI recommendations</span>
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Why AI cannot recommend what it cannot describe
        </h1>

        <div className="mx-auto mt-5 max-w-3xl space-y-6">
          <p className="text-base leading-relaxed text-stone-700 dark:text-stone-300">
            This article focuses on observable AI behavior, not proprietary model internals or speculative ranking
            factors. It follows the{" "}
            <Link href="/methodology" className="underline hover:text-stone-900 dark:hover:text-stone-50">
              methodology
            </Link>
            . It explains why many websites are skipped by AI assistants even when their content quality is high.
          </p>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Core claim</div>
            <p className="mt-2 text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-50">
              AI assistants cannot recommend a website unless they can describe it clearly, directly, and without
              interpretation.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Key idea</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              Search engines retrieve documents. AI assistants generate answers. If a website cannot be summarized,
              categorized, and justified using visible on-page text, an AI system will avoid using it as a source, even
              if it ranks well or appears authoritative.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-50">TL;DR</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              <li>AI systems prefer sources they can describe in one or two sentences.</li>
              <li>Ambiguous positioning forces interpretation, which increases risk.</li>
              <li>Sites are skipped when definitions are implied instead of stated.</li>
              <li>Being well written is not the same as being describable.</li>
              <li>Recommendation-ready sites make categorization explicit.</li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Jump to</div>
            <ul className="mt-3 grid gap-2 text-sm text-stone-600 dark:text-stone-300 sm:grid-cols-2">
              {[
                ["#clear-description-vs-implied-meaning", "Clear description vs implied meaning"],
                ["#how-ai-forms-a-description", "How AI forms a description"],
                ["#common-description-failures", "Common description failures"],
                ["#recommendation-ready-definition", "Recommendation-ready definition"],
                ["#what-to-fix-first", "What to fix first"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="block rounded-xl border border-stone-200 px-3 py-2 text-stone-700 transition hover:bg-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-900"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-12 text-stone-700 dark:text-stone-300">
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

          {/* CTA that matches site style */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Want the diagnosis for your site?</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  Run an analysis to see which missing signals create hesitation and what to fix first.
                </p>
              </div>
              <Link
                href="/defaultanswer"
                className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
              >
                Analyze
              </Link>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Closing note</div>
              <p className="leading-relaxed">
                AI assistants do not avoid websites because they are bad. They avoid websites because they are hard to
                describe safely.
              </p>
              <p className="leading-relaxed">
                If a site cannot be summarized without interpretation, it will not be recommended.
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
