import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";

type DefinitionItem = {
  term: string;
  definition: string;
};

type DefinitionsProps = {
  title: string;
  items: DefinitionItem[];
};

export function Definitions({ title, items }: DefinitionsProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <SectionTitle title={title} />
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950 md:p-8">
        <div className="space-y-4">
          {items.map((item, index) => (
            <p key={item.term} className={`text-sm leading-relaxed text-stone-600 dark:text-stone-300 ${index > 0 ? 'pt-4 border-t border-stone-200 dark:border-stone-800' : ''}`}>
              <strong className="font-semibold text-stone-900 dark:text-stone-50">{item.term}</strong> {item.definition}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
