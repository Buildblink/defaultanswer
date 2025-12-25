export default function AboutPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
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
    </div>
  );
}
