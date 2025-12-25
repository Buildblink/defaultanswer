"use client";

import { useState } from "react";
import { reportToMarkdown, type ReportData, type LiveRecommendationCheck } from "@/lib/defaultanswer/report-to-markdown";
import { readColdSummaryFromStorage } from "./cold-summary-storage";

export function CopyMarkdownButton({
  reportData,
  reportId,
  compact = false,
}: {
  reportData: ReportData;
  reportId: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const enriched = withClientAugments(reportData, reportId);
    const markdown = reportToMarkdown(enriched);

    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const buttonClass = compact
    ? "inline-flex items-center justify-center rounded-2xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
    : "inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-2 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={copy}
        className={buttonClass}
      >
        {copied ? "Copied - ready to paste into AI" : "Copy Report for AI"}
      </button>
      {compact ? null : (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Paste this into ChatGPT, Claude, or Perplexity
        </p>
      )}
    </div>
  );
}

function withClientAugments(base: ReportData, reportId: string): ReportData {
  if (typeof window === "undefined") return base;
  const coldSummary = readColdSummaryFromStorage(reportId);
  const withCold = coldSummary
    ? {
        ...base,
        coldSummary: coldSummary.singleRun,
        coldSummaryMulti: coldSummary.multiRun,
        coldSummaryByMode: coldSummary.byMode,
      }
    : base;
  try {
    const raw = window.localStorage.getItem(`${reportId}-live-query`);
    if (!raw) return withCold;
    const parsed = JSON.parse(raw) as LiveRecommendationCheck[];
    if (!Array.isArray(parsed) || parsed.length === 0) return base;
    const normalized = parsed.map(normalizeLiveCheck).filter(Boolean) as LiveRecommendationCheck[];
    if (normalized.length === 0) return withCold;
    return { ...withCold, liveChecks: normalized };
  } catch {
    return withCold;
  }
}

function normalizeLiveCheck(raw: any): LiveRecommendationCheck | null {
  if (!raw) return null;
  const outcomeMap: Record<string, LiveRecommendationCheck["outcome"]> = {
    default: "default",
    "Default Recommendation": "default",
    top_alternative: "top_alternative",
    "Top Alternative": "top_alternative",
    listed_option: "listed_option",
    "Listed Option": "listed_option",
    not_mentioned: "not_mentioned",
    "Not Mentioned": "not_mentioned",
  };
  const outcome = outcomeMap[raw.outcome] || "not_mentioned";
  return {
    id: raw.id || crypto.randomUUID(),
    query: raw.query || "Unknown query",
    model: raw.model || "Other",
    answer: raw.answer || "",
    outcome,
    bullets: raw.bullets || raw.supporting || [],
    guidance: raw.guidance || "",
    brandFound: raw.brandFound ?? outcome !== "not_mentioned",
    firstMentionIndex: raw.firstMentionIndex,
    competitorCandidates: raw.competitorCandidates,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}
