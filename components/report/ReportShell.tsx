"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  id: string;
  label: string;
  visible?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type SummaryItem = {
  label: string;
  value: string;
  title?: string;
};

type ReportShellProps = {
  summary: {
    domain: SummaryItem;
    score: SummaryItem;
    readiness: SummaryItem;
    blocker: SummaryItem;
  };
  actions: ReactNode;
  navItems: NavItem[];
  navGroups?: NavGroup[];
  children: ReactNode;
};

export function ReportShell({ summary, actions, navItems, navGroups, children }: ReportShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const filteredNav = useMemo(() => navItems.filter((item) => item.visible !== false), [navItems]);
  const filteredGroups = useMemo(() => {
    if (!navGroups || navGroups.length === 0) return [];
    return navGroups
      .map((group) => ({
        label: group.label,
        items: group.items.filter((item) => item.visible !== false),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups]);

  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 520);
    update();
    window.addEventListener("scroll", update);
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="relative grid gap-6 lg:grid-cols-[240px_1fr] overflow-x-hidden">
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Sections</div>
          <nav className="space-y-4 text-sm">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block rounded-lg px-2 py-1 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-stone-50"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              filteredNav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-2 py-1 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-stone-50"
                >
                  {item.label}
                </a>
              ))
            )}
          </nav>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-900"
          >
            {navOpen ? "Close sections" : "Sections"}
          </button>
          {navOpen ? (
            <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <nav className="grid gap-4 text-sm">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                        {group.label}
                      </div>
                      <div className="grid gap-2">
                        {group.items.map((item) => (
                          <a
                            key={item.id}
                            href={`#${item.id}`}
                            onClick={() => setNavOpen(false)}
                            className="rounded-lg px-2 py-2 text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-900"
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  filteredNav.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => setNavOpen(false)}
                      className="rounded-lg px-2 py-2 text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-900"
                    >
                      {item.label}
                    </a>
                  ))
                )}
              </nav>
            </div>
          ) : null}
        </div>

        <div className="sticky top-20 z-20 rounded-2xl border border-stone-200/80 bg-stone-50/90 p-4 shadow-sm backdrop-blur dark:border-stone-800/80 dark:bg-stone-950/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryBlock item={summary.domain} />
              <SummaryBlock item={summary.score} />
              <SummaryBlock item={summary.readiness} />
              <SummaryBlock item={summary.blocker} />
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
        </div>

        <div>{children}</div>
      </div>

      {showTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-30 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-lg transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-900 print:hidden"
        >
          Back to top
        </button>
      ) : null}
    </div>
  );
}

function SummaryBlock({ item }: { item: SummaryItem }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{item.label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-stone-900 dark:text-stone-100" title={item.title}>
        {item.value}
      </div>
    </div>
  );
}
