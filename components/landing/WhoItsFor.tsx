import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { Card } from "@/app/(landing)/ui/Card";

type WhoItsForProps = {
  title: string;
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
};

export function WhoItsFor({
  title,
  leftTitle,
  leftItems,
  rightTitle,
  rightItems,
}: WhoItsForProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <SectionTitle title={title} />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card title={leftTitle}>
          <ul className="list-disc pl-5">
            {leftItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title={rightTitle}>
          <ul className="list-disc pl-5">
            {rightItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
