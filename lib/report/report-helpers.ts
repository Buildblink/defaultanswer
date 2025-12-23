import type { AnalysisResult, AnalysisStatus, BreakdownItem } from "@/lib/defaultanswer/scoring";

export type CompetitiveDeltaBullet = {
  query: string;
  competitorAdvantage: string;
  whyLose: string;
};

export function getAnalysisStatus(analysis: AnalysisResult): AnalysisStatus {
  return analysis.analysisStatus ?? (analysis.score < 0 ? "error" : "ok");
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  if (score >= 0) return "text-red-500";
  return "text-stone-400";
}

export function groupByCategory(breakdown: BreakdownItem[]): Array<[string, BreakdownItem[]]> {
  const map = new Map<string, BreakdownItem[]>();
  for (const item of breakdown || []) {
    const category = item.category || "Other";
    const existing = map.get(category);
    if (existing) {
      existing.push(item);
    } else {
      map.set(category, [item]);
    }
  }
  return Array.from(map.entries());
}

type ReadinessLevel = "strong" | "emerging" | "not-candidate";

export function getReadinessClassification(
  analysis: AnalysisResult,
  hasAnalysis: boolean,
  status: AnalysisStatus
): { level: ReadinessLevel; label: string; explanation: string } {
  if (!hasAnalysis) {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation: "Analysis pending. AI confidence cannot be established until I can retrieve your homepage snapshot.",
    };
  }

  if (status === "blocked") {
    const statusCode = analysis.fetchDiagnostics?.status;
    const blockedWhy = statusCode ? `HTTP ${statusCode}` : "fetch blocked";
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation: `I could not retrieve your homepage (${blockedWhy}). When content is not retrievable, AI systems avoid recommending it by default.`,
    };
  }

  if (status === "snapshot_incomplete") {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation:
        "Analysis incomplete - the homepage content appears to require JavaScript or is too thin to evaluate reliably.",
    };
  }

  if (status === "error" || analysis.score < 0) {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation:
        "AI lacks sufficient clarity and trust signals to recommend your brand as a default option. Analysis could not be completed reliably.",
    };
  }

  const reasoning = analysis.reasoning || [];
  const score = analysis.score;
  const negativeCount = reasoning.filter((r) => r.impact === "negative").length;

  if (score >= 75 && negativeCount <= 1) {
    return {
      level: "strong",
      label: "Strong Default Candidate",
      explanation: "Your site provides clear signals that allow AI to confidently identify, trust, and recommend your brand.",
    };
  }

  if (score < 50) {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation: "AI lacks sufficient clarity and trust signals to recommend your brand as a default option.",
    };
  }

  return {
    level: "emerging",
    label: "Emerging Option",
    explanation: "AI can understand your brand, but confidence gaps prevent it from consistently recommending you as the default.",
  };
}

export function beliefPrimaryUncertainty(analysis: AnalysisResult, status: AnalysisStatus): string {
  if (status === "blocked") {
    return "I could not retrieve your homepage content.";
  }
  if (status === "snapshot_incomplete") {
    return "The homepage snapshot is incomplete.";
  }
  if (analysis.weaknesses && analysis.weaknesses.length > 0) {
    return analysis.weaknesses[0];
  }
  const gap = biggestGapCategoryFromBreakdown(analysis.breakdown || []);
  return gap === "Other" ? "The remaining gaps are marginal." : `${gap} signals are the main uncertainty.`;
}

export function beliefSupportingSignals(analysis: AnalysisResult): string[] {
  const breakdown = analysis.breakdown || [];
  const positives = breakdown
    .filter((b) => b.points > 0 && b.category !== "Error")
    .map((b) => mapSupportSignal(b.label));
  const unique = uniq(positives);
  if (unique.length > 0) return unique.slice(0, 5);
  const reasoning = (analysis.reasoning || [])
    .filter((r) => r.impact === "positive")
    .map((r) => r.signal);
  return uniq(reasoning).slice(0, 5);
}

export function beliefSummaryText(args: {
  brand: string;
  readinessLabel: string;
  confidenceScore: number;
  supporting: string[];
  primaryUncertainty: string;
  status: AnalysisStatus;
}): string {
  const { brand, supporting, primaryUncertainty, status } = args;
  if (status !== "ok") {
    return `I could not fully assess ${brand} because ${primaryUncertainty.toLowerCase()}`;
  }
  const supportText = supporting.length
    ? `I can retrieve ${supporting.join(" and ")}.`
    : `I can retrieve baseline signals about ${brand}.`;
  const uncertaintyText = primaryUncertainty ? `The primary uncertainty is ${primaryUncertainty}.` : "";
  return `${supportText} ${uncertaintyText}`.trim();
}

