import type { AnalysisResult, BreakdownItem } from "@/lib/defaultanswer/scoring";
import {
  biggestGapCategoryFromBreakdown,
  compactSentence,
  getAnalysisStatus,
  getReadinessClassification,
  uniq,
} from "@/lib/report/report-helpers";
import { buildLiveProofPromptBuckets, resolveLiveProofCategory } from "@/lib/report/liveproof-prompts";

export type ReportV2 = {
  aiProof: {
    prompt: string;
    response: string;
    recommended: string[];
    mentionsYou: boolean;
    skipReason?: string;
    soWhat: string;
    verdict: "would-mention" | "would-skip";
    confidence: number;
    primaryBlocker: string;
    modelLabel: string;
  }[];
  reasoning: {
    steps: string[];
    confidenceBreakdown: string[];
  };
  retrieveVsInfer: {
    retrievable: string[];
    inferred: string[];
    explanation: string;
  };
  competitiveSnapshot: {
    rows: {
      label: string;
      answerClarity: "Low" | "Medium" | "High";
      commercialClarity: "Low" | "Medium" | "High";
      justificationEase: "Low" | "Medium" | "High";
      note: string;
    }[];
  };
  promptRadar: {
    winnableNow: { prompt: string; reason: string }[];
    oneFixAway: { prompt: string; reason: string }[];
    blocked: { prompt: string; reason: string }[];
  };
  implementationExamples: {
    faqs: { q: string; a: string }[];
    schemaSnippetJson: Record<string, unknown>;
    pricingClarity: { before: string; after: string };
  };
  quoteReady: { label: string; copy: string; placement: string; why: string }[];
  coverage: {
    overall: number;
    structure: number;
    answer: number;
    entity: number;
    commercial: number;
    nextMove: string;
  };
  rightNow: {
    recommended: string[];
    skipped: string[];
    reason: string;
  };
  sharePack: {
    execSummary: string;
    quotePack: string;
    fixChecklist: string;
  };
  citationReadiness: {
    citableSentences: string[];
    whyCitable: string[];
  };
};

type CategoryScore = { points: number; max: number };

export type ReportV2Options = {
  maxBullets?: number;
  promptCountPerBucket?: number;
  includeSimulatedAiProof?: boolean;
  includeCitationReadiness?: boolean;
  includeImplementationExamples?: boolean;
  includeQuoteReady?: boolean;
};

const DEFAULT_OPTIONS: Required<ReportV2Options> = {
  maxBullets: 6,
  promptCountPerBucket: 3,
  includeSimulatedAiProof: true,
  includeCitationReadiness: true,
  includeImplementationExamples: true,
  includeQuoteReady: true,
};

