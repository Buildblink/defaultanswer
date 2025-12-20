import { analyzeUrl } from "@/lib/defaultanswer/analyze";
import type { AnalysisStatus, BreakdownItem, FixPlanItem, ReasoningBullet } from "@/lib/defaultanswer/scoring";
import { CopyResultsButton, type CalibrationRow } from "./copy-results-button";
import { decideWhatToFixFirst } from "@/lib/defaultanswer/recommendations";
import { dedupeFixPlanByIntent } from "@/lib/defaultanswer/recommendations";

export const dynamic = "force-dynamic";

const URLS = [
  "https://shopify.com",
  "https://realwebwins.com",
  "https://ideabrowser.com",
  "https://example.com",
] as const;

export default async function CalibrationPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        <main className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold">Calibration</h1>
          <p className="mt-4 text-stone-600 dark:text-stone-400">
            Calibration page disabled in production.
          </p>
        </main>
      </div>
    );
  }

  const settled = await Promise.allSettled(
    URLS.map(async (u) => {
      const result = await analyzeUrl(u);
      return { input: u, result };
    })
  );

  const rows: CalibrationRow[] = settled.map((s) => {
    if (s.status === "rejected") {
      return {
        url: "(unknown)",
        score: null,
        readiness: "Not a Default Candidate",
        topFix: "",
        biggestGap: "",
        status: "FAILED",
        notes: "unexpected error",
      };
    }

    const { input, result } = s.value;
    const analysis = result.analysis;
    const analysisStatus = deriveCalibrationStatus(analysis);
    const readiness = classifyReadiness(analysis.score, analysis.reasoning);
    const decision = decideWhatToFixFirst({
      fixPlan: dedupeFixPlanByIntent(analysis.fixPlan || []),
      score: analysis.score,
      readinessLabel: readiness,
      extracted: {
        hasFAQ: analysis.extracted.hasFAQ,
        hasSchema: analysis.extracted.hasSchema,
        hasSchemaJsonLd: analysis.extracted.hasSchemaJsonLd,
        hasIndirectFAQ: analysis.extracted.hasIndirectFAQ,
        hasDirectAnswerBlock: analysis.extracted.hasDirectAnswerBlock,
        hasAbout: analysis.extracted.hasAbout,
        hasContactSignals: analysis.extracted.hasContactSignals,
        h2s: analysis.extracted.h2s,
        h3s: analysis.extracted.h3s,
      },
    });

    const statusLabel =
      analysisStatus === "blocked"
        ? "BLOCKED"
        : analysisStatus === "snapshot_incomplete"
        ? "SNAPSHOT_INCOMPLETE"
        : analysisStatus === "ok"
        ? "OK"
        : "FAILED";

    return {
      url: input,
      score: analysis.score >= 0 ? analysis.score : null,
      readiness,
      topFix: decision.kind === "topFix" ? decision.fix.action : "",
      biggestGap: biggestGapCategory(analysis.breakdown) || "",
      status: statusLabel,
      snapshotQuality: analysis.snapshotQuality,
      bytes: analysis.fetchDiagnostics?.bytes ?? null,
      notes:
        result.fallback && result.notes
          ? result.notes
          : analysisStatus === "snapshot_incomplete"
            ? "snapshot incomplete"
            : analysisStatus === "blocked"
              ? "fetch blocked"
              : decision.kind === "noCriticalFixes"
                ? "no critical fixes"
                : "ok",
    };
  });

  const sorted = [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Internal Calibration</h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Runs the current DefaultAnswer scoring against a fixed URL set. Best-effort: failures are expected.
            </p>
          </div>
          <CopyResultsButton rows={sorted} />
        </div>

        <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-900">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">URL</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Readiness</th>
                <th className="px-4 py-3 font-semibold">Top Fix</th>
                <th className="px-4 py-3 font-semibold">Biggest Gap</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Snapshot Quality</th>
                <th className="px-4 py-3 font-semibold">Bytes</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
              {sorted.map((r) => (
                <tr key={r.url}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-stone-700 dark:text-stone-200"
                    >
                      {r.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {r.score === null ? "—" : r.score}
                  </td>
                  <td className="px-4 py-3">{r.readiness}</td>
                  <td className="px-4 py-3 max-w-md">
                    <span className="line-clamp-2">{r.topFix || "—"}</span>
                  </td>
                  <td className="px-4 py-3">{r.biggestGap || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        r.status === "OK"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : r.status === "SNAPSHOT_INCOMPLETE"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.snapshotQuality || "—"}</td>
                  <td className="px-4 py-3 font-mono">
                    {typeof r.bytes === "number" ? r.bytes.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                    {r.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function classifyReadiness(score: number, reasoning?: ReasoningBullet[]): string {
  // Mirror V1.3 behavior (simplified): fallback or missing => Not a Default Candidate
  if (score < 0 || !reasoning || reasoning.length === 0) {
    return "Not a Default Candidate";
  }
  const negative = reasoning.filter((r) => r.impact === "negative").length;
  if (score >= 75 && negative <= 1) return "Strong Default Candidate";
  if (score < 50) return "Not a Default Candidate";
  return "Emerging Option";
}

function biggestGapCategory(breakdown: BreakdownItem[] | undefined): string | null {
  if (!breakdown || breakdown.length === 0) return null;
  const byCat: Record<string, { points: number; max: number }> = {};
  for (const item of breakdown) {
    const cat = item.category || "Other";
    if (!byCat[cat]) byCat[cat] = { points: 0, max: 0 };
    byCat[cat].points += item.points;
    byCat[cat].max += item.max;
  }
  const entries = Object.entries(byCat).filter(([, v]) => v.max > 0 && v.max !== 100); // ignore Error 100 bucket
  if (entries.length === 0) return null;
  entries.sort((a, b) => a[1].points / a[1].max - b[1].points / b[1].max);
  return entries[0]?.[0] ?? null;
}

function deriveCalibrationStatus(analysis: {
  analysisStatus?: AnalysisStatus;
  snapshotQuality?: string;
  fetchDiagnostics?: { ok?: boolean; errorType?: string };
  score: number;
}): AnalysisStatus {
  if (analysis.analysisStatus) return analysis.analysisStatus;
  if (analysis.snapshotQuality && analysis.snapshotQuality !== "ok") return "snapshot_incomplete";
  if (analysis.fetchDiagnostics?.ok === false && analysis.fetchDiagnostics.errorType === "blocked") {
    return "blocked";
  }
  if (analysis.score < 0) return "error";
  return "ok";
}