export function generateConfidenceDebateBullets(
  analysis: AnalysisResult,
  brandName: string,
  status: AnalysisStatus
): string[] {
  if (status === "blocked") {
    return [
      "I could not retrieve the homepage, so I cannot verify default-answer signals.",
      `Until content is accessible, I cannot recommend ${brandName} by default.`,
    ];
  }
  if (status === "snapshot_incomplete") {
    return [
      "The HTML snapshot is incomplete, so key answers may be missing.",
      "AI systems require retrievable answers, not inferred ones.",
    ];
  }

  const weaknesses = (analysis.weaknesses || []).filter(Boolean);
  if (weaknesses.length > 0) {
    return weaknesses.slice(0, 5);
  }

  const negatives = (analysis.reasoning || [])
    .filter((r) => r.impact === "negative")
    .map((r) => compactSentence(r.interpretation));
  if (negatives.length > 0) {
    return negatives.slice(0, 5);
  }

  return ["No major gaps were detected in this snapshot."];
}

export function buildCompetitiveDeltaBullets(
  analysis: AnalysisResult,
  brandName: string
): CompetitiveDeltaBullet[] {
  const breakdown = analysis.breakdown || [];
  const byCategory = new Map<string, { points: number; max: number }>();

  for (const item of breakdown) {
    const category = item.category || "Other";
    if (category === "Error") continue;
    const current = byCategory.get(category) || { points: 0, max: 0 };
    current.points += item.points;
    current.max += item.max;
    byCategory.set(category, current);
  }

  const ranked = Array.from(byCategory.entries())
    .filter(([, v]) => v.max > 0)
    .sort((a, b) => a[1].points / a[1].max - b[1].points / b[1].max)
    .slice(0, 2)
    .map(([category]) => category);

  const templates: Record<string, CompetitiveDeltaBullet> = {
    "Entity Clarity": {
      query: `What is ${brandName}?`,
      competitorAdvantage: "state their category and value clearly in titles and headings",
      whyLose: "your entity definition is less explicit in this snapshot",
    },
    "Answerability Signals": {
      query: `How does ${brandName} work?`,
      competitorAdvantage: "publish direct FAQ-style answers that can be retrieved",
      whyLose: "direct answers are missing or indirect",
    },
    "Structural Comprehension": {
      query: `What features does ${brandName} offer?`,
      competitorAdvantage: "use clear section structure for features, use cases, and benefits",
      whyLose: "your structure is thinner or less explicit",
    },
    "Trust & Legitimacy": {
      query: `Is ${brandName} trustworthy?`,
      competitorAdvantage: "show verifiable about and contact information",
      whyLose: "trust signals are weaker or harder to verify",
    },
    "Commercial Clarity": {
      query: `How much does ${brandName} cost?`,
      competitorAdvantage: "show pricing or plan details clearly",
      whyLose: "commercial terms are unclear in this snapshot",
    },
  };

  const bullets = ranked
    .map((category) => templates[category])
    .filter(Boolean);

  return bullets.length >= 2 ? bullets : [];
}

export function safeHostname(value: string): string {
  if (!value) return "";
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

export function biggestGapCategoryFromBreakdown(breakdown: BreakdownItem[]): string {
  if (!breakdown || breakdown.length === 0) return "Other";
  const by: Record<string, { points: number; max: number }> = {};
  for (const item of breakdown) {
    const cat = item.category || "Other";
    if (cat === "Error") continue;
    if (!by[cat]) by[cat] = { points: 0, max: 0 };
    by[cat].points += item.points;
    by[cat].max += item.max;
  }
  const entries = Object.entries(by).filter(([, v]) => v.max > 0);
  if (entries.length === 0) return "Other";
  entries.sort((a, b) => a[1].points / a[1].max - b[1].points / b[1].max);
  return entries[0][0];
}

export function mapSupportSignal(label: string): string {
  const map: Record<string, string> = {
    "Title includes brand/entity": "your title makes the entity explicit",
    "Meta description present": "your page summary is explicit",
    "H1 describes product/category": "your primary heading defines what you are",
    "H1 heading present": "a primary heading is present",
    "Multiple H2 headings": "your section structure is retrievable",
    "Headings are descriptive": "your headings are descriptive",
    "FAQ section present": "direct Q&A is retrievable",
    "Schema.org markup": "structured entity data is retrievable",
    "About page linked": "legitimacy context is retrievable",
    "Contact info present": "contact legitimacy is retrievable",
    "Pricing/plans visible": "commercial terms are retrievable",
  };
  return map[label] || label;
}

export function compactSentence(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  return t.length > 180 ? `${t.slice(0, 177)}...` : t;
}

export function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const key = (v || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
