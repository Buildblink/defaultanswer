import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
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
            <Link
              href="/defaultanswer"
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Analyze
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">About</h1>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          <p>
            DefaultAnswer is a diagnostic tool for AI recommendation readiness. It evaluates whether an AI assistant
            could confidently recommend a website as the default answer to a user question.
          </p>
          <p>
            It uses observable, retrievable on-page signals, not rankings or backlinks. Reports are deterministic and
            comparable over time.
          </p>
          <p>This makes findings auditable and changes easier to track.</p>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Accountability</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <li>DefaultAnswer is operated by a small team.</li>
            <li>We publish a clear methodology and keep definitions stable.</li>
            <li>If something is wrong, you can reach us.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
