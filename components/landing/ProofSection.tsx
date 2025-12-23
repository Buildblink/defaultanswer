import Link from "next/link";
import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { Card } from "@/app/(landing)/ui/Card";

type ProofSectionProps = {
  title: string;
  body: string;
  bullets: string[];
  linkLabel: string;
  linkUrl: string;
};

export function ProofSection({ title, body, bullets, linkLabel, linkUrl }: ProofSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <SectionTitle title={title} subtitle={body} />
      <div className="mt-8">
        <Card title="Example report">
          <ul className="list-disc space-y-1 pl-5">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <div className="mt-4">
            <Link
              href={linkUrl}
              className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              {linkLabel}
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}
