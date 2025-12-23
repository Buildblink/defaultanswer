"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/(landing)/ui/Card";
import { Pill } from "@/app/(landing)/ui/Pill";
import { computeScanDelta, type ScanDeltaInput } from "@/lib/report/deltas";
import { CompareScanModal } from "@/components/report/CompareScanModal";

type HistoryScan = ScanDeltaInput & {
  id?: string;
  created_at?: string | null;
  primary_blocker?: string | null;
};

type HistoryPanelProps = {
  isPro: boolean;
  message?: string;
  current?: HistoryScan | null;
  previous?: HistoryScan | null;
  recent?: HistoryScan[];
};

export function HistoryProPanel({ isPro, message, current, previous, recent }: HistoryPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [comparePair, setComparePair] = useState<{
    current: HistoryScan;
    previous: HistoryScan;
  } | null>(null);

  const deltaSummary = useMemo(() => {
    if (!current || !previous) return null;
    return computeScanDelta(current, previous);
  }, [current, previous]);

  const handleCompare = (curr: HistoryScan, prev: HistoryScan) => {
    setComparePair({ current: curr, previous: prev });
    setModalOpen(true);
  };

  return (
    <section className="mb-10">
      <Card>
        {isPro ? (
          <div className="space-y-4">
            {previous && current && deltaSummary ? (
              <div className="space-y-3 text-sm text-stone-700 dark:text-stone-300">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  {deltaSummary.summaryLine}
                </p>
                <div className="flex flex-wrap gap-2">
                  {deltaSummary.chips.map((chip) => (
                    <span
                      key={chip.label}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        chip.tone === "positive"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : chip.tone === "negative"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                          : "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200"
                      }`}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
                {deltaSummary.scoreDelta === 0 &&
                deltaSummary.coverageDelta === 0 &&
                !deltaSummary.readinessChanged &&
                deltaSummary.chips.length === 0 ? (
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    No measurable changes since last scan.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-stone-600 dark:text-stone-400">{message || "First scan saved."}</p>
            )}

            {recent && recent.length ? (
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Recent scans
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Score</th>
                        <th className="py-2 pr-4">Readiness</th>
                        <th className="py-2 pr-4">Coverage</th>
                        <th className="py-2 pr-4">Signals</th>
                        <th className="py-2 pr-4">Primary blocker</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.slice(0, 5).map((scan, idx) => {
                        const prev = recent[idx + 1];
                        const canCompare = Boolean(prev);
                        return (
                          <tr
                            key={scan.id || scan.created_at || scan.score}
                            className="border-b border-stone-100 dark:border-stone-900"
                          >
                            <td className="py-2 pr-4" title={scan.created_at || undefined}>
                              {formatScanDate(scan.created_at)}
                            </td>
                            <td className="py-2 pr-4">{scan.score}</td>
                            <td className="py-2 pr-4">{scan.readiness}</td>
                            <td className="py-2 pr-4">{scan.coverage_overall}</td>
                            <td className="py-2 pr-4">
                              <div className="flex flex-wrap gap-2">
                                <Pill>FAQ {scan.has_faq ? "yes" : "no"}</Pill>
                                <Pill>Schema {scan.has_schema ? "yes" : "no"}</Pill>
                                <Pill>Pricing {scan.has_pricing ? "yes" : "no"}</Pill>
                              </div>
                            </td>
                            <td className="py-2 pr-4">{scan.primary_blocker || "—"}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                onClick={() => (canCompare ? handleCompare(scan, prev!) : null)}
                                disabled={!canCompare}
                                className={`rounded-xl border px-3 py-1 text-xs font-medium transition ${
                                  canCompare
                                    ? "border-stone-200 bg-white text-stone-900 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
                                    : "border-stone-200 text-stone-400 dark:border-stone-800 dark:text-stone-600"
                                }`}
                              >
                                {canCompare ? "Compare" : "Need 2 scans"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
              Monitoring (Pro)
            </div>
            <ul className="list-disc list-inside text-sm text-stone-600 dark:text-stone-300">
              <li>Track score and coverage changes over time.</li>
              <li>See which signals improved or regressed.</li>
              <li>Get a running log of scans per URL.</li>
            </ul>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Unlock monitoring
            </Link>
          </div>
        )}
      </Card>

      {comparePair ? (
        <CompareScanModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          current={comparePair.current}
          previous={comparePair.previous}
        />
      ) : null}
    </section>
  );
}

function formatScanDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return `Yesterday ${formatTime(date)}`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
