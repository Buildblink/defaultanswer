import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DefaultAnswer methodology",
  description:
    "How DefaultAnswer evaluates whether an AI system can confidently recommend and cite a website.",
  openGraph: {
    title: "DefaultAnswer methodology",
    description:
      "Deterministic checks for entity clarity, answerability, commercial clarity, trust, and retrievability.",
    url: "https://defaultanswer.com/methodology",
    siteName: "DefaultAnswer",
    type: "article",
  },
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Methodology</h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          DefaultAnswer measures AI recommendation readiness with deterministic checks across entity clarity,
          answerability, commercial clarity, trust, and retrievability. The same inputs always produce the
          same outputs so the process is auditable.
        </p>
        <div className="mt-8 space-y-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          <p>
            Paste the full methodology copy here. Use clear headings and short definitional sentences so an
            AI system can cite each concept without ambiguity.
          </p>
        </div>
      </section>
    </main>
  );
}
