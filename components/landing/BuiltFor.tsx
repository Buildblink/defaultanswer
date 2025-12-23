import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { Card } from "@/app/(landing)/ui/Card";

type BuiltForCard = {
  title: string;
  body: string;
};

type BuiltForProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  cards: BuiltForCard[];
  note?: string;
};

export function BuiltFor({ eyebrow, title, subtitle, cards, note }: BuiltForProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <SectionTitle eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} title={card.title}>
            {card.body}
          </Card>
        ))}
      </div>
      {note ? (
        <p className="mt-6 text-base font-medium text-stone-900 dark:text-stone-50">
          {note}
        </p>
      ) : null}
    </section>
  );
}
