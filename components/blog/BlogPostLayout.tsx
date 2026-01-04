import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BlogPostLayoutProps = {
  title: string;
  description: string;
  dateLabel: string;
  readingTimeMinutes: number;
  category: string;
  coreClaim?: string;
  tldr?: string[];
  children: ReactNode;
};

export default function BlogPostLayout({
  title,
  description,
  dateLabel,
  readingTimeMinutes,
  category,
  coreClaim,
  tldr,
  children,
}: BlogPostLayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-sm text-stone-600 dark:text-stone-300">
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span>{category}</span>
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <span>{dateLabel}</span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span>{readingTimeMinutes} min read</span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span>{category}</span>
        </div>

        <div className={cn("mx-auto mt-6 max-w-3xl space-y-6")}>
          {coreClaim ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Core claim
              </div>
              <p className="mt-2 text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-50">
                {coreClaim}
              </p>
            </div>
          ) : null}

          {Array.isArray(tldr) && tldr.length > 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
              <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                TL;DR
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {tldr.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-12 text-stone-700 dark:text-stone-300">
          {children}
        </div>
      </article>
    </div>
  );
}