export function buildReportV2(analysis: AnalysisResult, opts?: ReportV2Options): ReportV2 {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const extracted = analysis.extracted;
  const brand = extracted.brandGuess || extracted.domain || "this site";
  const domain = extracted.domain || "";
  const status = analysis.analysisStatus ?? (analysis.score < 0 ? "error" : "ok");

  const categoryInfo = deriveCategory(analysis);
  const categoryLabel = categoryInfo.category;
  const categoryNote = categoryInfo.inferred ? "Category inferred from on-page headings." : "";
  const liveProofCategory = resolveLiveProofCategory(analysis);
  const liveProofBuckets = buildLiveProofPromptBuckets({
    brand,
    categoryLabel: liveProofCategory.label,
    promptCount: 3,
  });
  const liveProofPrompts = liveProofBuckets.map((bucket) => bucket.prompts[0]).filter(Boolean);

  const categoryScores = buildCategoryScores(analysis.breakdown || []);
  const entityLevel = levelFromPercent(categoryScores["Entity Clarity"]);
  const answerLevel = levelFromPercent(categoryScores["Answerability Signals"]);
  const trustLevel = levelFromPercent(categoryScores["Trust & Legitimacy"]);
  const commercialLevel = levelFromPercent(categoryScores["Commercial Clarity"]);

  const strengths = buildStrengthSignals(analysis);
  const primaryGapCategory = biggestGapCategoryFromBreakdown(analysis.breakdown || []);
  const skipReason = buildSkipReason(primaryGapCategory, status);
  const soWhat = buildSoWhat(primaryGapCategory, status);

  const mentionsYou =
    status === "ok" &&
    analysis.score >= 75 &&
    entityLevel !== "Low" &&
    trustLevel !== "Low";

  const recommendedArchetypes = uniq([
    !extracted.hasPricing ? "A competitor with clear pricing and plan names" : "",
    !extracted.hasFAQ && !extracted.hasDirectAnswerBlock
      ? "A competitor with a visible FAQ and direct answers"
      : "",
    !extracted.hasSchemaJsonLd ? "A competitor with structured entity markup" : "",
    !extracted.hasContactSignals || !extracted.hasAbout
      ? "A competitor with visible about and contact information"
      : "",
    extracted.h2s.length < 3 ? "A competitor with structured, descriptive sections" : "",
    "A category leader with explicit definitions and examples",
  ]).slice(0, 4);

  const coverage = buildCoverage(analysis);
  const aiProof = options.includeSimulatedAiProof
    ? liveProofPrompts.map((prompt, idx) =>
        buildAiProofEntry({
          prompt,
          modelLabel:
            idx === 0
              ? "Simulated ChatGPT-style"
              : idx === 1
              ? "Simulated Claude-style"
              : "Simulated Perplexity-style",
          mentionsYou,
          skipReason,
          soWhat,
          categoryNote,
          brand,
          categoryLabel: liveProofCategory.label || categoryLabel,
          recommended: recommendedArchetypes,
          strengths,
          verdict: buildModelFreeVerdict(analysis, primaryGapCategory, coverage.overall),
          confidence: buildModelFreeConfidence(analysis, categoryInfo.inferred),
          primaryBlocker: buildPrimaryBlocker(primaryGapCategory, coverage.nextMove),
        })
      )
    : [];

  const reasoning = {
    steps: buildReasoningSteps(analysis, categoryLabel).slice(0, 5),
    confidenceBreakdown: buildConfidenceBreakdown(analysis, primaryGapCategory),
  };

  const retrieveVsInfer = {
    retrievable: buildRetrievableSignals(analysis).slice(0, options.maxBullets),
    inferred: buildInferredSignals(analysis).slice(0, options.maxBullets),
    explanation:
      "AI systems cite what they can retrieve directly. Anything that must be inferred lowers confidence and increases the chance of recommending another source.",
  };

  const competitiveSnapshot: ReportV2["competitiveSnapshot"] = {
    rows: [
      {
        label: "You",
        answerClarity: entityLevel,
        commercialClarity: commercialLevel,
        justificationEase: trustLevel,
        note: buildSnapshotNote(entityLevel, answerLevel, trustLevel, commercialLevel),
      },
      {
        label: "Typical AI-preferred alternative",
        answerClarity: "High",
        commercialClarity: "High",
        justificationEase: "High",
        note: "Clear definition, answers, and pricing make them easy to cite.",
      },
      {
        label: "Niche alternative",
        answerClarity: "Medium",
        commercialClarity: "Medium",
        justificationEase: "Medium",
        note: "Mentioned for edge cases, rarely the default recommendation.",
      },
    ],
  };

  const promptRadar = buildPromptRadar({
    brand,
    categoryLabel,
    entityLevel,
    answerLevel,
    trustLevel,
    commercialLevel,
    primaryGapCategory,
    promptCountPerBucket: options.promptCountPerBucket,
  });

  const implementationExamples = options.includeImplementationExamples
    ? {
        faqs: buildFaqExamples(brand, domain, categoryLabel),
        schemaSnippetJson: buildSchemaSnippet(analysis, brand, domain, categoryLabel),
        pricingClarity: buildPricingExamples(),
      }
    : {
        faqs: [],
        schemaSnippetJson: {},
        pricingClarity: { before: "", after: "" },
      };

  const quoteReady = options.includeQuoteReady
    ? buildQuoteReady(analysis, brand, categoryLabel, primaryGapCategory)
    : [];

  const rightNow = buildRightNow(aiProof, coverage, primaryGapCategory);
  const sharePack = buildSharePack(analysis, rightNow, coverage, primaryGapCategory);

  const citationReadiness = options.includeCitationReadiness
    ? {
        citableSentences: buildCitableSentences(analysis, brand, categoryLabel),
        whyCitable: buildWhyCitableSignals(analysis),
      }
    : { citableSentences: [], whyCitable: [] };

  return {
    aiProof,
    reasoning,
    retrieveVsInfer,
    competitiveSnapshot,
    promptRadar,
    implementationExamples,
    quoteReady,
    coverage,
    rightNow,
    sharePack,
    citationReadiness,
  };
}

function buildCategoryScores(breakdown: BreakdownItem[]): Record<string, CategoryScore> {
  const map: Record<string, CategoryScore> = {};
  for (const item of breakdown || []) {
    const category = item.category || "Other";
    if (!map[category]) map[category] = { points: 0, max: 0 };
    map[category].points += item.points;
    map[category].max += item.max;
  }
  return map;
}

