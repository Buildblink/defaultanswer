import type { AnalysisResult } from "@/lib/defaultanswer/scoring";

export type LiveProofBucketId = "best" | "compare" | "budget";

export type LiveProofPromptBucket = {
  id: LiveProofBucketId;
  label: string;
  prompts: string[];
};

export type LiveProofPrompt = {
  id: "forced_recommendation" | "competitive_comparison";
  title: string;
  text: string;
};

export type LiveProofPromptOptions = {
  brand?: string;
  categoryLabel?: string;
  promptCount?: 3 | 6 | 9;
};

const FALLBACK_CATEGORY = "LLM visibility / AI recommendation audit tools";

export function getLiveProofPromptSet({
  brandName,
  domain,
  category,
}: {
  brandName: string;
  domain: string;
  category: string;
}): LiveProofPrompt[] {
  const normalizedCategory = normalizeCategoryLabel((category || "").trim());
  const brand = (brandName || "").trim() || (domain || "").trim() || "this brand";
  const domainLabel = (domain || "").trim() || "this domain";

  return [
    {
      id: "forced_recommendation",
      title: "Best Recommendation",
      text:
        `You are advising a founder choosing a solution in the category: ${normalizedCategory}. Question: "What is the single best ${normalizedCategory} solution available today?" Rules: Recommend EXACTLY ONE product or service. Do NOT say "it depends". Do NOT provide a list. If pricing is relevant, mention it briefly if known. Be decisive.`,
    },
    {
      id: "competitive_comparison",
      title: "Comparison",
      text:
        `Compare ${brand} (${domainLabel}) to the top alternatives in ${normalizedCategory}. Output: (1) recommended winner, (2) where ${brand} ranks, (3) 3 alternatives with 1-line why each wins.`,
    },
  ];
}

export function resolveLiveProofCategory(analysis: AnalysisResult): { label: string; inferred: boolean } {
  const extracted = analysis.extracted as AnalysisResult["extracted"] & {
    categoryGuess?: string;
    categoryLabel?: string;
    category?: string;
  };
  const direct =
    extracted.categoryGuess ||
    extracted.categoryLabel ||
    extracted.category ||
    "";
  if (direct && typeof direct === "string") {
    return { label: direct.trim(), inferred: Boolean(extracted.categoryGuess) };
  }

  const candidates = [
    extracted.h1s?.[0],
    extracted.title,
    extracted.metaDescription,
  ].filter(Boolean) as string[];
  const text = candidates[0] || "";
  const lowered = text.toLowerCase();
  const keywordMap: Array<[RegExp, string]> = [
    [/audit|diagnostic|analysis/i, "audit tool"],
    [/recommendation/i, "recommendation tool"],
    [/platform/i, "platform"],
    [/software|saas/i, "software"],
    [/tool/i, "tool"],
    [/service/i, "service"],
    [/agency/i, "agency"],
    [/analytics/i, "analytics platform"],
    [/automation/i, "automation platform"],
    [/marketing/i, "marketing platform"],
  ];

  for (const [re, label] of keywordMap) {
    if (re.test(lowered)) {
      return { label, inferred: true };
    }
  }

  return { label: FALLBACK_CATEGORY, inferred: true };
}

export function buildLiveProofPromptBuckets(options: LiveProofPromptOptions): LiveProofPromptBucket[] {
  const count = options.promptCount === 3 || options.promptCount === 9 ? options.promptCount : 6;
  const perBucket = count === 3 ? 1 : count === 6 ? 2 : 3;
  const brand = (options.brand || "").trim();
  const categoryRaw = (options.categoryLabel || "").trim();
  const category = normalizeCategoryLabel(categoryRaw);
  const compareTarget = brand ? brand : `a leading ${category}`;

  const bestTemplates = [
    `List the top 5 ${category} tools. 1 sentence each; include pricing if known; include at least 2 alternatives.`,
    `Rank the top 5 ${category} platforms. 1 sentence each; include pricing if known; include at least 2 alternatives.`,
    `Best ${category} tools right now: top 5, 1 sentence each, pricing if known, include at least 2 alternatives.`,
  ];

  const compareTemplates = [
    `Compare the top 5 ${category} tools. 1 sentence each; include pricing if known; include at least 2 alternatives.`,
    `List 5 alternatives to ${compareTarget}. 1 sentence each; include pricing if known; include at least 2 alternatives.`,
    `Top ${category} alternatives to ${compareTarget}: list 5 vendors, 1 sentence each, pricing if known.`,
  ];

  const budgetTemplates = [
    `Best budget ${category} tools: top 5, 1 sentence each, pricing if known, include at least 2 alternatives.`,
    `Cheapest ${category} options: list 5 vendors, 1 sentence each, pricing if known.`,
    `Most affordable ${category} platforms: top 5, 1 sentence each, pricing if known.`,
  ];

  return [
    {
      id: "best",
      label: "Best tool",
      prompts: bestTemplates.slice(0, perBucket),
    },
    {
      id: "compare",
      label: "Compare / alternatives",
      prompts: compareTemplates.slice(0, perBucket),
    },
    {
      id: "budget",
      label: "Budget / pricing",
      prompts: budgetTemplates.slice(0, perBucket),
    },
  ];
}

export function flattenPromptBuckets(buckets: LiveProofPromptBucket[]): string[] {
  return buckets.flatMap((bucket) => bucket.prompts);
}

function normalizeCategoryLabel(label: string): string {
  if (!label) return FALLBACK_CATEGORY;
  if (/^(solution|service|tool|platform)$/i.test(label)) {
    return FALLBACK_CATEGORY;
  }
  return label;
}
