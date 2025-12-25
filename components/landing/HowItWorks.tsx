import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { Pill } from "@/app/(landing)/ui/Pill";

type HowItWorksItem = {
  title: string;
  description: string;
  pills?: string[];
};

type HowItWorksProps = {
  title: string;
  subtitle: string;
  items: HowItWorksItem[];
};

export function HowItWorks({ title, subtitle, items }: HowItWorksProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950"
          >
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
              {item.title}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {item.description}
            </p>
            {item.pills?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.pills.map((pill) => (
                  <Pill key={pill}>{pill}</Pill>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