function levelFromPercent(score?: CategoryScore): "Low" | "Medium" | "High" {
  if (!score || score.max <= 0) return "Low";
  const ratio = score.points / score.max;
  if (ratio >= 0.75) return "High";
  if (ratio >= 0.45) return "Medium";
  return "Low";
}

function deriveCategory(analysis: AnalysisResult): { category: string; inferred: boolean } {
  const extracted = analysis.extracted as AnalysisResult["extracted"] & { category?: string };
  if (extracted.category) {
    return { category: extracted.category, inferred: false };
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
      return { category: label, inferred: true };
    }
  }

  return { category: "solution", inferred: true };
}

function buildStrengthSignals(analysis: AnalysisResult): string[] {
  const extracted = analysis.extracted;
  const signals = [
    extracted.title ? "a clear title that names the entity" : "",
    extracted.h1s?.[0] ? "a primary heading that defines the offering" : "",
    extracted.hasFAQ || extracted.hasDirectAnswerBlock
      ? "direct answers that are easy to retrieve"
      : "",
    extracted.hasSchemaJsonLd ? "structured data for the entity" : "",
    extracted.hasContactSignals || extracted.hasAbout ? "visible legitimacy signals" : "",
    extracted.hasPricing ? "pricing or plan details" : "",
  ];

  return uniq(signals).filter(Boolean).slice(0, 3);
}

function buildGapSignals(analysis: AnalysisResult): string[] {
  const extracted = analysis.extracted;
  const gaps = [
    !extracted.hasPricing ? "pricing is not visible" : "",
    !extracted.hasFAQ && !extracted.hasDirectAnswerBlock
      ? "direct answers are not explicit"
      : "",
    !extracted.hasSchemaJsonLd ? "structured data is missing" : "",
    !extracted.hasContactSignals ? "contact signals are limited" : "",
    !extracted.hasAbout ? "about/company context is limited" : "",
    extracted.h2s.length < 3 ? "section structure is thin" : "",
  ];
  return uniq(gaps).filter(Boolean).slice(0, 4);
}

function buildSkipReason(primaryGapCategory: string, status: string): string {
  if (status === "blocked") {
    return "the homepage could not be retrieved.";
  }
  if (status === "snapshot_incomplete") {
    return "the snapshot is incomplete.";
  }
  switch (primaryGapCategory) {
    case "Commercial Clarity":
      return "pricing and plan boundaries are unclear.";
    case "Answerability Signals":
      return "direct answers are missing or indirect.";
    case "Trust & Legitimacy":
      return "trust and legitimacy signals are hard to verify.";
    case "Structural Comprehension":
      return "the structure is thin and hard to parse.";
    case "Entity Clarity":
      return "the entity definition is not explicit.";
    default:
      return "the remaining signals are not explicit enough.";
  }
}

function buildSoWhat(primaryGapCategory: string, status: string): string {
  if (status === "blocked") {
    return "This prompt is lost because the homepage could not be retrieved.";
  }
  if (status === "snapshot_incomplete") {
    return "This prompt is lost because the snapshot is incomplete.";
  }
  switch (primaryGapCategory) {
    case "Commercial Clarity":
      return "This prompt is lost because pricing is unclear.";
    case "Answerability Signals":
      return "This prompt is lost because direct answers are missing.";
    case "Trust & Legitimacy":
      return "This prompt is lost because trust signals are thin.";
    case "Structural Comprehension":
      return "This prompt is lost because structure is hard to parse.";
    case "Entity Clarity":
      return "This prompt is lost because the entity definition is unclear.";
    default:
      return "This prompt is lost because key signals are not explicit.";
  }
}

function buildAiProofEntry(params: {
  prompt: string;
  response?: string;
  recommended: string[];
  mentionsYou: boolean;
  skipReason?: string;
  soWhat: string;
  verdict: "would-mention" | "would-skip";
  confidence: number;
  primaryBlocker: string;
  modelLabel: string;
  brand: string;
  categoryLabel: string;
  categoryNote: string;
  strengths: string[];
}): ReportV2["aiProof"][number] {
  const strengthNote =
    params.strengths.length > 0
      ? `I can retrieve ${params.strengths.join(", ")}.`
      : "I can retrieve baseline category signals.";
  const mentionLine = params.mentionsYou
    ? `${params.brand} is included because the signals are explicit and retrievable.`
    : `${params.brand} is not mentioned because ${params.skipReason || "key signals are unclear."}`;
  const response = `Simulated response: For ${params.categoryLabel} queries, I would highlight ${params.recommended.join(
    ", "
  )}. ${strengthNote} ${mentionLine} ${params.categoryNote}`.trim();

  return {
    prompt: params.prompt,
    response,
    recommended: params.recommended,
    mentionsYou: params.mentionsYou,
    skipReason: params.mentionsYou ? undefined : params.skipReason,
    soWhat: params.soWhat,
    verdict: params.verdict,
    confidence: params.confidence,
    primaryBlocker: params.primaryBlocker,
    modelLabel: params.modelLabel,
  };
}

