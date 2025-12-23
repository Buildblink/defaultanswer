type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <div className="space-y-2">
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {eyebrow}
        </div>
      ) : null}
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 md:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-base leading-relaxed text-stone-600 dark:text-stone-300">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
