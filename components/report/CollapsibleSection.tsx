import type { ReactNode } from "react";
import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";

type CollapsibleSectionProps = {
  id?: string;
  title: string;
  subtitle?: string;
  badgeRow?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({
  id,
  title,
  subtitle,
  badgeRow,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-28">
      <details
        className="group rounded-2xl border border-stone-200 bg-white/75 px-5 py-4 shadow-sm open:bg-white dark:border-stone-800 dark:bg-stone-950/70 dark:open:bg-stone-950"
        open={defaultOpen}
        data-report-collapsible="section"
      >
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <SectionTitle title={title} subtitle={subtitle} />
              {badgeRow ? <div className="flex flex-wrap gap-2">{badgeRow}</div> : null}
            </div>
            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition group-open:rotate-180 dark:border-stone-800">
              <span className="text-base font-semibold">v</span>
            </span>
          </div>
        </summary>
        <div className="mt-6">{children}</div>
      </details>
    </section>
  );
}
