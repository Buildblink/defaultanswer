"use client";

import { useEffect, useState } from "react";
import { Card } from "@/app/(landing)/ui/Card";
import { Pill } from "@/app/(landing)/ui/Pill";
import {
  aggregateColdSummaryRuns,
  analyzeColdSummary,
  buildColdFixPlaybook,
  pickRepresentativeRun,
  type ColdSummaryMode,
  type ColdPlaybookItem,
  type ColdSummaryResult,
  type ColdSummaryMultiRun,
  type ColdSummaryExistingSignals,
  type ColdSummarySnapshot,
} from "@/lib/defaultanswer/cold-summary";
import {
  readColdSummaryFromStorage,
  writeColdSummaryMulti,
  writeColdSummarySingle,
} from "@/app/(reports)/defaultanswer/report/[reportId]/cold-summary-storage";

type ColdSummarySectionProps = {
  reportId: string;
  evaluatedUrl: string;
  model: string;
  snapshot?: ColdSummarySnapshot;
  existingSignals?: ColdSummaryExistingSignals;
  aiEnabled: boolean;
};

export function ColdSummarySection({
  reportId,
  evaluatedUrl,
  model,
  snapshot,
  existingSignals,
  aiEnabled,
}: ColdSummarySectionProps) {
  const [mode, setMode] = useState<ColdSummaryMode>("url_only");
  const [singleRun, setSingleRun] = useState<ColdSummaryResult | null>(null);
  const [multiRun, setMultiRun] = useState<ColdSummaryMultiRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readColdSummaryFromStorage(reportId);
    const modeStored =
      stored?.byMode?.[mode] ||
      (mode === "url_only" && (stored?.singleRun || stored?.multiRun)
        ? { singleRun: stored?.singleRun, multiRun: stored?.multiRun }
        : undefined);
    if (modeStored?.singleRun) {
      const rawOutput = modeStored.singleRun.rawOutput || modeStored.singleRun.response || "";
      const analysis = analyzeColdSummary(rawOutput, mode);
      setSingleRun({
        ...modeStored.singleRun,
        rawOutput,
        response: modeStored.singleRun.response || rawOutput,
        analysis,
      });
    } else {
      setSingleRun(null);
    }
    if (modeStored?.multiRun) {
      const normalizedResults = modeStored.multiRun.results.map((run) => ({
        ...run,
        analysis: analyzeColdSummary(run.rawText, mode),
      }));
      setMultiRun({
        ...modeStored.multiRun,
        results: normalizedResults,
        aggregate: aggregateColdSummaryRuns(normalizedResults),
      });
    } else {
      setMultiRun(null);
    }
  }, [reportId, mode]);

  const runTest = async (runs: number) => {
    if (!evaluatedUrl) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/defaultanswer/cold-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: evaluatedUrl,
          model,
          runs,
          mode,
          snapshot: mode === "snapshot" ? snapshot : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Cold summary test failed.");
        return;
      }
      if (data.multiRun) {
        setMultiRun(data.multiRun as ColdSummaryMultiRun);
        writeColdSummaryMulti(reportId, mode, data.multiRun as ColdSummaryMultiRun);
      } else if (data.result) {
        const rawOutput = data.result.rawOutput || data.result.response || "";
        const normalized: ColdSummaryResult = {
          ...data.result,
          rawOutput,
          response: data.result.response || rawOutput,
          analysis: analyzeColdSummary(rawOutput, mode),
        };
        setSingleRun(normalized);
        writeColdSummarySingle(reportId, mode, normalized);
      } else {
        setError("Cold summary test failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cold summary test failed.");
    } finally {
      setLoading(false);
    }
  };

  const multiIsLatest = multiRun
    ? !singleRun || new Date(multiRun.createdAt).getTime() >= new Date(singleRun.createdAt).getTime()
    : false;
  const representativeRun = multiIsLatest && multiRun ? pickRepresentativeRun(multiRun.results, multiRun.aggregate) : null;
  const latestAnalysis = representativeRun ? representativeRun.analysis : singleRun?.analysis;
  const latestOutput = representativeRun
    ? representativeRun.rawText
    : singleRun?.response || singleRun?.rawOutput || "";
  const verdictLabel = latestAnalysis?.verdictLabel || "Unclear";
  const isRefusal = latestAnalysis?.failureMode === "refusal";
  const isNoRetrievalUrlOnly = latestAnalysis?.failureMode === "no_retrieval_url_only";
  const verdictClass =
    verdictLabel === "Clearly"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : verdictLabel === "Partial"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
  const verdictText = isNoRetrievalUrlOnly
    ? "No retrieval (URL-only)"
    : isRefusal
    ? "Cold failure: refusal / no retrieval"
    : verdictLabel;
  const consistencyClass =
    multiRun?.aggregate.consistencyLabel === "Stable"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : multiRun?.aggregate.consistencyLabel === "Mixed"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
  const scoreLabel = latestAnalysis ? `${latestAnalysis.clarityScore}/5` : "Not run";
  const showPlaybook = latestAnalysis ? latestAnalysis.verdictLabel !== "Clearly" : false;
  const playbookItems = latestAnalysis
    ? buildColdFixPlaybook(latestAnalysis, { mode, existingSignals })
    : [];
  const recommendedItems = playbookItems.filter((item) => item.status === "recommend");
  const presentItems = playbookItems.filter((item) => item.status === "already_present");
  const helperLine =
    mode === "snapshot"
      ? "This test summarizes your site from the fetched snapshot (title/H1/excerpt)."
      : "This test uses only the URL string. Models cannot fetch your page.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        <button
          type="button"
          onClick={() => setMode("url_only")}
          className={`rounded-full border px-3 py-1 transition ${
            mode === "url_only"
              ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-stone-900"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300 dark:hover:border-stone-700"
          }`}
        >
          URL-only (zero-context)
        </button>
        <button
          type="button"
          onClick={() => setMode("snapshot")}
          className={`rounded-full border px-3 py-1 transition ${
            mode === "snapshot"
              ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-stone-900"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300 dark:hover:border-stone-700"
          }`}
        >
          Snapshot summary (from your page content)
        </button>
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">{helperLine}</p>
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => runTest(1)}
          disabled={loading || !evaluatedUrl || !aiEnabled}
          className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
        >
          {loading ? "Running..." : "Run cold AI summary test"}
        </button>
        <button
          type="button"
          onClick={() => runTest(3)}
          disabled={loading || !evaluatedUrl || !aiEnabled}
          className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-900"
        >
          Run 3x (consistency check)
        </button>
        {!aiEnabled ? (
          <span className="text-xs text-stone-500 dark:text-stone-400">
            AI summary isn't available on this deployment.
          </span>
        ) : null}
        {latestAnalysis ? (
          <Pill>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${verdictClass}`}>
              {verdictText}
            </span>
            <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">
              {isRefusal || isNoRetrievalUrlOnly ? "1/5" : scoreLabel}
            </span>
          </Pill>
        ) : null}
        {error ? (
          <span className="max-w-full break-words whitespace-pre-wrap text-xs text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : null}
      </div>

      {latestAnalysis ? (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span>Prompt: {(multiIsLatest ? multiRun?.promptVersion : singleRun?.promptVersion) || "unknown"}</span>
              <span>-</span>
              <span>Model: {(multiIsLatest ? multiRun?.model : singleRun?.model) || "unknown"}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${verdictClass}`}>
                {isRefusal || isNoRetrievalUrlOnly ? "Unclear" : verdictLabel}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400">Clarity {scoreLabel}</span>
            </div>
            {isNoRetrievalUrlOnly ? (
              <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                URL-only mode returned no retrieval. This is expected when models cannot access external websites.
              </p>
            ) : null}
            {isRefusal ? (
              <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                Cold failure: refusal / no retrieval. The model could not infer what your site is from the provided snapshot signals.
              </p>
            ) : null}
          </Card>

          {multiIsLatest && multiRun ? (
            <Card>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${consistencyClass}`}>
                  {multiRun.aggregate.consistencyLabel}
                </span>
                <span>Refusals: {multiRun.aggregate.refusalsCount}</span>
                <span>Clarity avg: {multiRun.aggregate.clarityAvg}/5</span>
                <span>Unknown avg: {multiRun.aggregate.unknownAvg}</span>
              </div>
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{multiRun.aggregate.note}</p>
            </Card>
          ) : null}

          <Card>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Extracted signals
            </div>
            <div className="mt-3 grid gap-2 text-sm text-stone-700 dark:text-stone-300 sm:grid-cols-2">
              <SignalRow label="Explicit category" value={latestAnalysis.hasCategory} match={latestAnalysis.signals.categoryMatch} />
              <SignalRow label="Audience clarity" value={latestAnalysis.hasAudience} match={latestAnalysis.signals.audienceMatch} />
              <SignalRow label="Offering detected" value={latestAnalysis.hasOffering} match={latestAnalysis.signals.offeringMatch} />
              <SignalRow label="Hedging language" value={latestAnalysis.hasHedging} match={latestAnalysis.signals.hedgingMatches.join(", ")} />
            </div>
            <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
              AI assistants prefer sources they can confidently summarize in one pass. If a model cannot infer your category and offering cold, it is unlikely to recommend or cite you.
            </p>
          </Card>

          {showPlaybook && (recommendedItems.length > 0 || presentItems.length > 0) ? (
            <Card>
              <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                Fix the cold failure (what to change on the page)
              </div>
              {latestAnalysis.failureMode === "refusal" ? (
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  Model refused / cannot retrieve the page. Treat this as a cold visibility failure.
                </p>
              ) : null}
              {recommendedItems.length > 0 ? (
                <div className="mt-4 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Recommended changes
                  </div>
                  {recommendedItems.map((item) => (
                    <PlaybookRow key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
              {presentItems.length > 0 ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Already present ({presentItems.length})
                  </summary>
                  <div className="mt-3 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                    {presentItems.map((item) => (
                      <PlaybookRow key={item.id} item={item} />
                    ))}
                  </div>
                </details>
              ) : null}
            </Card>
          ) : null}

          {multiIsLatest && multiRun ? (
            <div className="space-y-3">
              {multiRun.results.map((run, index) => (
                <Card key={`${index}-${run.analysis.clarityScore}`}>
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Run #{index + 1} - {run.analysis.verdictLabel} ({run.analysis.clarityScore}/5)
                    </summary>
                    <pre className="mt-3 max-w-full whitespace-pre-wrap break-words rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{run.rawText}
                    </pre>
                  </details>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  View full response
                </summary>
                <pre className="mt-3 max-w-full whitespace-pre-wrap break-words rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{latestOutput}
                </pre>
              </details>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {mode === "snapshot"
              ? "This test summarizes your site from the existing snapshot signals (title, meta, H1, excerpt)."
              : "This test asks a model to describe your site from the URL alone. It does not browse or use prior context."}
          </p>
        </Card>
      )}
    </div>
  );
}

function SignalRow({ label, value, match }: { label: string; value: boolean; match?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-950">
      <div className="flex items-center justify-between">
        <span className="text-stone-500 dark:text-stone-400">{label}</span>
        <span className={value ? "text-emerald-600" : "text-stone-400"}>
          {value ? "Detected" : "Missing"}
        </span>
      </div>
      {match ? <span className="text-stone-600 dark:text-stone-300">{match}</span> : null}
    </div>
  );
}

function PlaybookRow({ item }: { item: ColdPlaybookItem }) {
  const badgeClass =
    item.status === "already_present"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
  const badgeLabel = item.status === "already_present" ? "Already present" : "Recommend";

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-stone-800 dark:text-stone-200">{item.title}</div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
      <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">{item.why}</div>
      {item.reason ? (
        <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">{item.reason}</div>
      ) : null}
      <div className="mt-1 text-xs text-stone-600 dark:text-stone-300">{item.example}</div>
    </div>
  );
}
