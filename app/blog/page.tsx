import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DefaultAnswer blog",
  description: "Updates and analyses on AI recommendation readiness.",
  openGraph: {
    title: "DefaultAnswer blog",
    description: "Articles about AI recommendation readiness and DefaultAnswer updates.",
    url: "https://defaultanswer.com/blog",
    siteName: "DefaultAnswer",
    type: "article",
  },
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          Analysis on AI recommendation readiness, retrievability, and the signals that affect citing decisions.
        </p>
        <div className="mt-10 space-y-4">
          <Link
            href="/blog/why-ai-recommendations-fail-even-when-you-rank-1"
            className="group block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900"
          >
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
              Why AI recommendations fail even when you rank #1
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              A breakdown of the missing signals that stop AI assistants from citing high-ranking pages.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
