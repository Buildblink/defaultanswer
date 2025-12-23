import Link from "next/link";
import type { ReactNode } from "react";

type ReportLayoutProps = {
  children: ReactNode;
};

export function ReportLayout({ children }: ReportLayoutProps) {
  const analyzeClassName =
    "rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900";

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur dark:border-stone-800 dark:bg-stone-950/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            DefaultAnswer
          </Link>
          <nav className="flex items-center gap-4 text-sm text-stone-600 dark:text-stone-300">
            <Link href="/methodology" className="hover:text-stone-900 dark:hover:text-stone-50">
              Methodology
            </Link>
            <Link href="/blog" className="hover:text-stone-900 dark:hover:text-stone-50">
              Blog
            </Link>
            <Link href="/about" className="hover:text-stone-900 dark:hover:text-stone-50">
              About
            </Link>
            <Link href="/contact" className="hover:text-stone-900 dark:hover:text-stone-50">
              Contact
            </Link>
            <Link href="/defaultanswer" className={analyzeClassName}>
              Analyze
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>

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
