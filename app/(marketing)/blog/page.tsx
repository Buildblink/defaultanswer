import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";

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
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          Analysis on AI recommendation readiness, retrievability, and the signals that affect citing decisions.
        </p>
        <div className="mt-10 space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900"
            >
              {post.slug === "why-ai-recommendations-fail-even-when-you-rank-1" ? (
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Start here</div>
              ) : null}
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">{post.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {post.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="text-stone-300 dark:text-stone-700">•</span>
                <span>{post.category}</span>
                {post.tags.length ? (
                  <>
                    <span className="text-stone-300 dark:text-stone-700">•</span>
                    <span>{post.tags.join(", ")}</span>
                  </>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

