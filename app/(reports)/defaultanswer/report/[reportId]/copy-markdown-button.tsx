"use client";

import { useState } from "react";
import { reportToMarkdown, type ReportData, type LiveRecommendationCheck } from "@/lib/defaultanswer/report-to-markdown";

export function CopyMarkdownButton({ reportData, reportId }: { reportData: ReportData; reportId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const enriched = withLiveChecks(reportData, reportId);
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

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={copy}
        className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors"
      >
        {copied ? "✓ Copied — ready to paste into AI" : "Copy Report for AI"}
      </button>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        Paste this into ChatGPT, Claude, or Perplexity
      </p>
    </div>
  );
}

function withLiveChecks(base: ReportData, reportId: string): ReportData {
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(`${reportId}-live-query`);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as LiveRecommendationCheck[];
    if (!Array.isArray(parsed) || parsed.length === 0) return base;
    const normalized = parsed.map(normalizeLiveCheck).filter(Boolean) as LiveRecommendationCheck[];
    if (normalized.length === 0) return base;
    return { ...base, liveChecks: normalized };
  } catch {
    return base;
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
