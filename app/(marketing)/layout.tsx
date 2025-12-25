import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <MarketingHeader />
      {children}
      <footer className="border-t border-stone-200/80 py-10 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600 dark:text-stone-300">
            (c) {new Date().getFullYear()} DefaultAnswer
          </div>
          <div className="flex gap-4 text-sm">
            <Link
              href="/methodology"
              className="text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
            >
              Methodology
            </Link>
            <Link
              href="/blog"
              className="text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
            >
              Blog
            </Link>
            <Link
              href="/defaultanswer"
              className="text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
            >
              Analyze
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
