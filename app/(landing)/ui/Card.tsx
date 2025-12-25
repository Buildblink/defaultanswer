import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950">
      {title ? (
        <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
          {title}
        </div>
      ) : null}
      <div className={`${title ? "mt-2 " : ""}text-sm leading-relaxed text-stone-600 dark:text-stone-300`}>
        {children}
      </div>
    </div>
  );
}
