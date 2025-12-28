import Link from "next/link";
import { blogPosts } from "../posts";
import { BlogPostLayout } from "@/components/blog";

const post = blogPosts.find(
  (item) => item.slug === "why-ai-cannot-justify-citing-websites-it-doesnt-trust"
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
          This article focuses on observable AI behavior when selecting sources to cite. It explains
          why AI assistants avoid websites that lack visible legitimacy and access signals, even when
          the content itself appears correct. The evaluation follows the{" "}
          <Link
            href="/methodology"
            className="underline hover:text-stone-900 dark:hover:text-stone-50"
          >
            methodology
          </Link>
          .
        </p>
      }
      coreClaim="AI assistants avoid citing sources they cannot justify as legitimate and accessible."
      keyIdea={
        <>
          AI systems do not just look for correct answers. They look for answers they can defend. If
          an AI assistant cannot explain why a source is trustworthy, reachable, and appropriate to
          cite, it will choose another source that is easier to justify, even if both contain similar
          information.
        </>
      }
      tldr={[
        "AI assistants must justify the sources they cite.",
        "Correct information is not enough without visible legitimacy.",
        "Missing ownership, contact, or access signals increase risk.",
        "Trust is inferred from structure, not reputation claims.",
        "Recommendation-ready sites make legitimacy explicit.",
      ]}
      jumpNavItems={[
        { href: "#what-trust-means-for-ai-systems", label: 'What "trust" means for AI systems' },
        { href: "#how-ai-justifies-citing-a-source", label: "How AI justifies citing a source" },
        { href: "#common-legitimacy-failures", label: "Common legitimacy failures" },
        { href: "#recommendation-ready-definition", label: "Recommendation-ready definition" },
        { href: "#what-to-fix-first", label: "What to fix first" },
      ]}
      closingNote={
        <>
          <p className="leading-relaxed">
            AI assistants do not avoid websites because they are wrong.
          </p>
          <p className="leading-relaxed">
            They avoid websites because they are hard to justify safely.
          </p>
        </>
      }
    >
      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="what-trust-means-for-ai-systems" className="space-y-4">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            What "trust" means for AI systems
          </h2>

          <p className="leading-relaxed">
            For AI assistants, trust is not reputation in the human sense.
          </p>
          <p className="leading-relaxed">It is not:</p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>brand recognition</li>
            <li>popularity</li>
            <li>testimonials</li>
            <li>authority claims</li>
          </ul>

          <p className="leading-relaxed">
            Trust is inferred from visible, verifiable signals that allow an AI system to justify
            using the source inside an answer.
          </p>
          <p className="leading-relaxed">
            If those signals are missing, the source becomes risky to cite.
          </p>
        </section>
      </div>

      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="how-ai-justifies-citing-a-source" className="space-y-4">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            How AI justifies citing a source
          </h2>

          <p className="leading-relaxed">
            When an AI assistant includes a source, it implicitly needs to answer:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Who is responsible for this site?</li>
            <li>Is it appropriate to cite this as a reference?</li>
            <li>Can I explain where this information comes from?</li>
            <li>Can the user verify or access it?</li>
          </ul>

          <p className="leading-relaxed">
            These questions must be answerable using retrievable, on-page information.
          </p>
          <p className="leading-relaxed">
            If justification requires guessing, the source is skipped.
          </p>
          <p className="leading-relaxed">
            Missing trust signals often coincide with pages that{" "}
            <Link
              href="/blog/why-ai-skips-websites-that-dont-answer-questions-directly"
              className="underline hover:text-stone-900 dark:hover:text-stone-50"
            >
              don't answer questions directly
            </Link>
            .
          </p>
        </section>
      </div>

      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="common-legitimacy-failures" className="space-y-6">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Common legitimacy failures
          </h2>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                1. No clear ownership or organizational context
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                The site does not state:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                <li>who operates it</li>
                <li>what entity it represents</li>
                <li>how responsibility is defined</li>
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                Anonymous or vague ownership reduces citation confidence.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                2. Missing or weak contact information
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                If there is no clear way to:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                <li>contact the organization</li>
                <li>identify accountability</li>
                <li>verify presence</li>
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                AI systems hesitate to treat the site as a reliable reference.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                3. Access instability or blocking
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                Sources that:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                <li>block crawlers</li>
                <li>return inconsistent status codes</li>
                <li>rely on heavy client-side rendering</li>
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                are harder to retrieve reliably and therefore harder to justify citing.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
                4. Claims without grounding
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                Statements that assert authority or accuracy without visible grounding increase risk.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                AI systems prefer sources where legitimacy is shown, not claimed.
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
            <li>identify who is responsible for the content</li>
            <li>verify organizational or ownership context</li>
            <li>access pages reliably at fetch time</li>
            <li>justify citing the source without speculation</li>
          </ul>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Checklist
            </div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              <li>Clear About or Company information</li>
              <li>Visible ownership or organizational context</li>
              <li>Accessible contact information</li>
              <li>Stable, retrievable pages</li>
              <li>No reliance on implied legitimacy</li>
            </ul>
          </div>
        </section>
      </div>

      <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
        <section id="what-to-fix-first" className="space-y-4">
          <h2 className="scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            What to fix first
          </h2>

          <p className="leading-relaxed">If AI assistants hesitate to cite your site, start here:</p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Add clear ownership or company context</li>
            <li>Make contact and accountability visible</li>
            <li>Ensure pages are reliably accessible</li>
            <li>Remove authority claims without grounding</li>
            <li>Treat legitimacy as a visible signal, not a reputation</li>
          </ul>

          <p className="leading-relaxed">Trust reduces the cost of justification.</p>
        </section>
      </div>
    </BlogPostLayout>
  );
}
