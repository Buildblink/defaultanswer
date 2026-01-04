"use client";

export function ExpandCollapseAll({ targetId }: { targetId: string }) {
  const toggleAll = (open: boolean) => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLDetailsElement>("[data-report-collapsible=\"section\"]");
    nodes.forEach((node) => {
      node.open = open;
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => toggleAll(true)}
        className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-900"
      >
        Show details
      </button>
      <button
        type="button"
        onClick={() => toggleAll(false)}
        className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-900"
      >
        Hide details
      </button>
    </div>
  );
}
