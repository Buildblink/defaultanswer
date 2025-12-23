"use client";

import { useState } from "react";
import { normalizeUrl, isValidUrl } from "@/lib/defaultanswer/url-utils";
import type { BreakdownItem, ExtractedData } from "@/lib/defaultanswer/scoring";
import type { CompareSide, GapItem, CompareResponseSuccess, CompareResponse } from "@/lib/defaultanswer/compare";

type BiggestGap = {
  label: string;
  delta: number;
  aPoints: number;
  bPoints: number;
  max: number;
  suggestedAction: string;
};

type BreakdownEntry = {
  label: string;
  max: number;
  aPoints: number;
  bPoints: number;
};

type BreakdownRow = BreakdownEntry & {
  key: string;
  delta: number;
};

export default function CompareClient() {
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSavedId(null);

    if (!isValidUrl(urlA) || !isValidUrl(urlB)) {
      setError("Enter two valid URLs (e.g., https://example.com)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/defaultanswer/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlA: normalizeUrl(urlA), urlB: normalizeUrl(urlB) }),
      });
      const data = (await res.json()) as CompareResponse;
      setResult(data);
      if (!data.ok) {
        setError(data.error || "Comparison failed.");
      }
    } catch {
      setError("Comparison failed (network or server error).");
    } finally {
      setLoading(false);
    }
  };

  const canShow = result && result.ok;
  const sideA = canShow ? (result as any).a as CompareSide : (result as any)?.a;
  const sideB = canShow ? (result as any).b as CompareSide : (result as any)?.b;
  const diff = canShow ? (result as any).diff : null;

  const breakdownRows = canShow && sideA && sideB ? buildBreakdownRows(sideA.breakdown, sideB.breakdown) : [];

  const handleCopy = async () => {
    if (!result || !canShow || !sideA || !sideB || !diff) return;
    const text = buildCompareSummaryText(result as any);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed. Please copy manually.");
    }
  };

  const handleSave = async () => {
    if (!canShow || !result?.ok) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/defaultanswer/compare/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlA: sideA?.url, urlB: sideB?.url, comparePayload: result }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedId(data.compareId);
      } else {
        setError(data.error || "Save failed.");
      }
    } catch {
      setError("Save failed (network or server error).");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!savedId) return;
    const link = `${window.location.origin}/defaultanswer/compare/${savedId}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      setError("Copy link failed. Please copy manually.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wide">DefaultAnswer</p>
          <h1 className="text-3xl font-bold">Manual Competitor Compare</h1>
          <p className="text-stone-600 dark:text-stone-400">
            Enter your site and a competitor to see side-by-side DefaultAnswer scores, breakdowns, and gaps.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Your URL</label>
              <input
                type="text"
                value={urlA}
                onChange={(e) => setUrlA(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full mt-2 px-4 py-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Competitor URL</label>
              <input
                type="text"
                value={urlB}
                onChange={(e) => setUrlB(e.target.value)}
                placeholder="https://competitor.com"
                className="w-full mt-2 px-4 py-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-lg"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </form>

        {result && !result.ok && (
          <div className="border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
            {result.error || "Comparison incomplete."}
          </div>
        )}

        {canShow && sideA && sideB && diff && (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-3 items-start">
              <ScoreCard title="You" score={sideA.score} readiness={sideA.readiness.label} url={sideA.url} />
              <ScoreCard title="Competitor" score={sideB.score} readiness={sideB.readiness.label} url={sideB.url} />
              <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
                <p className="text-sm text-stone-500">Score Delta</p>
                <p className="text-2xl font-semibold mt-1">
                  {diff.scoreDelta > 0
                    ? `You are ${diff.scoreDelta} points behind`
                    : diff.scoreDelta === 0
                      ? "Tied"
                      : `You lead by ${Math.abs(diff.scoreDelta)} points`}
                </p>
                <p className="text-xs text-stone-500 mt-1">Positive means competitor ahead.</p>
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!canShow}
                  className="px-4 py-2 rounded-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-sm font-semibold disabled:opacity-60"
                >
                  {copied ? "Copied!" : "Copy summary"}
                </button>
                <p className="text-xs text-stone-500">
                  Copies URL vs URL, scores, delta, top gaps, and quick wins.
                </p>
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canShow || saving}
                  className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving..." : savedId ? "Saved" : "Save compare"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!savedId}
                  className="px-4 py-2 rounded-md bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-100 text-sm font-semibold disabled:opacity-60"
                >
                  {linkCopied ? "Link copied!" : "Copy share link"}
                </button>
                {savedId && (
                  <span className="text-xs text-stone-500">
                    Shareable link: /defaultanswer/compare/{savedId}
                  </span>
                )}
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleExportMarkdown(result as CompareResponseSuccess)}
                  disabled={!canShow}
                  className="px-4 py-2 rounded-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-sm font-semibold disabled:opacity-60"
                >
                  Export Markdown
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPdf(result as CompareResponseSuccess)}
                  disabled={!canShow}
                  className="px-4 py-2 rounded-md bg-stone-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  Export PDF
                </button>
              </div>
            </section>

            <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 overflow-auto">
              <h3 className="text-lg font-semibold mb-3">Side-by-side Breakdown</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-stone-500">
                  <tr>
                    <th className="py-2 pr-4">Signal</th>
                    <th className="py-2 pr-4">You</th>
                    <th className="py-2 pr-4">Competitor</th>
                    <th className="py-2 pr-4">Max</th>
                    <th className="py-2 pr-4">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {breakdownRows.map((row: BreakdownRow, _idx: number) => (
                    <tr key={row.key}>
                      <td className="py-2 pr-4">{row.label}</td>
                      <td className="py-2 pr-4">{row.aPoints}/{row.max}</td>
                      <td className="py-2 pr-4">{row.bPoints}/{row.max}</td>
                      <td className="py-2 pr-4">{row.max}</td>
                      <td className={`py-2 pr-4 ${row.delta > 0 ? "text-red-600" : row.delta < 0 ? "text-green-600" : "text-stone-600"}`}>
                        {row.delta > 0 ? `-${row.delta}` : row.delta < 0 ? `+${Math.abs(row.delta)}` : "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <Card title="Biggest gaps (competitor advantage)">
                <ul className="list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {diff.biggestGaps.length === 0 && <li>No significant gaps detected.</li>}
                  {diff.biggestGaps.map((gap: BiggestGap, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">{gap.label}</span> — competitor +{gap.delta} ({gap.aPoints}/{gap.max} vs {gap.bPoints}/{gap.max})
                      {gap.suggestedAction !== "—" && <div className="text-xs text-stone-500 mt-1">Action: {gap.suggestedAction}</div>}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Quick wins for you">
                <ul className="list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {diff.quickWins.length === 0 && <li>No quick wins detected.</li>}
                  {diff.quickWins.map((gap: GapItem, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">{gap.label}</span> — {gap.suggestedAction}
                    </li>
                  ))}
                </ul>
              </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <EvidencePanel title="Your evidence" extracted={sideA.extracted} />
              <EvidencePanel title="Competitor evidence" extracted={sideB.extracted} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ title, score, readiness, url }: { title: string; score: number; readiness: string; url: string }) {
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
      <p className="text-sm text-stone-500">{title}</p>
      <p className="text-xs text-stone-500">{url}</p>
      <p className="text-3xl font-semibold mt-1">{score}</p>
      <p className="text-sm text-stone-600 dark:text-stone-400">{readiness}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function buildBreakdownRows(a: BreakdownItem[], b: BreakdownItem[]): BreakdownRow[] {
  const map = new Map<string, BreakdownEntry>();
  const add = (items: BreakdownItem[], keySide: "aPoints" | "bPoints") => {
    for (const item of items) {
      const key = `${item.category}::${item.label}`;
      if (!map.has(key)) {
        map.set(key, { label: `${item.category}: ${item.label}`, max: item.max, aPoints: 0, bPoints: 0 });
      }
      const entry = map.get(key)!;
      entry[keySide] = item.points;
      entry.max = item.max || entry.max;
      map.set(key, entry);
    }
  };
  add(a, "aPoints");
  add(b, "bPoints");
  return Array.from(map.entries()).map(([key, value]: [string, BreakdownEntry], _idx: number) => ({
    key,
    ...value,
    delta: value.bPoints - value.aPoints,
  }));
}

function EvidencePanel({ title, extracted }: { title: string; extracted: ExtractedData }) {
  const evidence = extracted.evidence;
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-3 space-y-2 text-sm text-stone-700 dark:text-stone-300">
        {extracted.title && <div><span className="font-semibold">Title:</span> {extracted.title}</div>}
        {extracted.h1s?.[0] && <div><span className="font-semibold">H1:</span> {extracted.h1s[0]}</div>}
        {evidence?.pricingEvidence?.[0] && <div><span className="font-semibold">Pricing:</span> {evidence.pricingEvidence[0]}</div>}
        {evidence?.faqEvidence && (
          <div>
            <span className="font-semibold">FAQ:</span>{" "}
            {evidence.faqEvidence.explicitFaqDetected
              ? "Explicit FAQ found"
              : evidence.faqEvidence.indirectFaqLinks.length
                ? "Indirect FAQ links"
                : "No FAQ signals"}
          </div>
        )}
        {extracted.schemaTypes?.length ? (
          <div>
            <span className="font-semibold">Schema types:</span> {extracted.schemaTypes.slice(0, 3).join(", ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildCompareSummaryText(res: CompareResponseSuccess): string {
  const { a, b, diff } = res;
  const lines: string[] = [];
  lines.push(`Compare: ${a.url} vs ${b.url}`);
  lines.push(`Scores: you ${a.score}, competitor ${b.score} (delta ${diff.scoreDelta})`);

  const gaps = (diff.biggestGaps || []).slice(0, 3);
  lines.push("Biggest gaps:");
  if (gaps.length === 0) {
    lines.push("- None");
  } else {
    gaps.forEach((g) => lines.push(`- ${g.label}: competitor +${g.delta}`));
  }

  const wins = (diff.quickWins || []).slice(0, 3);
  lines.push("Quick wins:");
  if (wins.length === 0) {
    lines.push("- None");
  } else {
    wins.forEach((w) => lines.push(`- ${w.suggestedAction}`));
  }

  return lines.join("\n");
}

async function handleExportMarkdown(res: CompareResponseSuccess | null) {
  if (!res) return;
  try {
    const apiRes = await fetch("/api/defaultanswer/compare/export/markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: res }),
    });
    const data = await apiRes.json();
    if (!data.ok || !data.markdown) return;
    const blob = new Blob([data.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "compare.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // ignore for now
  }
}

async function handleExportPdf(res: CompareResponseSuccess | null) {
  if (!res) return;
  try {
    const apiRes = await fetch("/api/defaultanswer/compare/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: res }),
    });
    if (!apiRes.ok) {
      let msg = `PDF export failed (${apiRes.status})`;
      try {
        const j = await apiRes.json();
        msg = j?.error || msg;
      } catch {
        // ignore parse errors
      }
      alert(msg);
      return;
    }
    const blob = await apiRes.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "compare.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // ignore for now
  }
}

