import type { ExtractedData, FixPlanItem } from "@/lib/defaultanswer/scoring";

type TopFixContext = {
  score: number;
  extracted: Pick<
    ExtractedData,
    | "hasFAQ"
    | "hasSchema"
    | "hasSchemaJsonLd"
    | "hasIndirectFAQ"
    | "hasDirectAnswerBlock"
    | "hasAbout"
    | "hasContactSignals"
    | "h2s"
    | "h3s"
  >;
};

const FAQ_ACTION_RE = /faq section/i;

/**
 * V1.6.1 Top-fix selection (recommendation-only, no scoring changes).
 *
 * Goal: For high-scoring sites (score >= 75), avoid defaulting to an FAQ recommendation
 * unless the site is missing multiple answerability signals:
 *   - missing FAQ
 *   - missing schema
 *   - missing clear "How it works" content (in headings)
 */
export function selectTopFix(
  fixPlan: FixPlanItem[] | undefined,
  ctx: TopFixContext,
  opts?: { disallowFaq?: boolean }
): FixPlanItem | null {
  if (!fixPlan || fixPlan.length === 0) return null;

  const sorted = prioritizeFixPlan(fixPlan);
  const first = sorted[0];
  if (!first) return null;

  // If FAQ is explicitly disallowed (retrieval-optimization gate), skip it.
  if (opts?.disallowFaq && isFaqFix(first.action)) {
    const nextNonFaq = sorted.find((f) => !isFaqFix(f.action));
    if (nextNonFaq) return nextNonFaq;
    return null;
  }

  // Apply FAQ diversification rule only for high scores
  if (ctx.score >= 75 && isFaqFix(first.action)) {
    const allowFaq = shouldAllowFaqAsTopFix(ctx.score, ctx.extracted);

    if (!allowFaq) {
      const nextBest = sorted.find((f) => !isFaqFix(f.action));
      return nextBest || null; // silent fallback if everything is FAQ
    }
  }

  return first;
}

export type WhatToFixFirstDecision =
  | { kind: "topFix"; fix: FixPlanItem; retrievalOptimization?: boolean; downgradedFaq?: boolean }
  | { kind: "noCriticalFixes"; retrievalOptimization?: boolean; downgradedFaq?: boolean }
  | { kind: "none" };

/**
 * V1.6.2:
 * If score >= 78 AND readiness === "Strong Default Candidate" AND no HIGH priority fixes exist,
 * suppress "What to Fix First" and instead show "No Critical Fixes Detected".
 */
export function decideWhatToFixFirst(params: {
  fixPlan: FixPlanItem[] | undefined;
  score: number;
  readinessLabel: string;
  extracted: Pick<
    ExtractedData,
    | "hasFAQ"
    | "hasSchema"
    | "hasSchemaJsonLd"
    | "hasIndirectFAQ"
    | "hasDirectAnswerBlock"
    | "hasAbout"
    | "hasContactSignals"
    | "h2s"
    | "h3s"
  >;
}): WhatToFixFirstDecision {
  const { fixPlan, score, readinessLabel, extracted } = params;

  if (!fixPlan || fixPlan.length === 0) return { kind: "none" };

  const isBlocked = score < 0;
  if (isBlocked) {
    const access = fixPlan.find(
      (f) =>
        (f.action || "").trim() ===
        "Ensure your site is publicly accessible and not blocking automated requests."
    );
    return access ? { kind: "topFix", fix: access } : { kind: "none" };
  }

  const deduped = dedupeFixPlanByIntent(fixPlan);
  const faqDowngradeApplies = shouldDowngradeFaqForStrongCandidate({
    score,
    readinessLabel,
    extracted,
  });
  const { fixes: adjustedFixes, downgradedFaq } = faqDowngradeApplies
    ? downgradeFaqForRetrievalOptimization(deduped)
    : { fixes: deduped, downgradedFaq: false };

  // V1.6.2 "No Critical Fix" logic:
  // Treat high-priority FAQ as non-critical for strong sites unless it is strongly justified
  // (missing FAQ + schema + How it works).
  const hasCriticalHigh = adjustedFixes.some((f) => {
    if (f.priority !== "high") return false;
    if (!isFaqFix(f.action)) return true;
    return shouldAllowFaqAsTopFix(score, extracted);
  });

  if (faqDowngradeApplies && !hasCriticalHigh) {
    return { kind: "noCriticalFixes", retrievalOptimization: true, downgradedFaq: true };
  }

  if (score >= 82 && readinessLabel === "Strong Default Candidate" && !hasCriticalHigh) {
    return { kind: "noCriticalFixes", retrievalOptimization: faqDowngradeApplies, downgradedFaq };
  }

  const top = selectTopFix(adjustedFixes, { score, extracted }, { disallowFaq: faqDowngradeApplies });
  if (!top) return { kind: "none" };

  return { kind: "topFix", fix: top, retrievalOptimization: faqDowngradeApplies, downgradedFaq };
}

