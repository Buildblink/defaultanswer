"use client";

import { useMemo } from "react";
import { computeScanDelta, type ScanDeltaInput } from "@/lib/report/deltas";
import { Pill } from "@/app/(landing)/ui/Pill";

type CompareScanModalProps = {
  open: boolean;
  onClose: () => void;
  current: ScanDeltaInput & { primary_blocker?: string | null; created_at?: string | null };
  previous: ScanDeltaInput & { primary_blocker?: string | null; created_at?: string | null };
};

export function CompareScanModal({ open, onClose, current, previous }: CompareScanModalProps) {
  const delta = useMemo(() => computeScanDelta(current, previous), [current, previous]);

  if (!open) return null;

  const blockerChange =
    (previous.primary_blocker || "").trim() !== (current.primary_blocker || "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-lg dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Scan comparison</h3>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              Score {formatDelta(delta.scoreDelta)}, Coverage {formatDelta(delta.coverageDelta)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-2 py-1 text-xs text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-900"
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Badge changes</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {delta.chips.length ? (
              delta.chips.map((chip) => (
                <Pill key={chip.label}>{chip.label}</Pill>
              ))
            ) : (
              <span className="text-sm text-stone-500 dark:text-stone-400">No badge changes.</span>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-stone-700 dark:text-stone-300">
          <div>
            Primary blocker:{" "}
            {blockerChange
              ? `${previous.primary_blocker || "—"} → ${current.primary_blocker || "—"}`
              : current.primary_blocker || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDelta(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}
