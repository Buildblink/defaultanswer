"use client";

import { useMemo, useState } from "react";
import { Card } from "@/app/(landing)/ui/Card";
import { Pill } from "@/app/(landing)/ui/Pill";
import { getLiveProofPromptSet } from "@/lib/report/liveproof-prompts";

type MentionCheckItem = {
  id: string;
  title: string;
  prompt: string;
  responseText: string;
  result: {
    mentioned: boolean;
    rank: number | null;
    recommended: string | null;
    alternatives: string[];
    confidence: "high" | "medium" | "low";
    reason: string | null;
    exclusionReason: string | null;
    verdict: "Recommended" | "Not Recommended";
  };
};

type MentionCheckResult = {
  category: string;
  prompts: Array<{ id: string; text: string }>;
  results: MentionCheckItem[];
};

type MentionCheckPanelProps = {
  brand: string;
  domain: string;
  defaultCategory: string;
  defaultModel: string;
  aiEnabled: boolean;
};

export function MentionCheckPanel({
  brand: initialBrand,
  domain: initialDomain,
  defaultCategory,
  defaultModel,
  aiEnabled,
}: MentionCheckPanelProps) {
  const [brandName, setBrandName] = useState(initialBrand);
  const [domain, setDomain] = useState(initialDomain);
  const [model, setModel] = useState(defaultModel);
  const [category, setCategory] = useState(defaultCategory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MentionCheckResult | null>(null);

  const promptSet = useMemo(
    () =>
      getLiveProofPromptSet({
        brandName,
        domain,
        category,
      }),
    [brandName, category, domain]
  );

  const handleRun = async () => {
    setError(null);
    setResult(null);
    const trimmedBrand = brandName.trim();
    const trimmedDomain = domain.trim();
    if (!trimmedBrand && !trimmedDomain) {
      setError("Enter a brand name or domain to check.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/liveproof/mention-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: trimmedBrand,
          domain: trimmedDomain,
          model,
          category,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = payload?.error || "Mention check failed.";
        setError(message);
        setLoading(false);
        return;
      }
      const payload = (await res.json()) as MentionCheckResult;
      setResult(payload);
    } catch {
      setError("Mention check failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Live Proof (Mention Check)">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-stone-700 dark:text-stone-300 md:col-span-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Category
            </span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-stone-50"
            />
          </label>
          <label className="text-sm text-stone-700 dark:text-stone-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Brand name
            </span>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-stone-50"
            />
          </label>
          <label className="text-sm text-stone-700 dark:text-stone-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Domain
            </span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-stone-50"
            />
          </label>
          <label className="text-sm text-stone-700 dark:text-stone-300">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Model
            </span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-stone-50"
            >
              {[defaultModel, "gpt-4o-mini", "gpt-4o"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={loading || !aiEnabled}
            className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-2 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            {loading ? "Running..." : "Run Mention Check"}
          </button>
          {!aiEnabled ? (
            <span className="text-sm text-stone-500 dark:text-stone-400">
              AI summary isn't available on this deployment.
            </span>
          ) : null}
          {error ? <span className="text-sm text-red-600 dark:text-red-400">{error}</span> : null}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400">
          Testing category: {category || defaultCategory}
        </div>
        <div className="mt-3 space-y-3">
          {promptSet.map((prompt) => (
            <details key={prompt.id} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {prompt.title}
              </summary>
              <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{prompt.text}</p>
            </details>
          ))}
        </div>
      </div>

      {result ? (
        <div className="mt-6 space-y-4">
          {result.results.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
            >
              <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200">
                <div className="text-sm font-semibold">
                  {item.result.mentioned
                    ? `✅ AI recommended ${brandName || "your brand"}`
                    : `❌ AI did not recommend ${brandName || "your brand"}`}
                </div>
                <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                  {item.result.mentioned ? (
                    "Ranked #1 for this prompt."
                  ) : (
                    <>
                      AI chose{" "}
                      <strong className="text-stone-900 dark:text-stone-50">
                        {item.result.recommended || "another tool"}
                      </strong>{" "}
                      instead. You ranked #{item.result.rank ?? "—"}.
                    </>
                  )}
                </div>
                <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                  {item.result.mentioned
                    ? `AI cited clear ${resolvePrimarySignal(item)} signals.`
                    : `AI prioritized ${resolvePrimarySignal(item)}, which your site does not clearly demonstrate yet.`}
                </div>
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {item.title}
              </div>
              <div className="mt-2 font-semibold text-stone-900 dark:text-stone-100">
                {item.prompt}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    item.result.verdict === "Recommended"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                  }`}
                >
                  {item.result.verdict}
                </span>
                <Pill>Confidence: {formatConfidence(item.result.confidence)}</Pill>
                {item.result.rank ? <Pill>Rank: {item.result.rank}</Pill> : <Pill>Rank: —</Pill>}
              </div>
              <p className="mt-3 text-sm text-stone-800 dark:text-stone-200">
                {item.result.mentioned
                  ? item.result.rank
                    ? `✅ Mentioned (rank #${item.result.rank}).`
                    : "✅ Mentioned."
                  : `❌ Not recommended — AI chose ${item.result.recommended || "another tool"} instead.`}
              </p>
              <div className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                <div>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Recommended tool:</span>{" "}
                  {item.result.recommended || "Unavailable"}
                </div>
                <div>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    Who AI chose instead:
                  </span>{" "}
                  {buildAlternatives(item).length ? buildAlternatives(item).join(", ") : "None detected"}
                </div>
                {item.result.exclusionReason ? (
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">Exclusion:</span>{" "}
                    {item.result.exclusionReason}
                  </div>
                ) : null}
                {item.result.reason ? (
                  <div>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">Reason:</span>{" "}
                    {item.result.reason}
                  </div>
                ) : null}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  View full response
                </summary>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-xs text-stone-800 dark:bg-stone-950 dark:text-stone-200">
{item.responseText}
                </pre>
              </details>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function formatConfidence(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

function buildAlternatives(item: MentionCheckItem): string[] {
  if (item.result.mentioned) {
    return item.result.alternatives;
  }
  const list = [item.result.recommended, ...item.result.alternatives].filter(
    (entry): entry is string => Boolean(entry)
  );
  const unique: string[] = [];
  for (const entry of list) {
    if (unique.some((u) => u.toLowerCase() === entry.toLowerCase())) continue;
    unique.push(entry);
    if (unique.length >= 3) break;
  }
  return unique;
}

function resolvePrimarySignal(item: MentionCheckItem): string {
  const text = `${item.result.reason || ""} ${item.result.exclusionReason || ""}`.toLowerCase();
  if (/price|pricing|budget|cost/.test(text)) return "pricing clarity";
  if (/doc|documentation|docs/.test(text)) return "documentation clarity";
  if (/integration|ecosystem|stack|platform/.test(text)) return "integration ecosystem";
  if (/enterprise|security|compliance|scale/.test(text)) return "enterprise readiness";
  if (/experiment|testing|benchmark|evidence/.test(text)) return "experimentation depth";
  if (/category|position|positioning|definition/.test(text)) return "category positioning";
  return "category positioning";
}
