import Link from "next/link";
import { HeroForm } from "./HeroForm";

type HeroIntro = {
  label?: string;
  description: string;
  note?: string;
};

type HeroProps = {
  mode: "home" | "analyze";
  title: string;
  lead?: string;
  subtitle: string;
  intro?: HeroIntro;
  ctaLabel: string;
  ctaLoadingLabel?: string;
  showCompareLink?: boolean;
  helperText?: string;
  primaryHref?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  formEyebrow?: string;
};

export function Hero({
  mode,
  title,
  lead,
  subtitle,
  intro,
  ctaLabel,
  ctaLoadingLabel,
  showCompareLink,
  helperText,
  primaryHref,
  secondaryHref,
  secondaryLabel,
  formEyebrow,
}: HeroProps) {
  return (
    <section id="top" className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:pb-20 md:pt-20">
      <div className="space-y-6">
        {intro ? (
          <div className="space-y-2">
            {intro.label ? (
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {intro.label}
              </div>
            ) : null}
            <p className="text-base leading-relaxed text-stone-700 dark:text-stone-300">
              {intro.description}
            </p>
            {intro.note ? (
              <p className="text-sm text-stone-600 dark:text-stone-300">{intro.note}</p>
            ) : null}
          </div>
        ) : null}
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {title}
        </h1>
        {lead ? (
          <p className="text-base leading-relaxed text-stone-700 dark:text-stone-300">
            {lead}
          </p>
        ) : null}
        <p className="max-w-3xl text-lg leading-relaxed text-stone-700 dark:text-stone-300">
          {subtitle}
        </p>

        {mode === "analyze" ? (
          <HeroForm
            ctaLabel={ctaLabel}
            ctaLoadingLabel={ctaLoadingLabel}
            helperText={helperText}
            showCompareLink={showCompareLink}
            eyebrowLabel={formEyebrow}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref || "/defaultanswer"}
                className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                {ctaLabel}
              </Link>
              <Link
                href={secondaryHref || "/methodology"}
                className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
              >
                {secondaryLabel || "Read methodology"}
              </Link>
            </div>
            {helperText ? (
              <p className="max-w-2xl text-sm text-stone-600 dark:text-stone-300">
                {helperText}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
