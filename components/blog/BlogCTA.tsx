import Link from "next/link";

type BlogCTAProps = {
  title?: string;
  description?: string;
  linkText?: string;
  linkUrl?: string;
};

export function BlogCTA({
  title = "Want the diagnosis for your site?",
  description = "Run an analysis to see which missing signals create hesitation and what to fix first.",
  linkText = "Analyze",
  linkUrl = "/defaultanswer",
}: BlogCTAProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {description}
          </p>
        </div>
        <Link
          href={linkUrl}
          className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
        >
          {linkText}
        </Link>
      </div>
    </div>
  );
}
