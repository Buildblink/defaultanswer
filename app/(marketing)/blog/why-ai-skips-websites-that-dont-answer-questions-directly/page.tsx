import Link from "next/link";
import Script from "next/script";
import { blogPosts } from "../posts";

const post = blogPosts.find(
  (item) => item.slug === "why-ai-skips-websites-that-dont-answer-questions-directly"
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
        id="ld-blogposting-answerability"
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
          Why AI skips websites that don't answer questions directly
        </h1>

        <div className="mx-auto mt-5 max-w-3xl space-y-6">
          <p className="text-base leading-relaxed text-stone-700 dark:text-stone-300">
            This article focuses on observable AI behavior when generating answers. It explains why websites with strong
            content are still skipped when AI systems cannot extract direct, self-contained answers from visible text.
            The evaluation follows the DefaultAnswer methodology.
          </p>
          <p className="text-base leading-relaxed text-stone-700 dark:text-stone-300">
            Companion:{" "}
            <Link
              href="/blog/why-ai-recommendations-fail-even-when-you-rank-1"
              className="underline hover:text-stone-900 dark:hover:text-stone-50"
            >
              Why AI recommendations fail even when you rank #1
            </Link>
            .
          </p>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">DEFAULTANSWER CONTEXT</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              DefaultAnswer is a diagnostic tool for AI recommendation readiness. It evaluates whether an AI assistant
              could confidently cite or recommend a site using observable, retrievable on-page signals. It does not
              measure rankings, traffic, or backlinks.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Core claim</div>
            <p className="mt-2 text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-50">
              AI assistants avoid sources that require assembling answers from multiple places or interpreting implied
              meaning. If an answer cannot be extracted cleanly from a single visible location, the source becomes risky
              to use.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Key idea</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              AI systems generate answers under constraint. They do not browse freely, explore deeply, or synthesize
              across long pages the way humans do. They prefer sources where answers already exist in extractable form —
              stated plainly and in one place. When answers must be inferred, stitched together, or guessed, the system
              moves on. This is distinct from{" "}
              <Link
                href="/blog/why-ai-recommendations-fail-even-when-you-rank-1"
                className="underline hover:text-stone-900 dark:hover:text-stone-50"
              >
                ranking ≠ recommending
              </Link>
              .
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-50">TL;DR</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              <li>AI assistants prefer direct, self-contained answers.</li>
              <li>Pages designed for exploration often reduce extractability.</li>
              <li>Implied answers increase uncertainty at answer time.</li>
              <li>FAQ-style clarity beats longform explanation.</li>
              <li>Recommendation-ready sites answer common questions explicitly.</li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Jump to</div>
            <ul className="mt-3 grid gap-2 text-sm text-stone-600 dark:text-stone-300 sm:grid-cols-2">
              {[
                ["#what-direct-answers-mean", 'What "direct answers" mean'],
                ["#why-exploration-hurts-extractability", "Why exploration hurts extractability"],
                ["#common-answerability-failures", "Common answerability failures"],
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
            <section id="what-direct-answers-mean" className="space-y-4">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                What "direct answers" mean
              </h2>

              <p className="leading-relaxed">A direct answer is text that:</p>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                <li>explicitly answers a common question</li>
                <li>is visible on the page</li>
                <li>does not depend on other sections</li>
                <li>can be quoted without interpretation</li>
              </ul>

              <p className="leading-relaxed">Examples of extractable questions:</p>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                <li>What is this?</li>
                <li>Who is it for?</li>
                <li>How does it work?</li>
                <li>What does it cost?</li>
                <li>Why would someone choose it?</li>
              </ul>

              <p className="leading-relaxed">
                If the answer only becomes clear after reading multiple sections, it is not direct.
              </p>
            </section>
          </div>

          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <section id="why-exploration-hurts-extractability" className="space-y-4">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                Why exploration hurts extractability
              </h2>

              <p className="leading-relaxed">Many websites are designed for human exploration.</p>
              <p className="leading-relaxed">They:</p>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                <li>long narrative sections</li>
                <li>progressive disclosure</li>
                <li>feature walkthroughs</li>
                <li>interactive elements</li>
              </ul>

              <p className="leading-relaxed">Humans can explore and assemble meaning.</p>
              <p className="leading-relaxed">AI systems cannot.</p>

              <p className="leading-relaxed">
                At the moment an answer must be generated, the system favors sources where answers are already
                assembled.
              </p>

              <p className="leading-relaxed">Exploration-first design often works against recommendation.</p>
            </section>
          </div>

          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <section id="common-answerability-failures" className="space-y-6">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                Common answerability failures
              </h2>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                    1. Answers are distributed across sections
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    If answering a question requires:
                  </p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    <li>combining multiple paragraphs</li>
                    <li>scrolling through the page</li>
                    <li>reading supporting context</li>
                  </ul>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    the source becomes harder to use.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    AI systems prefer answers that live in one place.
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                    2. Answers are implied, not stated
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Marketing language often replaces clarity.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">Statements like:</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    <li>“Built for modern teams”</li>
                    <li>“A better way to scale”</li>
                  </ul>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    do not answer concrete questions.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    AI systems favor literal answers they can reuse without reinterpretation.
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                    3. Interactive content hides answers
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">Content inside:</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    <li>accordions</li>
                    <li>tabs</li>
                    <li>carousels</li>
                    <li>hover states</li>
                  </ul>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    may not be reliably retrievable.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    If the system cannot fetch the answer directly, it will not use it.
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

              <p className="leading-relaxed">
                A website is{" "}
                <Link href="/methodology" className="underline hover:text-stone-900 dark:hover:text-stone-50">
                  recommendation-ready
                </Link>{" "}
                when an AI system can:
              </p>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                <li>extract answers to common questions directly</li>
                <li>reuse those answers without interpretation</li>
                <li>quote the site confidently inside an explanation</li>
              </ul>

              <p className="leading-relaxed">
                If the answer must be reconstructed, the site is often skipped.
              </p>
            </section>
          </div>

          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <section id="what-to-fix-first" className="space-y-4">
              <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                What to fix first
              </h2>

              <p className="leading-relaxed">If AI assistants hesitate to use your site, start here:</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Direct answers</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Add visible answers to common questions in plain language.
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Self-contained sections</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Ensure each answer stands on its own without relying on other parts of the page.
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Literal wording</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Replace implied positioning with declarative statements.
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Accessible content</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                    Avoid hiding key answers behind interactive elements.
                  </p>
                </div>
              </div>

              <p className="leading-relaxed">Small changes here often remove large amounts of uncertainty.</p>
            </section>
          </div>

          {/* CTA that matches site style */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                  Want the diagnosis for your site?
                </h3>
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
            <p className="leading-relaxed">
              Related:{" "}
              <Link
                href="/blog/why-ai-cannot-recommend-what-it-cannot-describe"
                className="underline hover:text-stone-900 dark:hover:text-stone-50"
              >
                Why AI cannot recommend what it cannot describe
              </Link>
              .
            </p>
            <p className="mt-6 leading-relaxed">AI recommendation is not about depth.</p>
            <p className="leading-relaxed">It is about extractability.</p>
            <p className="leading-relaxed">
              If an AI system cannot lift an answer cleanly from your site, it will choose another source.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