function buildReasoningSteps(analysis: AnalysisResult, categoryLabel: string): string[] {
  const extracted = analysis.extracted;
  const steps = [
    extracted.title || extracted.h1s?.[0]
      ? "Identify the entity and category from the title and H1."
      : "Entity and category definition is unclear from the snapshot.",
    extracted.hasFAQ || extracted.hasDirectAnswerBlock
      ? "Check direct answerability signals (FAQ or how-it-works sections)."
      : "Check for direct answerability signals (FAQ or how-it-works).",
    extracted.hasContactSignals || extracted.hasAbout
      ? "Verify legitimacy signals (about and contact context)."
      : "Look for legitimacy signals (about and contact context).",
    extracted.hasPricing
      ? "Confirm commercial clarity (pricing or plan context)."
      : "Assess whether pricing and plan boundaries are explicit.",
    `Decide whether ${categoryLabel} queries can be answered without inference.`,
  ];

  return steps.slice(0, 6);
}

function buildConfidenceBreakdown(analysis: AnalysisResult, primaryGapCategory: string): string[] {
  const gaps = buildGapSignals(analysis);
  const first =
    primaryGapCategory === "Other"
      ? "Remaining gaps are marginal but still add uncertainty."
      : `${primaryGapCategory} signals are the primary hesitation.`;
  const second =
    gaps.find((g) => g && !g.includes(primaryGapCategory)) ||
    "AI systems avoid sources that require guessing.";
  return [first, compactSentence(second)];
}

function buildRetrievableSignals(analysis: AnalysisResult): string[] {
  const extracted = analysis.extracted;
  const signals = [
    extracted.title ? `Title: ${shorten(extracted.title, 110)}` : "",
    extracted.h1s?.[0] ? `H1: ${shorten(extracted.h1s[0], 110)}` : "",
    extracted.hasFAQ ? "FAQ section with direct answers" : "",
    extracted.hasDirectAnswerBlock ? "Direct answer or how-it-works block" : "",
    extracted.hasSchemaJsonLd
      ? `Structured data${extracted.schemaTypes.length ? ` (${extracted.schemaTypes.join(", ")})` : ""}`
      : "",
    extracted.hasContactSignals ? "Contact signal visible" : "",
    extracted.hasAbout ? "About/company page linked" : "",
    extracted.hasPricing ? "Pricing or plan details visible" : "",
  ];

  return uniq(signals).filter(Boolean).slice(0, 6);
}

function buildInferredSignals(analysis: AnalysisResult): string[] {
  const extracted = analysis.extracted;
  const inferred = [
    !extracted.hasPricing ? "Pricing and plan boundaries" : "",
    !extracted.h1s?.[0] && !extracted.title ? "Category definition" : "",
    !extracted.hasFAQ && !extracted.hasDirectAnswerBlock ? "Audience and use-case fit" : "",
    extracted.h2s.length < 3 ? "Feature scope and coverage" : "",
  ];
  return uniq(inferred).filter(Boolean).slice(0, 6);
}

function buildSnapshotNote(
  entity: "Low" | "Medium" | "High",
  answer: "Low" | "Medium" | "High",
  trust: "Low" | "Medium" | "High",
  commercial: "Low" | "Medium" | "High"
): string {
  const notes = [
    entity === "Low" ? "entity definition is unclear" : "",
    answer === "Low" ? "direct answers are thin" : "",
    trust === "Low" ? "trust signals are limited" : "",
    commercial === "Low" ? "pricing boundaries are unclear" : "",
  ].filter(Boolean);

  if (notes.length === 0) {
    return "Signals are clear enough for default recommendation consideration.";
  }

  return `Gaps: ${notes.join(", ")}.`;
}

