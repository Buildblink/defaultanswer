import Link from "next/link";

type BottomCtaProps = {
  eyebrow: string;
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
};

export function BottomCta({ eyebrow, title, body, linkLabel, linkUrl }: BottomCtaProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              {eyebrow}
            </p>
            <p className="mt-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
              {title}
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              {body}
            </p>
          </div>
          <Link
            href={linkUrl}
            className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            {linkLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
