import { analyzeUrl } from "./analyze";
import type { AnalysisResult, BreakdownItem, AnalysisStatus } from "./scoring";

export type CompareSide = {
  ok: boolean;
  reportId: string;
  url: string;
  score: number;
  readiness: { label: string; explanation: string };
  breakdown: BreakdownItem[];
  extracted: AnalysisResult["extracted"];
  snapshotQuality?: AnalysisResult["snapshotQuality"];
  analysisStatus?: AnalysisStatus;
  analysis?: AnalysisResult;
  error?: string;
};

export type GapItem = {
  label: string;
  category: string;
  aPoints: number;
  bPoints: number;
  max: number;
  delta: number;
  suggestedAction: string;
};

export type CompareDiff = {
  scoreDelta: number;
  categoryDeltas: Array<{ category: string; aPoints: number; bPoints: number; delta: number }>;
  biggestGaps: GapItem[];
  quickWins: GapItem[];
};

export type CompareResponseSuccess = {
  ok: true;
  a: CompareSide;
  b: CompareSide;
  diff: CompareDiff;
};

export type CompareResponse =
  | CompareResponseSuccess
  | { ok: false; error: string; a?: CompareSide; b?: CompareSide };

export async function runCompare(
  urlA: string,
  urlB: string
): Promise<CompareResponse> {
  const reportA = crypto.randomUUID();
  const reportB = crypto.randomUUID();

  const resA = await analyzeUrl(urlA);
  const resB = await analyzeUrl(urlB);

  const sideA = buildSide(resA.analysis, urlA, reportA, resA.fallback ? resA.notes : undefined);
  const sideB = buildSide(resB.analysis, urlB, reportB, resB.fallback ? resB.notes : undefined);

  const bothOk = sideA.ok && sideB.ok;
  if (!bothOk) {
    return { ok: false, error: "Comparison incomplete", a: sideA, b: sideB };
  }

  const diff = computeDiff(sideA, sideB);
  return { ok: true, a: sideA, b: sideB, diff };
}

function buildSide(
  analysis: AnalysisResult,
  url: string,
  reportId: string,
  error?: string
): CompareSide {
  const status = analysis.analysisStatus ?? (analysis.score < 0 ? "error" : "ok");
  const readiness = getReadinessClassification(analysis, true, status);

  return {
    ok: status === "ok",
    reportId,
    url,
    score: analysis.score,
    readiness: { label: readiness.label, explanation: readiness.explanation },
    breakdown: analysis.breakdown || [],
    extracted: analysis.extracted,
    snapshotQuality: analysis.snapshotQuality,
    analysisStatus: status,
    error,
  };
}

function computeDiff(a: CompareSide, b: CompareSide): CompareDiff {
  const scoreDelta = b.score - a.score;
  const categoryDeltas = computeCategoryDeltas(a.breakdown, b.breakdown);
  const gapItems = computeGapItems(a.breakdown, b.breakdown);
  const biggestGaps = gapItems.slice(0, 5);
  const quickWins = gapItems.filter((g) => g.suggestedAction !== "—" && g.delta > 0).slice(0, 5);

  return {
    scoreDelta,
    categoryDeltas,
    biggestGaps,
    quickWins,
  };
}

function computeCategoryDeltas(a: BreakdownItem[], b: BreakdownItem[]) {
  const totalsA = sumByCategory(a);
  const totalsB = sumByCategory(b);
  const categories = Array.from(new Set([...Object.keys(totalsA), ...Object.keys(totalsB)]));

  return categories.map((cat) => {
    const aPoints = totalsA[cat] ?? 0;
    const bPoints = totalsB[cat] ?? 0;
    return { category: cat, aPoints, bPoints, delta: bPoints - aPoints };
  });
}

function computeGapItems(a: BreakdownItem[], b: BreakdownItem[]): GapItem[] {
  const mapA = toBreakdownMap(a);
  const mapB = toBreakdownMap(b);
  const keys = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)]));

  const gaps: GapItem[] = keys.map((key) => {
    const [category, label] = key.split("::");
    const aItem = mapA[key];
    const bItem = mapB[key];
    const aPoints = aItem?.points ?? 0;
    const bPoints = bItem?.points ?? 0;
    const max = aItem?.max ?? bItem?.max ?? 0;
    const delta = bPoints - aPoints;
    return {
      label,
      category,
      aPoints,
      bPoints,
      max,
      delta,
      suggestedAction: mapSuggestedAction(label),
    };
  });

  return gaps.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

function sumByCategory(items: BreakdownItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const cat = item.category || "Other";
    acc[cat] = (acc[cat] ?? 0) + (item.points ?? 0);
    return acc;
  }, {});
}

function toBreakdownMap(items: BreakdownItem[]): Record<string, BreakdownItem> {
  return items.reduce<Record<string, BreakdownItem>>((acc, item) => {
    const key = `${item.category}::${item.label}`;
    acc[key] = item;
    return acc;
  }, {});
}

function mapSuggestedAction(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("faq")) {
    return "Add an FAQ section with 5–7 Q&A blocks on the homepage or a linked /faq page.";
  }
  if (lower.includes("schema")) {
    return "Add JSON-LD (Organization + Product/SoftwareApplication) and validate with Google Rich Results.";
  }
  if (lower.includes("contact")) {
    return "Add a clear Contact page + email/support link in header/footer.";
  }
  if (lower.includes("about")) {
    return "Add About/Company page link in main nav/footer.";
  }
  if (lower.includes("pricing")) {
    return "Add a visible Pricing/Plans section or /pricing page with clear plan text.";
  }
  return "—";
}

type ReadinessLevel = "strong" | "emerging" | "not-candidate";

function getReadinessClassification(
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
        "Analysis incomplete — the homepage content appears to require JavaScript or is too thin to evaluate reliably.",
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

