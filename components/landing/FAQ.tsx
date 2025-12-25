import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { Card } from "@/app/(landing)/ui/Card";

type FAQItem = {
  question: string;
  answer: string[];
};

type FAQProps = {
  title: string;
  items: FAQItem[];
};

export function FAQ({ title, items }: FAQProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <SectionTitle title={title} />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.question} title={item.question}>
            <div className="space-y-2">
              {item.answer.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
