import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { Card } from "@/app/(landing)/ui/Card";

type ReportExcerpt = {
  scoreLabel: string;
  score: string;
  readinessLabel: string;
  readinessValue: string;
  gaps: string[];
  quickWins: string[];
  changeNote: string;
};

type SideCard = {
  title: string;
  body: string;
};

type SampleReportPreviewProps = {
  title: string;
  subtitle: string;
  report: ReportExcerpt;
  sideCards: SideCard[];
};

export function SampleReportPreview({
  title,
  subtitle,
  report,
  sideCards,
}: SampleReportPreviewProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <SectionTitle title={title} subtitle={subtitle} />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Report excerpt
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-800 dark:text-stone-100">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-50">
                {report.scoreLabel}:
              </span>{" "}
              {report.score}
            </div>
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-50">
                {report.readinessLabel}:
              </span>{" "}
              {report.readinessValue}
            </div>
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-50">Biggest gaps</div>
              <ul className="mt-1 list-disc pl-5">
                {report.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-50">Quick wins</div>
              <ul className="mt-1 list-disc pl-5">
                {report.quickWins.map((win) => (
                  <li key={win}>{win}</li>
                ))}
              </ul>
            </div>
            <div className="text-stone-600 dark:text-stone-300">{report.changeNote}</div>
          </div>
        </div>

        <div className="grid gap-4">
          {sideCards.map((card) => (
            <Card key={card.title} title={card.title}>
              {card.body}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
