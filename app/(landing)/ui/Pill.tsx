import type { ReactNode } from "react";

type PillProps = {
  children: ReactNode;
};

export function Pill({ children }: PillProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
      {children}
    </span>
  );
}