function buildPromptRadar(args: {
  brand: string;
  categoryLabel: string;
  entityLevel: "Low" | "Medium" | "High";
  answerLevel: "Low" | "Medium" | "High";
  trustLevel: "Low" | "Medium" | "High";
  commercialLevel: "Low" | "Medium" | "High";
  primaryGapCategory: string;
  promptCountPerBucket: number;
}): ReportV2["promptRadar"] {
  const winnableNow: ReportV2["promptRadar"]["winnableNow"] = [];
  const oneFixAway: ReportV2["promptRadar"]["oneFixAway"] = [];
  const blocked: ReportV2["promptRadar"]["blocked"] = [];

  if (args.entityLevel === "High") {
    winnableNow.push({
      prompt: `What is ${args.brand}?`,
      reason: "Entity clarity is explicit in the title and H1.",
    });
  }
  if (args.answerLevel !== "Low") {
    winnableNow.push({
      prompt: `How does ${args.brand} work?`,
      reason: "Direct answers or structure are present.",
    });
  }
  if (args.trustLevel === "High") {
    winnableNow.push({
      prompt: `Is ${args.brand} trustworthy?`,
      reason: "Legitimacy signals are visible.",
    });
  }

  if (args.primaryGapCategory === "Commercial Clarity") {
    oneFixAway.push({
      prompt: `Which ${args.categoryLabel} has transparent pricing?`,
      reason: "Pricing clarity would unlock commercial comparison queries.",
    });
  } else if (args.primaryGapCategory === "Answerability Signals") {
    oneFixAway.push({
      prompt: `What questions does ${args.brand} answer?`,
      reason: "Direct answers would increase answerability confidence.",
    });
  } else if (args.primaryGapCategory === "Trust & Legitimacy") {
    oneFixAway.push({
      prompt: `Who runs ${args.brand}?`,
      reason: "Ownership and contact clarity improve citation safety.",
    });
  } else if (args.primaryGapCategory === "Entity Clarity") {
    oneFixAway.push({
      prompt: `What category does ${args.brand} belong to?`,
      reason: "Explicit category language removes ambiguity.",
    });
  } else {
    oneFixAway.push({
      prompt: `Compare ${args.brand} to other ${args.categoryLabel} options`,
      reason: "One clearer signal would raise comparison confidence.",
    });
  }

  if (args.commercialLevel === "Low") {
    blocked.push({
      prompt: `Which ${args.categoryLabel} is the best value?`,
      reason: "Pricing is unclear, so affordability comparisons are blocked.",
    });
  }
  if (args.trustLevel === "Low") {
    blocked.push({
      prompt: `Which ${args.categoryLabel} is safest to recommend?`,
      reason: "Legitimacy signals are limited.",
    });
  }
  if (args.answerLevel === "Low") {
    blocked.push({
      prompt: `What does ${args.brand} do in one sentence?`,
      reason: "Direct answers are not explicit enough.",
    });
  }

  return {
    winnableNow: fillPrompts(
      winnableNow,
      [
        {
          prompt: `What ${args.categoryLabel} do you recommend?`,
          reason: "Category framing is clear enough to be cited.",
        },
        {
          prompt: `What is the best ${args.categoryLabel} for teams?`,
          reason: "Entity definition supports straightforward recommendation.",
        },
        {
          prompt: `Should I consider ${args.brand} for ${args.categoryLabel}?`,
          reason: "Baseline signals are retrievable.",
        },
      ],
      args.promptCountPerBucket
    ),
    oneFixAway: fillPrompts(
      oneFixAway,
      [
        {
          prompt: `Compare ${args.brand} to other ${args.categoryLabel} options`,
          reason: "One clearer signal would unlock comparisons.",
        },
        {
          prompt: `Which ${args.categoryLabel} is easiest to justify?`,
          reason: "Trust clarity would remove hesitation.",
        },
        {
          prompt: `What does ${args.brand} include?`,
          reason: "Pricing and scope clarity would make this answerable.",
        },
      ],
      args.promptCountPerBucket
    ),
    blocked: fillPrompts(
      blocked,
      [
        {
          prompt: `Which ${args.categoryLabel} is safest to recommend?`,
          reason: "Legitimacy signals are limited.",
        },
        {
          prompt: `Which ${args.categoryLabel} is most affordable?`,
          reason: "Pricing boundaries are not explicit.",
        },
        {
          prompt: `What does ${args.brand} do in one sentence?`,
          reason: "Direct, extractable answers are missing.",
        },
      ],
      args.promptCountPerBucket
    ),
  };
}

