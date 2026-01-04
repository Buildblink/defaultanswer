"use client";

import { useState } from "react";
import { Card } from "@/app/(landing)/ui/Card";
import { Pill } from "@/app/(landing)/ui/Pill";
import { CopyButton } from "@/app/(reports)/defaultanswer/report/[reportId]/copy-button";

type LiveProofResult = {
  provider: "openai";
  model: string;
  generatedAt: string;
  items: Array<{
    prompt: string;
    responseText: string;
    mentioned: string[];
  }>;
};

type LiveProofPanelProps = {
  evaluatedUrl: string;
  prompts: string[];
  aiEnabled: boolean;
};

export function LiveProofPanel({ evaluatedUrl, prompts, aiEnabled }: LiveProofPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LiveProofResult | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report/live-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluatedUrl,
          prompts: prompts.slice(0, 5),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = payload?.error || "Live proof failed.";
        setError(message);
        setLoading(false);
        return;
      }
      const payload = (await res.json()) as LiveProofResult;
      setResult(payload);
    } catch {
      setError("Live proof failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Live Proof">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Live outputs are non-deterministic and can change by time/model.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={loading || !aiEnabled}
          className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-2 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
        >
          {loading ? "Running..." : "Run Live Proof"}
        </button>
        {!aiEnabled ? (
          <span className="text-sm text-stone-500 dark:text-stone-400">
            AI summary isn't available on this deployment.
          </span>
        ) : null}
        {error ? (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        ) : null}
      </div>
      {result ? (
        <div className="mt-6 space-y-4">
          {result.items.map((item) => (
            <Card key={`${item.prompt}-${result.generatedAt}`}>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                {item.prompt}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {result.provider} {result.model} • {new Date(result.generatedAt).toLocaleString()}
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{item.responseText}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.mentioned.map((label) => (
                  <Pill key={label}>{label}</Pill>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={item.responseText} />
                <CopyButton text={`${item.prompt}\n\n${item.responseText}`} />
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
