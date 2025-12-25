"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisResult } from "@/lib/defaultanswer/scoring";
import type { SimulationResult } from "@/lib/defaultanswer/simulation";
import { CopyButton } from "./copy-button";

type Props = {
  domain: string;
  url: string;
  analysis: AnalysisResult;
  hideHeader?: boolean;
  compact?: boolean;
};

type SimulationResponse =
  | { ok: true; simulation: SimulationResult; model: string; tokens?: { input?: number; output?: number } }
  | { ok: false; error: string };

export function SimulationPanel({ domain, url, analysis, hideHeader = false, compact = false }: Props) {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string | null>(null);

  const storageKey = useMemo(() => `${(domain || "").toLowerCase()}::sim-v1`, [domain]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SimulationResult;
      if (parsed && parsed.version === "sim-v1") {
        setSimulation(parsed);
      }
    } catch {
      // ignore storage read errors
    }
  }, [storageKey]);

  const eligible =
    (analysis.analysisStatus ?? "ok") === "ok" &&
    (analysis.snapshotQuality ?? "ok") === "ok" &&
    analysis.score >= 40;
  if (!eligible) return null;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/defaultanswer/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, analysis }),
      });
      const data = (await res.json()) as SimulationResponse;
      if (!data.ok) {
        setError(data.error || "Simulation failed.");
        setSimulation(null);
      } else {
        setSimulation(data.simulation);
        setModel(data.model || null);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, JSON.stringify(data.simulation));
        }
      }
    } catch {
      setError("Simulation failed (network or server error).");
    } finally {
      setLoading(false);
    }
  };

  const recommended =
    simulation?.recommendedAsDefault ?? simulation?.likely_inclusion?.included ?? false;
  const confidence =
    simulation?.confidence ?? simulation?.likely_inclusion?.confidence ?? 0;
  const topReasons =
    simulation?.topReasons?.length
      ? simulation.topReasons
      : simulation?.likely_inclusion?.why || [];
  const missingSignals =
    simulation?.missingSignals?.length
      ? simulation.missingSignals
      : simulation?.missing_signals || [];
  const nextActions = simulation?.nextActions || [];
  const definitionBlock =
    simulation?.recommended_definition_block || { h1: "", subheadline: "", three_bullets: [] as string[] };
  const definitionBullets = definitionBlock.three_bullets || [];

  const containerClass = `border border-stone-200 dark:border-stone-800 rounded-lg p-5 bg-white dark:bg-stone-900 ${
    compact ? "" : "mb-10"
  }`;

  return (
    <div className={containerClass}>
      <div className={`flex items-center gap-3 ${hideHeader ? "justify-end" : "justify-between"}`}>
        {!hideHeader ? (
          <div>
            <h3 className="text-xl font-semibold">LLM Recommendation Simulation (Beta)</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Simulation based on your snapshot + general LLM behavior. No real-time model calls to competitors.
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-stone-900 text-white dark:bg-stone-200 dark:text-stone-900 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Running..." : simulation ? "Re-run Simulation" : "Run Simulation"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          Simulation unavailable: {error}
        </p>
      )}

      {simulation && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                recommended
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
              }`}
            >
              Would AI recommend you? {recommended ? "Likely" : "Not yet"}
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400">
              Confidence: {confidence}/100
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Model: {model || "n/a"}
            </span>
          </div>

          {topReasons?.length ? (
            <Card title="Why the model leans this way">
              <ul className="list-disc list-inside space-y-1 text-sm text-stone-700 dark:text-stone-300">
                {topReasons.slice(0, 5).map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          {missingSignals.length ? (
            <Card title="Missing signals the model sees">
              <ul className="space-y-1 text-sm text-stone-700 dark:text-stone-300">
                {missingSignals.slice(0, 7).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 h-3 w-3 rounded-full border border-stone-400 dark:border-stone-600" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card
            title={
              nextActions.length ? "Next actions to validate" : "Next actions to validate (not provided)"
            }
          >
            {nextActions.length ? (
              <div className="space-y-3">
                {nextActions.slice(0, 8).map((a, idx) => (
                  <div
                    key={idx}
                    className="border border-stone-200 dark:border-stone-800 rounded-md p-3 text-sm text-stone-800 dark:text-stone-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-stone-600 dark:text-stone-400">
                        {a.priority}
                      </span>
                    </div>
                    <p className="font-semibold">{a.action}</p>
                    {a.why ? <p className="text-stone-600 dark:text-stone-400 text-xs mt-1">Why: {a.why}</p> : null}
                    {a.validate ? (
                      <p className="text-stone-600 dark:text-stone-400 text-xs">Validate: {a.validate}</p>
                    ) : null}
                  </div>
                ))}
                <CopyButton
                  text={nextActions
                    .slice(0, 8)
                    .map((a) => `${a.priority.toUpperCase()}: ${a.action} (Why: ${a.why}; Validate: ${a.validate})`)
                    .join("\n")}
                />
              </div>
            ) : (
              <p className="text-sm text-stone-600 dark:text-stone-400">
                The model did not return explicit next actions.
              </p>
            )}
          </Card>

          <Card title="Alternative categories AI might choose">
            <ul className="list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
              {(simulation.alternative_categories || []).map((c, idx) => (
                <li key={idx}>
                  <span className="font-semibold">{c.category}</span> — {c.why_ai_picks_it}
                  {c.what_ai_looks_for?.length ? (
                    <ul className="list-disc list-inside ml-4 text-stone-600 dark:text-stone-400">
                      {c.what_ai_looks_for.slice(0, 3).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Decision criteria">
            <ul className="list-disc list-inside space-y-1 text-sm text-stone-700 dark:text-stone-300">
              {(simulation.decision_criteria || []).slice(0, 10).map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </Card>

          <Card title="Recommended definition block">
            <div className="text-sm text-stone-800 dark:text-stone-200 space-y-2">
              <p>
                <span className="font-semibold">H1:</span> {definitionBlock.h1}
              </p>
              <p>
                <span className="font-semibold">Subheadline:</span>{" "}
                {definitionBlock.subheadline}
              </p>
              <ul className="list-disc list-inside space-y-1 text-stone-700 dark:text-stone-300">
                {definitionBullets.slice(0, 3).map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
              <div>
                <CopyButton
                  text={`${definitionBlock.h1}\n${definitionBlock.subheadline}\n- ${definitionBullets.join(
                    "\n- "
                  )}`}
                />
              </div>
            </div>
          </Card>

          <p className="text-xs text-stone-500 dark:text-stone-400">
            {simulation.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-stone-50 dark:bg-stone-900">
      <h4 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">{title}</h4>
      {children}
    </div>
  );
}