function buildFaqExamples(
  brand: string,
  domain: string,
  categoryLabel: string
): ReportV2["implementationExamples"]["faqs"] {
  const domainNote = domain ? `on ${domain}` : "on the site";
  return [
    {
      q: `What is ${brand}?`,
      a: `${brand} is a ${categoryLabel} that provides clear, retrievable answers ${domainNote}.`,
    },
    {
      q: `Who is ${brand} for?`,
      a: `${brand} is for teams that need a dependable source to cite in recommendations.`,
    },
    {
      q: `How does ${brand} work?`,
      a: `${brand} analyzes on-page signals and explains what to fix to increase recommendation confidence.`,
    },
  ];
}

function buildSchemaSnippet(
  analysis: AnalysisResult,
  brand: string,
  domain: string,
  categoryLabel: string
): Record<string, unknown> {
  const looksSaaS = isSaaS(analysis);
  const type = looksSaaS ? "SoftwareApplication" : "Service";
  const url = domain ? `https://${domain}` : undefined;
  const base = {
    "@context": "https://schema.org",
    "@type": type,
    name: brand,
    ...(url ? { url } : {}),
  };

  if (type === "SoftwareApplication") {
    return {
      ...base,
      applicationCategory: categoryLabel,
      operatingSystem: "Web",
    };
  }

  return {
    ...base,
    serviceType: categoryLabel,
  };
}

function buildPricingExamples(): { before: string; after: string } {
  return {
    before: "Contact us for pricing.",
    after: "Pricing page with plan names and what's included.",
  };
}

function buildCoverage(analysis: AnalysisResult): ReportV2["coverage"] {
  const extracted = analysis.extracted;
  const structure = scoreStructureCoverage(extracted.h1s.length, extracted.h2s.length);
  const answer = scoreAnswerCoverage(analysis);
  const entity = scoreEntityCoverage(extracted.title, extracted.h1s.length, extracted.hasSchemaJsonLd);
  const commercial = extracted.hasPricing ? 100 : 0;

  // Weights: structure 25%, answer 30%, entity 25%, commercial 20%.
  const overall =
    structure * 0.25 +
    answer * 0.3 +
    entity * 0.25 +
    commercial * 0.2;

  const nextMove = buildCoverageNextMove({ structure, answer, entity, commercial });

  return {
    overall: Math.round(overall),
    structure,
    answer,
    entity,
    commercial,
    nextMove,
  };
}

function scoreStructureCoverage(h1Count: number, h2Count: number): number {
  let score = 0;
  score += h1Count > 0 ? 40 : 0;
  if (h2Count >= 6) score += 60;
  else if (h2Count >= 3) score += 45;
  else if (h2Count >= 1) score += 25;
  return Math.min(100, score);
}

function scoreAnswerCoverage(analysis: AnalysisResult): number {
  const extracted = analysis.extracted;
  const evidenceSnippets = analysis.extracted.evidence?.faqEvidence?.directAnswerSnippets?.length || 0;
  let score = 0;
  if (extracted.hasFAQ) score += 50;
  if (extracted.hasDirectAnswerBlock) score += 30;
  if (evidenceSnippets >= 2) score += 20;
  else if (evidenceSnippets === 1) score += 10;
  return Math.min(100, score);
}

function scoreEntityCoverage(title?: string, h1Count?: number, hasSchema?: boolean): number {
  let score = 0;
  score += title ? 35 : 0;
  score += h1Count && h1Count > 0 ? 35 : 0;
  score += hasSchema ? 30 : 0;
  return Math.min(100, score);
}