export function hasHowItWorksHeading(h2s: string[], h3s: string[]): boolean {
  const re = /how\s+it\s+works?/i;
  return [...(h2s || []), ...(h3s || [])].some((h) => re.test(h));
}

function isFaqFix(action: string): boolean {
  return FAQ_ACTION_RE.test(action || "");
}

function shouldAllowFaqAsTopFix(
  score: number,
  extracted: Pick<ExtractedData, "hasFAQ" | "hasSchema" | "h2s" | "h3s">
): boolean {
  // Only gate FAQ when score is already high; otherwise FAQ remains a reasonable foundational fix.
  if (score < 75) return true;

  const missingFaq = !extracted.hasFAQ;
  const missingSchema = !extracted.hasSchema;
  const missingHowItWorks = !hasHowItWorksHeading(extracted.h2s, extracted.h3s);

  // Require multiple answerability gaps before allowing FAQ to dominate the recommendation.
  return missingFaq && missingSchema && missingHowItWorks;
}

function prioritizeFixPlan(fixPlan: FixPlanItem[]): FixPlanItem[] {
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...fixPlan].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}

export function dedupeFixPlanByIntent(fixPlan: FixPlanItem[]): FixPlanItem[] {
  const items = [...fixPlan];

  const hasAddH1 = items.some((i) => /add an h1\b/i.test(i.action));
  const hasRewriteH1 = items.some((i) => /rewrite your h1\b/i.test(i.action));

  // Rule: if "Add H1" exists, drop "Rewrite H1"
  let filtered = items.filter((i) => {
    if (hasAddH1 && /rewrite your h1\b/i.test(i.action)) return false;
    return true;
  });

  // Rule: if H1 exists but weak, keep only rewrite (already implied by absence of add)
  // (No-op here; generation decides which exists.)

  // Deduplicate by intent key
  const seen = new Set<string>();
  const out: FixPlanItem[] = [];
  for (const i of filtered) {
    const key = intentKey(i.action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }

  // Stable order: HIGH -> MEDIUM -> LOW (preserving original order within priority)
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}

function intentKey(action: string): string {
  const a = (action || "").toLowerCase();
  if (a.includes("publicly accessible") || a.includes("blocking automated")) return "access";
  if (a.includes("add an h1")) return "h1_add";
  if (a.includes("rewrite your h1")) return "h1_rewrite";
  if (a.includes("title tag")) return "title";
  if (a.includes("meta description")) return "meta";
  if (a.includes("faq")) return "faq";
  if (a.includes("schema.org")) return "schema";
  if (a.includes("about page")) return "about";
  if (a.includes("contact page") || a.includes("email address")) return "contact";
  if (a.includes("pricing")) return "pricing";
  if (a.includes("h2")) return "h2";
  if (a.includes("generic headings") || a.includes("headings")) return "headings";
  return a.replace(/[^a-z0-9]+/g, " ").trim();
}

function shouldDowngradeFaqForStrongCandidate(params: {
  score: number;
  readinessLabel: string;
  extracted: Pick<
    ExtractedData,
    | "hasSchemaJsonLd"
    | "hasAbout"
    | "hasContactSignals"
    | "hasIndirectFAQ"
    | "hasDirectAnswerBlock"
    | "hasSchema"
    | "hasFAQ"
    | "h2s"
    | "h3s"
  >;
}): boolean {
  const { score, readinessLabel, extracted } = params;
  if (readinessLabel !== "Strong Default Candidate") return false;
  if (score < 82) return false;

  const hasTrustOrEntity =
    extracted.hasSchemaJsonLd === true || (extracted.hasAbout === true && extracted.hasContactSignals === true);
  const hasFaqSignals = extracted.hasIndirectFAQ === true || extracted.hasDirectAnswerBlock === true;

  return hasTrustOrEntity && hasFaqSignals;
}

function downgradeFaqForRetrievalOptimization(fixPlan: FixPlanItem[]): { fixes: FixPlanItem[]; downgradedFaq: boolean } {
  let downgraded = false;
  const fixes: FixPlanItem[] = fixPlan.map((f): FixPlanItem => {
    if (!isFaqFix(f.action)) return f;
    downgraded = downgraded || f.priority === "high";
    return {
      ...f,
      priority: "medium",
      action: f.action.includes("Retrieval Optimization") ? f.action : `[Retrieval Optimization] ${f.action}`,
    };
  });
  return { fixes, downgradedFaq: downgraded };
}


