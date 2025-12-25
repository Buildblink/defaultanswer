"use client";

import { useEffect, useMemo, useState } from "react";
import { escapeRegExp } from "@/lib/defaultanswer/string-utils";
import type { AnalysisResult } from "@/lib/defaultanswer/scoring";
import type { LiveRecommendationCheck } from "@/lib/defaultanswer/report-to-markdown";

type Outcome = LiveRecommendationCheck["outcome"];
type Competitor = NonNullable<LiveRecommendationCheck["competitorCandidates"]>[number];

const MODEL_OPTIONS: LiveRecommendationCheck["model"][] = [
  "ChatGPT",
  "Claude",
  "Perplexity",
  "Gemini",
  "Copilot",
  "Other",
];

export function LiveRecommendationCheck({
  reportId,
  brand,
  domain,
  analysis,
  hideHeader = false,
  compact = false,
}: {
  reportId: string;
  brand: string;
  domain: string;
  analysis: AnalysisResult;
  hideHeader?: boolean;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [model, setModel] = useState<LiveRecommendationCheck["model"]>("ChatGPT");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LiveRecommendationCheck[]>([]);

  const storageKey = useMemo(() => `${reportId}-live-query`, [reportId]);
  const brandLabel = brand || domain || "your brand";
  const snapshotBlocked = (analysis.analysisStatus && analysis.analysisStatus !== "ok") || (analysis.snapshotQuality && analysis.snapshotQuality !== "ok");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LiveRecommendationCheck[];
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizeRecord).filter(Boolean) as LiveRecommendationCheck[];
        setResults(normalized);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleAnalyze = () => {
    setError(null);
    const q = query.trim();
    const a = answer.trim();
    if (q.length < 10) {
      setError("Please include the query you asked (at least 10 characters).");
      return;
    }
    if (!model) {
      setError("Please select the model used.");
      return;
    }
    if (a.length < 200) {
      setError("Please paste the full AI answer (at least 200 characters).");
      return;
    }

    const record = analyzeAnswer({
      query: q,
      model,
      answer: a,
      brand: brandLabel,
      domain,
    });
    const next = [record, ...results].slice(0, 10);
    setResults(next);
    setAnswer("");
    setQuery("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    }
  };

  const handleClear = () => {
    setAnswer("");
    setQuery("");
    setError(null);
  };

  const updateCompetitorSelection = (recordId: string, label: string, checked: boolean) => {
    const updated = results.map((r) => {
      if (r.id !== recordId) return r;
      const candidates = r.competitorCandidates || [];
      const filtered = checked
        ? candidates
        : candidates.filter((c) => c.label !== label);
      return { ...r, competitorCandidates: filtered };
    });
    setResults(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const summary = buildSummary(results);
  const containerClass = `border border-stone-200 dark:border-stone-800 rounded-lg p-5 bg-white dark:bg-stone-900 ${
    compact ? "" : "mb-10"
  }`;

  return (
    <div className={containerClass}>
      {!hideHeader ? (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xl font-semibold">Live AI Recommendation Check</h3>
            {snapshotBlocked && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                Snapshot blocked ƒ?" proof mode still works
              </span>
            )}
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
            Paste a real AI answer to see how your brand was positioned. No model calls are made.
          </p>
        </>
      ) : snapshotBlocked ? (
        <div className="mb-3">
          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
            Snapshot blocked ƒ?" proof mode still works
          </span>
        </div>
      ) : null}

      <div className="grid gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
            Query asked
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-2 text-sm"
            placeholder="e.g., What platform should I use to deploy Next.js apps?"
          />
        </div>
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-stone-700 dark:text-stone-300 min-w-[80px]">
            Model used
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as LiveRecommendationCheck["model"])}
            className="rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-sm p-2"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
            Paste an AI answer you received
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-3 text-sm"
            placeholder={`"I asked ChatGPT: 'What platform should I use to deploy Next.js apps?'\nPaste the full answer here…"`}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      <div className="mt-1 flex gap-3">
        <button
          type="button"
          onClick={handleAnalyze}
          className="px-4 py-2 rounded-md bg-stone-900 text-white dark:bg-stone-200 dark:text-stone-900 text-sm font-semibold"
        >
          Analyze Answer
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-700 dark:text-stone-200"
        >
          Clear
        </button>
      </div>

      {/* Proof summary */}
      {results.length > 0 && (
        <div className="mt-6 border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-stone-50 dark:bg-stone-900">
          <h4 className="font-semibold text-stone-800 dark:text-stone-200 mb-2">Proof Summary</h4>
          <div className="flex flex-wrap gap-4 text-sm text-stone-700 dark:text-stone-300">
            <span>Total checks: {summary.total}</span>
            <span>Mention rate: {summary.mentionRate}%</span>
            <span>Default rate: {summary.defaultRate}%</span>
          </div>
          {summary.topCompetitors.length > 0 && (
            <div className="mt-2 text-sm text-stone-700 dark:text-stone-300">
              <span className="font-semibold">Top competitors mentioned:</span>{" "}
              {summary.topCompetitors.map((c) => c.label).join(", ")}
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 space-y-4">
          {results.map((r) => (
            <div
              key={r.id}
              className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-stone-50 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-stone-800 dark:text-stone-200">
                  Recommendation Outcome: <OutcomeBadge outcome={r.outcome} />
                </p>
                <span className="text-xs text-stone-500 dark:text-stone-400">{r.createdAt}</span>
              </div>
              <p className="text-sm text-stone-700 dark:text-stone-300 mt-1">
                <span className="font-semibold">Query:</span> {r.query}
              </p>
              <p className="text-sm text-stone-700 dark:text-stone-300">
                <span className="font-semibold">Model:</span> {r.model}
              </p>
              <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{r.guidance}</p>
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">Why</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-stone-700 dark:text-stone-300">
                  {r.bullets.slice(0, 5).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              {r.competitorCandidates && r.competitorCandidates.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
                    Competitors mentioned in this answer
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm text-stone-700 dark:text-stone-300">
                    {r.competitorCandidates.map((c) => (
                      <label key={c.label} className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked
                          onChange={(e) => updateCompetitorSelection(r.id, c.label, e.target.checked)}
                          className="rounded border-stone-300 dark:border-stone-700"
                        />
                        <span>{c.label} ({c.type}, {c.count}x)</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                Snippet: “{snippetFromText(r.answer, 140)}”
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const map: Record<Outcome, string> = {
    default: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
    top_alternative: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    listed_option: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
    not_mentioned: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  };
  const label = formatOutcome(outcome);
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[outcome]}`}>
      {label}
    </span>
  );
}

function analyzeAnswer({
  query,
  model,
  answer,
  brand,
  domain,
}: {
  query: string;
  model: LiveRecommendationCheck["model"];
  answer: string;
  brand: string;
  domain: string;
}): LiveRecommendationCheck {
  const cleanedText = answer.replace(/https?:\/\/\S+/gi, " ");
  const brandPattern = buildBrandRegex(brand || domain);
  const match = brandPattern.exec(cleanedText);
  const brandFound = Boolean(match);

  const competitorCandidates = extractCompetitors(cleanedText, brand, domain);

  if (!match) {
    return {
      id: crypto.randomUUID(),
      query,
      model,
      answer,
      outcome: "not_mentioned",
      bullets: ["Brand not found in the pasted answer."],
      guidance:
        "AI did not retrieve your brand for this query. This usually means missing direct answer blocks or weak entity alignment for this intent.",
      brandFound: false,
      competitorCandidates,
      createdAt: timestamp(),
    };
  }

  const brandIndex = match.index;
  const paragraphs = cleanedText.split(/\n{2,}/);
  let running = 0;
  let paragraphIndex = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const len = paragraphs[i].length + 2;
    if (brandIndex < running + len) {
      paragraphIndex = i;
      break;
    }
    running += len;
  }

  const sentences = cleanedText.split(/(?<=[\.\!\?])\s+/);
  const sentenceIndex = sentences.findIndex((s) => brandPattern.test(s));

  const preference = hasPreferenceLanguage(cleanedText, brandIndex);
  const competitorContext = hasCompetitorContext(cleanedText, brandIndex, brandPattern, brand);

  const outcome = classifyOutcome({
    brandIndex,
    paragraphIndex,
    preference,
    competitorContext,
  });

  const bullets: string[] = [];
  if (paragraphIndex === 0) bullets.push("Brand mentioned in the first paragraph.");
  if (sentenceIndex === 0) bullets.push("Brand appears in the first sentence.");
  if (preference) bullets.push("Preference language near the brand (“best”, “recommended”).");
  if (competitorContext) bullets.push("Competitors or alternatives appear before the brand.");
  if (!bullets.length) bullets.push("Brand mentioned without strong preference signals.");

  const guidance = guidanceForOutcome(outcome);

  return {
    id: crypto.randomUUID(),
    query,
    model,
    answer,
    outcome,
    bullets,
    guidance,
    brandFound: true,
    firstMentionIndex: brandIndex,
    competitorCandidates,
    createdAt: timestamp(),
  };
}

function classifyOutcome({
  brandIndex,
  paragraphIndex,
  preference,
  competitorContext,
}: {
  brandIndex: number;
  paragraphIndex: number;
  preference: boolean;
  competitorContext: boolean;
}): Outcome {
  if (preference && paragraphIndex === 0) return "default";
  if (brandIndex <= 400 && competitorContext) return "top_alternative";
  if (brandIndex >= 0) return "listed_option";
  return "not_mentioned";
}

function guidanceForOutcome(outcome: Outcome): string {
  switch (outcome) {
    case "default":
      return "AI already selects your brand as the default for this query. Focus on maintaining retrieval clarity and coverage.";
    case "top_alternative":
    case "listed_option":
      return "AI recognizes your brand but lacks confidence to select it as default. Improving retrievable “What is / How it works” answers for this query can shift positioning.";
    case "not_mentioned":
    default:
      return "AI did not retrieve your brand for this query. This usually means missing direct answer blocks or weak entity alignment for this intent.";
  }
}

function buildBrandRegex(label: string): RegExp {
  const cleaned = (label || "").trim();
  if (!cleaned) return /(?!)^/; // matches nothing
  return new RegExp(`\\b${escapeRegExp(cleaned)}(?:'s)?\\b`, "i");
}

function hasPreferenceLanguage(answer: string, brandIndex: number): boolean {
  const window = 80;
  const start = Math.max(0, brandIndex - window);
  const end = Math.min(answer.length, brandIndex + window);
  const slice = answer.slice(start, end).toLowerCase();
  return /(best|recommended|top choice|ideal|you should use)/i.test(slice);
}

function hasCompetitorContext(answer: string, brandIndex: number, brandPattern: RegExp, brandLabel: string): boolean {
  const prior = answer.slice(0, Math.max(0, brandIndex));
  if (/[\n\r]\s*[\-\•\d]+\./.test(prior)) return true;
  if (/(other|alternatives|instead of|versus|vs\.|vs|options include)/i.test(prior)) return true;
  const capitalized = prior.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
  const brandLower = (brandLabel || "").toLowerCase();
  const otherCap = capitalized.find((c) => c.toLowerCase() !== brandLower.toLowerCase());
  return Boolean(otherCap);
}

function extractCompetitors(text: string, brand: string, domain: string): Competitor[] {
  const normalizedBrand = (brand || "").toLowerCase();
  const normalizedDomain = (domain || "").toLowerCase();
  const counts: Record<string, Competitor> = {};

  // Domains
  const domainMatches = text.match(/([a-z0-9-]+\.)+[a-z]{2,}/gi) || [];
  for (const d of domainMatches) {
    const lower = d.toLowerCase();
    if (lower.includes(normalizedDomain)) continue;
    addCompetitor(counts, lower, "domain");
  }

  // Brand-like names
  const nameMatches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
  const stop = new Set([
    "The","This","That","These","Those","Best","Top","Platform","Solution","Service","Product","App","Apps","AI","Tool","Tools","Option","Options","One","Two","Three","Four","Five",
    "Next","First","Second","Third","Fourth","Fifth","Another","Other","Alternative","Alternatives","Good","Better","Great","Use","Using","Your","You","We","They","Our","Their","It",
    brand.trim(),
  ].map((w) => w.toLowerCase()));
  for (const n of nameMatches) {
    const lower = n.toLowerCase();
    if (stop.has(lower)) continue;
    if (normalizedBrand && lower.includes(normalizedBrand)) continue;
    if (normalizedDomain && lower.includes(normalizedDomain)) continue;
    if (lower.length < 3) continue;
    addCompetitor(counts, n.trim(), "name");
  }

  return Object.values(counts);
}

function addCompetitor(counts: Record<string, Competitor>, label: string, type: Competitor["type"]) {
  if (counts[label]) {
    counts[label].count += 1;
  } else {
    counts[label] = { label, type, count: 1 };
  }
}

function buildSummary(records: LiveRecommendationCheck[]) {
  const total = records.length;
  const mentions = records.filter((r) => r.brandFound).length;
  const defaults = records.filter((r) => r.outcome === "default").length;

  const competitorCounts: Record<string, number> = {};
  for (const r of records) {
    (r.competitorCandidates || []).forEach((c) => {
      competitorCounts[c.label] = (competitorCounts[c.label] || 0) + c.count;
    });
  }
  const topCompetitors = Object.entries(competitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => ({ label }));

  return {
    total,
    mentionRate: total ? Math.round((mentions / total) * 100) : 0,
    defaultRate: total ? Math.round((defaults / total) * 100) : 0,
    topCompetitors,
  };
}

function snippetFromText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatOutcome(outcome: Outcome): string {
  switch (outcome) {
    case "default":
      return "Default Recommendation";
    case "top_alternative":
      return "Top Alternative";
    case "listed_option":
      return "Listed Option";
    default:
      return "Not Mentioned";
  }
}

function normalizeRecord(raw: any): LiveRecommendationCheck | null {
  if (!raw) return null;
  const outcomeMap: Record<string, Outcome> = {
    default: "default",
    "Default Recommendation": "default",
    top_alternative: "top_alternative",
    "Top Alternative": "top_alternative",
    listed_option: "listed_option",
    "Listed Option": "listed_option",
    not_mentioned: "not_mentioned",
    "Not Mentioned": "not_mentioned",
  };
  return {
    id: raw.id || crypto.randomUUID(),
    query: raw.query || "Unknown query",
    model: raw.model || "Other",
    answer: raw.answer || raw.snippet || "",
    outcome: outcomeMap[raw.outcome] || "not_mentioned",
    bullets: raw.bullets || raw.supporting || [],
    guidance:
      raw.guidance ||
      (raw.outcome === "Default Recommendation"
        ? "AI already selects your brand as the default for this query. Focus on maintaining retrieval clarity and coverage."
        : "AI recognizes your brand but lacks confidence to select it as default. Improving retrievable “What is / How it works” answers for this query can shift positioning."),
    brandFound: raw.brandFound ?? raw.outcome !== "Not Mentioned",
    firstMentionIndex: raw.firstMentionIndex,
    competitorCandidates: raw.competitorCandidates,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}