function buildCoverageNextMove(scores: {
  structure: number;
  answer: number;
  entity: number;
  commercial: number;
}): string {
  const entries: Array<[keyof typeof scores, number]> = [
    ["structure", scores.structure],
    ["answer", scores.answer],
    ["entity", scores.entity],
    ["commercial", scores.commercial],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  const lowest = entries[0][0];
  switch (lowest) {
    case "structure":
      return "Increase coverage by adding descriptive H2 sections (features, use cases, how it works).";
    case "answer":
      return "Increase coverage by adding direct FAQ-style answers.";
    case "entity":
      return "Increase coverage by stating the category in the title/H1 and adding schema.";
    case "commercial":
      return "Increase coverage by adding a pricing or plans section.";
    default:
      return "Increase coverage by making key signals explicit.";
  }
}

function buildModelFreeVerdict(
  analysis: AnalysisResult,
  primaryGapCategory: string,
  coverageOverall: number
): "would-mention" | "would-skip" {
  const status = analysis.analysisStatus ?? (analysis.score < 0 ? "error" : "ok");
  const blocked = status !== "ok";
  const hasBlockingGap =
    primaryGapCategory === "Answerability Signals" || primaryGapCategory === "Entity Clarity";
  if (!blocked && !hasBlockingGap && coverageOverall >= 70) {
    return "would-mention";
  }
  return "would-skip";
}

function buildModelFreeConfidence(analysis: AnalysisResult, categoryInferred: boolean): number {
  const extracted = analysis.extracted;
  let confidence = 90;
  if (!extracted.hasFAQ) confidence -= 25;
  if (!extracted.hasPricing) confidence -= 20;
  if (!extracted.hasSchemaJsonLd) confidence -= 15;
  if (categoryInferred) confidence -= 10;
  return clamp(confidence, 30, 95);
}

function buildPrimaryBlocker(primaryGapCategory: string, nextMove: string): string {
  if (primaryGapCategory && primaryGapCategory !== "Other") {
    return `${primaryGapCategory} signals are the primary blocker.`;
  }
  return nextMove;
}

function buildRightNow(
  aiProof: ReportV2["aiProof"],
  coverage: ReportV2["coverage"],
  primaryGapCategory: string
): ReportV2["rightNow"] {
  const recommended = aiProof
    .filter((proof) => proof.verdict === "would-mention")
    .map((proof) => proof.prompt)
    .slice(0, 2);
  const skipped = aiProof
    .filter((proof) => proof.verdict === "would-skip")
    .map((proof) => proof.prompt)
    .slice(0, 2);

  const primaryBlocker = aiProof[0]?.primaryBlocker || "";
  const reason = buildRightNowReason(primaryBlocker, coverage.nextMove, primaryGapCategory);

  return { recommended, skipped, reason };
}

function buildSharePack(
  analysis: AnalysisResult,
  rightNow: ReportV2["rightNow"],
  coverage: ReportV2["coverage"],
  primaryGapCategory: string
): ReportV2["sharePack"] {
  const extracted = analysis.extracted;
  const status = getAnalysisStatus(analysis);
  const readiness = getReadinessClassification(analysis, true, status);
  const url = extracted.evaluatedUrl || extracted.canonicalUrl || "";
  const score = analysis.score;
  const topFix = analysis.fixPlan?.[0]?.action || "No critical fix identified.";
  const recommended = rightNow.recommended[0] || "No prompts confidently recommend you yet.";
  const skipped = rightNow.skipped[0] || "No prompts confidently skip you yet.";
  const primaryBlocker = buildPrimaryBlocker(primaryGapCategory, coverage.nextMove);

  const execLines = [
    `URL: ${url || "N/A"}`,
    `Score: ${score >= 0 ? `${score}/100` : "Pending"} (${readiness.label})`,
    `Right now (recommended): ${recommended}`,
    `Right now (skipped): ${skipped}`,
    `Primary blocker: ${stripPeriod(primaryBlocker)}`,
    `Top fix: ${topFix}`,
    `Next move: ${coverage.nextMove}`,
  ];

  const quotePack = buildQuotePack(analysis);
  const fixChecklist = buildFixChecklist(topFix, analysis);

  return {
    execSummary: execLines.slice(0, 7).join("\n"),
    quotePack,
    fixChecklist,
  };
}

function buildQuotePack(analysis: AnalysisResult): string {
  const brand = analysis.extracted.brandGuess || analysis.extracted.domain || "This site";
  const categoryInfo = deriveCategory(analysis);
  const categoryLabel = categoryInfo.category;
  const quotes = buildQuoteReady(analysis, brand, categoryLabel, biggestGapCategoryFromBreakdown(analysis.breakdown || []));
  return quotes.map((q) => `${q.label}: ${q.copy}`).join("\n");
}

function buildFixChecklist(topFix: string, analysis: AnalysisResult): string {
  const gaps = buildGapSignals(analysis);
  const checklist: string[] = [];
  if (topFix) {
    checklist.push(topFix);
  }
  for (const gap of gaps) {
    if (checklist.length >= 3) break;
    checklist.push(`Add explicit coverage for ${gap}.`);
  }
  while (checklist.length < 3) {
    checklist.push("Make key signals explicit in retrievable text.");
  }
  return checklist.slice(0, 3).map((item) => `- ${item}`).join("\n");
}

function buildRightNowReason(
  primaryBlocker: string,
  nextMove: string,
  primaryGapCategory: string
): string {
  if (primaryBlocker) {
    return `AI skips you here because ${lowercaseLead(stripPeriod(primaryBlocker))}.`;
  }
  if (nextMove) {
    const normalized = stripPeriod(nextMove);
    return `AI skips you here because coverage is low; ${lowercaseLead(normalized)}.`;
  }
  if (primaryGapCategory) {
    return `AI skips you here because ${primaryGapCategory.toLowerCase()} signals are weak.`;
  }
  return "AI skips you here because key signals are not explicit in retrievable text.";
}

function buildQuoteReady(
  analysis: AnalysisResult,
  brand: string,
  categoryLabel: string,
  primaryGapCategory: string
): { label: string; copy: string; placement: string; why: string }[] {
  const definition = ensurePeriod(
    `${brand} is a ${categoryLabel} that provides clear, retrievable answers.`
  );
  const who = ensurePeriod(
    `${brand} is for teams that need AI-ready clarity in their public answers.`
  );
  const how = ensurePeriod(
    `${brand} reviews on-page signals and highlights fixes that reduce citation risk.`
  );

  return [
    {
      label: "What it is",
      copy: definition,
      placement: "Homepage hero",
      why: buildQuoteWhy(primaryGapCategory, "definition"),
    },
    {
      label: "Who it's for",
      copy: who,
      placement: "FAQ",
      why: buildQuoteWhy(primaryGapCategory, "audience"),
    },
    {
      label: "How it works",
      copy: how,
      placement: "Methodology",
      why: buildQuoteWhy(primaryGapCategory, "process"),
    },
  ];
}

function buildCitableSentences(
  analysis: AnalysisResult,
  brand: string,
  categoryLabel: string
): string[] {
  const h1 = analysis.extracted.h1s?.[0];
  const first = h1 ? ensurePeriod(shorten(h1, 120)) : `${brand} is a ${categoryLabel}.`;
  const second = analysis.extracted.hasPricing
    ? `${brand} publishes pricing and plan details on its site.`
    : `${brand} provides direct answers and legitimacy signals on its site.`;

  return [first, second];
}

function buildWhyCitableSignals(analysis: AnalysisResult): string[] {
  const extracted = analysis.extracted;
  const bullets = [
    extracted.title ? "Title and H1 make the entity explicit." : "",
    extracted.hasFAQ || extracted.hasDirectAnswerBlock ? "Direct answers can be quoted without inference." : "",
    extracted.hasSchemaJsonLd ? "Structured data supports entity classification." : "",
    extracted.hasContactSignals || extracted.hasAbout ? "Legitimacy and contact context are visible." : "",
    extracted.hasPricing ? "Commercial boundaries are stated plainly." : "",
  ];

  return uniq(bullets).filter(Boolean).slice(0, 3);
}

function shorten(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stripPeriod(value: string): string {
  return value.trim().replace(/[.!?]$/, "");
}

function lowercaseLead(value: string): string {
  if (!value) return value;
  return value[0].toLowerCase() + value.slice(1);
}

function buildQuoteWhy(primaryGapCategory: string, kind: "definition" | "audience" | "process"): string {
  if (primaryGapCategory === "Entity Clarity") {
    return kind === "definition"
      ? "Explicit category language reduces ambiguity, making citations safer."
      : "Clear audience and process details reduce uncertainty for summaries.";
  }
  if (primaryGapCategory === "Answerability Signals") {
    return kind === "definition"
      ? "A direct definition reduces inference for quick answers."
      : "Direct audience and process lines are easy to quote.";
  }
  if (primaryGapCategory === "Trust & Legitimacy") {
    return kind === "process"
      ? "Process clarity helps justify why this source can be cited."
      : "Explicit statements make it safer to cite the source.";
  }
  if (primaryGapCategory === "Commercial Clarity") {
    return "Defines scope without inventing pricing, reducing citation risk.";
  }
  if (primaryGapCategory === "Structural Comprehension") {
    return "One-sentence copy reduces parsing overhead for models.";
  }
  return "Concise, explicit copy is easier to cite without guessing.";
}

function isSaaS(analysis: AnalysisResult): boolean {
  const extracted = analysis.extracted;
  const text = [
    extracted.title,
    extracted.h1s?.[0],
    extracted.metaDescription,
  ]
    .filter(Boolean)
    .join(" ");
  return /\b(saas|software|platform|cloud|app)\b/i.test(text);
}

function fillPrompts(
  items: { prompt: string; reason: string }[],
  defaults: { prompt: string; reason: string }[],
  limit: number
): { prompt: string; reason: string }[] {
  const out = [...items];
  for (const candidate of defaults) {
    if (out.length >= limit) break;
    if (!out.some((item) => item.prompt === candidate.prompt)) {
      out.push(candidate);
    }
  }
  return out.slice(0, limit);
}
