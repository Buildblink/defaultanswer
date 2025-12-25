export const COLD_SUMMARY_PROMPT_VERSION = "cold-summary-v2";

const COLD_SUMMARY_SYSTEM = "You are an AI assistant. You do not have browsing for this task.";

const COLD_SUMMARY_USER_URL_ONLY = [
  "You are given ONLY a URL (no page content). Without browsing, infer what the website likely is.",
  "Return exactly these 5 lines (no extra text):",
  "1) Category/Type: <... or \"Unknown\">",
  "2) Who it is for: <... or \"Unknown\">",
  "3) What problem it solves: <... or \"Unknown\">",
  "4) What it offers: <... or \"Unknown\">",
  "5) 1-sentence plain summary: <... or \"Unknown\">",
  "If you cannot infer confidently, output \"Unknown\" for those lines and add a 6th line:",
  "6) Why uncertain: <one sentence>",
  "",
  "URL: {{URL}}",
].join("\n");

const COLD_SUMMARY_USER_SNAPSHOT = [
  "You are given ONLY a URL and a small snapshot of on-page text (title, meta description, H1, visible excerpt). Without browsing, infer what the website likely is.",
  "Return exactly these 5 lines (no extra text):",
  "1) Category/Type: <... or \"Unknown\">",
  "2) Who it is for: <... or \"Unknown\">",
  "3) What problem it solves: <... or \"Unknown\">",
  "4) What it offers: <... or \"Unknown\">",
  "5) 1-sentence plain summary: <... or \"Unknown\">",
  "If you cannot infer confidently, output \"Unknown\" for those lines and add a 6th line:",
  "6) Why uncertain: <one sentence>",
  "",
  "URL: {{URL}}",
  "Title: {{TITLE}}",
  "Meta description: {{META}}",
  "H1: {{H1}}",
  "Visible text excerpt: {{EXCERPT}}",
].join("\n");

export type ColdSummaryMode = "url_only" | "snapshot";

export type ColdSummarySnapshot = {
  title?: string;
  metaDescription?: string;
  h1?: string;
  excerpt?: string;
};

export type ColdSummaryExistingSignals = {
  hasFaq: boolean;
  hasSchema: boolean;
  hasPricing: boolean;
  hasAbout: boolean;
  hasContact: boolean;
  hasEntityClarity: boolean;
  visibleTextExcerptPresent?: boolean;
};

export type ColdPlaybookItem = {
  id:
    | "mode_note"
    | "hero_category"
    | "for_x"
    | "one_sentence_offer"
    | "faq_block"
    | "schema_org"
    | "pricing"
    | "about_contact"
    | "example_copy";
  title: string;
  why: string;
  example: string;
  status: "recommend" | "already_present" | "not_applicable";
  reason?: string;
};

export type ColdSummaryAnalysis = {
  failureMode: "refusal" | "no_retrieval_url_only" | "unclear" | "partial" | "clear";
  verdictLabel: "Clearly" | "Partial" | "Unclear";
  hasCategory: boolean;
  hasAudience: boolean;
  hasOffering: boolean;
  hasHedging: boolean;
  refusalFlag: boolean;
  unknownCount: number;
  clarityScore: number;
  signals: {
    categoryMatch?: string;
    audienceMatch?: string;
    problemMatch?: string;
    offeringMatch?: string;
    summaryMatch?: string;
    hedgingMatches: string[];
    whyUncertain?: string;
  };
};

export type ColdSummaryResult = {
  promptVersion: string;
  model: string;
  response?: string;
  rawOutput?: string;
  analysis: ColdSummaryAnalysis;
  createdAt: string;
};

export type ColdSummaryRun = {
  rawText: string;
  analysis: ColdSummaryAnalysis;
};

export type ColdSummaryAggregate = {
  clarityAvg: number;
  unknownAvg: number;
  refusalsCount: number;
  verdictCounts: {
    clear: number;
    partial: number;
    unclear: number;
    refusal: number;
  };
  consistencyLabel: "Stable" | "Mixed" | "Volatile";
  note: string;
};

export type ColdSummaryMultiRun = {
  promptVersion: string;
  model: string;
  createdAt: string;
  promptsUsed: string;
  results: ColdSummaryRun[];
  aggregate: ColdSummaryAggregate;
};

export function buildColdSummaryMessages({
  url,
  mode = "url_only",
  snapshot,
}: {
  url: string;
  mode?: ColdSummaryMode;
  snapshot?: ColdSummarySnapshot;
}) {
  const title = snapshot?.title?.trim() || "Unknown";
  const meta = snapshot?.metaDescription?.trim() || "Unknown";
  const h1 = snapshot?.h1?.trim() || "Unknown";
  const excerpt = snapshot?.excerpt?.trim() || "Unknown";
  const template = mode === "snapshot" ? COLD_SUMMARY_USER_SNAPSHOT : COLD_SUMMARY_USER_URL_ONLY;
  return {
    system: COLD_SUMMARY_SYSTEM,
    user: template
      .replace("{{URL}}", url)
      .replace("{{TITLE}}", title)
      .replace("{{META}}", meta)
      .replace("{{H1}}", h1)
      .replace("{{EXCERPT}}", excerpt),
  };
}

export function aggregateColdSummaryRuns(results: ColdSummaryRun[]): ColdSummaryAggregate {
  const verdictCounts = {
    clear: 0,
    partial: 0,
    unclear: 0,
    refusal: 0,
  };

  let clarityTotal = 0;
  let unknownTotal = 0;
  let refusalsCount = 0;

  for (const run of results) {
    clarityTotal += run.analysis.clarityScore || 0;
    unknownTotal += run.analysis.unknownCount || 0;
    if (run.analysis.failureMode === "refusal" || run.analysis.failureMode === "no_retrieval_url_only") {
      refusalsCount += 1;
      verdictCounts.refusal += 1;
    } else if (run.analysis.failureMode === "clear") {
      verdictCounts.clear += 1;
    } else if (run.analysis.failureMode === "partial") {
      verdictCounts.partial += 1;
    } else {
      verdictCounts.unclear += 1;
    }
  }

  const total = Math.max(1, results.length);
  const clarityAvg = Math.round(clarityTotal / total);
  const unknownAvg = Math.round(unknownTotal / total);

  const counts = Object.values(verdictCounts);
  const maxCount = Math.max(...counts);
  const hasRefusal = verdictCounts.refusal > 0;
  const hasNonRefusal = verdictCounts.clear + verdictCounts.partial + verdictCounts.unclear > 0;
  const consistencyLabel =
    maxCount === total
      ? "Stable"
      : maxCount === 2 && !(hasRefusal && hasNonRefusal)
      ? "Mixed"
      : "Volatile";

  const note =
    consistencyLabel === "Stable"
      ? `${maxCount}/${total} runs agree. Cold understanding is consistent.`
      : consistencyLabel === "Mixed"
      ? `Cold understanding varies across runs (${maxCount}/${total} agree).`
      : "Cold understanding is volatile (models disagree / refusals present).";

  return {
    clarityAvg,
    unknownAvg,
    refusalsCount,
    verdictCounts,
    consistencyLabel,
    note,
  };
}

export function pickRepresentativeRun(results: ColdSummaryRun[], aggregate?: ColdSummaryAggregate): ColdSummaryRun | null {
  if (!results.length) return null;
  const nonRefusals = results.filter(
    (run) => run.analysis.failureMode !== "refusal" && run.analysis.failureMode !== "no_retrieval_url_only"
  );
  const pool = nonRefusals.length > 0 ? nonRefusals : results;
  const target = aggregate?.clarityAvg ?? Math.round(pool.reduce((sum, run) => sum + run.analysis.clarityScore, 0) / pool.length);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  pool.forEach((run, index) => {
    const distance = Math.abs(run.analysis.clarityScore - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return pool[bestIndex] || results[0];
}

export function buildColdFixPlaybook(
  analysis: ColdSummaryAnalysis,
  options?: { mode?: ColdSummaryMode; existingSignals?: ColdSummaryExistingSignals }
): ColdPlaybookItem[] {
  const mode = options?.mode ?? "url_only";
  const existing = options?.existingSignals;
  const hasFaq = existing?.hasFaq ?? false;
  const hasSchema = existing?.hasSchema ?? false;
  const hasPricing = existing?.hasPricing ?? false;
  const hasAbout = existing?.hasAbout ?? false;
  const hasContact = existing?.hasContact ?? false;
  const hasEntityClarity = existing?.hasEntityClarity ?? false;

  const refusalLike =
    analysis.failureMode === "refusal" || analysis.failureMode === "no_retrieval_url_only";

  const actions: ColdPlaybookItem[] = [];

  if (mode === "url_only" && refusalLike) {
    actions.push({
      id: "mode_note",
      status: "recommend",
      title: "Use Snapshot mode for a real test",
      why: "URL-only cannot fetch page content; this tests brand memory, not on-page clarity.",
      example: "Switch to Snapshot mode to test whether your visible copy is extractable.",
    });
  }

  actions.push({
    id: "hero_category",
    title: "Add a category one-liner in the hero/H1",
    why: "Models need an explicit category anchor in the first scan.",
    example: "Example: \"Acme is a payroll platform for startups.\"",
    status: analysis.hasCategory ? "already_present" : "recommend",
    reason: analysis.hasCategory ? "Category was detected in the cold summary output." : undefined,
  });

  actions.push({
    id: "for_x",
    title: "Add a clear 'for X' line",
    why: "Audience clarity boosts cold inference confidence.",
    example: "Example: \"Built for finance teams at growing SaaS companies.\"",
    status: analysis.hasAudience ? "already_present" : "recommend",
    reason: analysis.hasAudience ? "Audience was detected in the cold summary output." : undefined,
  });

  actions.push({
    id: "one_sentence_offer",
    title: "State what you offer in one sentence",
    why: "Offering ambiguity drives partial or unclear summaries.",
    example: "Example: \"We provide an invoicing tool that automates billing.\"",
    status: analysis.hasOffering ? "already_present" : "recommend",
    reason: analysis.hasOffering ? "Offering was detected in the cold summary output." : undefined,
  });

  const faqStatus =
    mode === "url_only" && refusalLike
      ? hasFaq
        ? "already_present"
        : "not_applicable"
      : hasFaq
      ? "already_present"
      : "recommend";
  actions.push({
    id: "faq_block",
    title: "Add an FAQ block (What is X / Who is it for / Pricing)",
    why: "Direct Q&A improves cold summaries without browsing.",
    example: "Example: \"What is Acme? Acme is a payroll platform for startups.\"",
    status: faqStatus,
    reason: hasFaq
      ? "Detected FAQ signals in the report analysis."
      : faqStatus === "not_applicable"
      ? "URL-only mode cannot validate FAQ presence."
      : undefined,
  });

  const schemaStatus =
    mode === "url_only" && refusalLike
      ? hasSchema
        ? "already_present"
        : "not_applicable"
      : hasSchema
      ? "already_present"
      : "recommend";
  actions.push({
    id: "schema_org",
    title: "Add Organization + WebSite schema",
    why: "Structured data helps models resolve category faster.",
    example: "Example: JSON-LD Organization + WebSite on the homepage.",
    status: schemaStatus,
    reason: hasSchema
      ? "Detected Schema.org signals in the report analysis."
      : schemaStatus === "not_applicable"
      ? "URL-only mode cannot validate schema presence."
      : undefined,
  });

  const pricingStatus =
    mode === "url_only" && refusalLike
      ? hasPricing
        ? "already_present"
        : "not_applicable"
      : hasPricing
      ? "already_present"
      : "recommend";
  actions.push({
    id: "pricing",
    title: "Add a simple pricing or plan snapshot",
    why: "Commercial clarity reduces vague summaries.",
    example: "Example: \"Plans start at $49/month\" near the hero.",
    status: pricingStatus,
    reason: hasPricing
      ? "Detected pricing signals in the report analysis."
      : pricingStatus === "not_applicable"
      ? "URL-only mode cannot validate pricing presence."
      : undefined,
  });

  const aboutContactStatus =
    mode === "url_only" && refusalLike
      ? hasAbout && hasContact
        ? "already_present"
        : "not_applicable"
      : hasAbout && hasContact
      ? "already_present"
      : "recommend";
  actions.push({
    id: "about_contact",
    title: "Add About + Contact links in header/footer",
    why: "Trust signals reduce refusal and uncertainty.",
    example: "Example: \"About\" and \"Contact\" links in the primary nav.",
    status: aboutContactStatus,
    reason:
      hasAbout && hasContact
        ? "Detected About and Contact signals in the report analysis."
        : aboutContactStatus === "not_applicable"
        ? "URL-only mode cannot validate trust signals."
        : undefined,
  });

  actions.push({
    id: "example_copy",
    title: "Remove hedging words in the hero copy",
    why: "Hedging reduces confidence and triggers uncertainty.",
    example: "Rewrite: \"We help teams ship faster\" (not \"We might help teams...\").",
    status: analysis.hasHedging ? "recommend" : "not_applicable",
    reason: analysis.hasHedging ? "Hedging language was detected in the output." : undefined,
  });

  if (hasEntityClarity && !analysis.hasCategory) {
    actions.forEach((item) => {
      if (item.id === "hero_category" && item.status === "recommend") {
        item.reason = "Entity clarity signals exist, but the cold summary did not pick up the category.";
      }
    });
  }

  return actions;
}
export function analyzeColdSummary(text: string, mode: ColdSummaryMode = "url_only"): ColdSummaryAnalysis {
  const normalized = (text || "").trim();

  const parsed = parseStructuredSummary(normalized);
  const categoryValue = parsed.category;
  const audienceValue = parsed.audience;
  const problemValue = parsed.problem;
  const offeringValue = parsed.offering;
  const summaryValue = parsed.summary;
  const whyUncertain = parsed.whyUncertain;

  const unknownCount = [
    categoryValue,
    audienceValue,
    problemValue,
    offeringValue,
    summaryValue,
  ].filter((value) => isUnknown(value)).length;

  const hedgingRegex = /\b(appears|seems|might|may|could|possibly|likely|suggests|unclear)\b/gi;
  const refusalRegex =
    /\b(cannot access external websites|can't browse|cannot browse|i do not have access|i don't have access|unable to access|cannot open the url|i cannot open|i can't access|no browsing)\b/i;
  const refusalReasonRegex =
    /\b(cannot access|can't access|cannot browse|can't browse|do not have access|don't have access|unable to access|no browsing)\b/i;

  const refusalByPhrase = refusalRegex.test(normalized);
  const refusalByUnknowns =
    unknownCount >= 4 && Boolean(whyUncertain && refusalReasonRegex.test(whyUncertain));
  const refusalFlag = refusalByPhrase || refusalByUnknowns;

  const categoryMatch = categoryValue;
  const audienceMatch = audienceValue;
  const problemMatch = problemValue;
  const offeringMatch = offeringValue;
  const summaryMatch = summaryValue;
  const hedgingMatches = Array.from(new Set(normalized.match(hedgingRegex) || []));

  const hasCategory = Boolean(categoryMatch && !isUnknown(categoryMatch));
  const hasAudience = Boolean(audienceMatch && !isUnknown(audienceMatch));
  const hasOffering = Boolean(offeringMatch && !isUnknown(offeringMatch));
  const hasHedging = hedgingMatches.length > 0;

  const failureMode = refusalFlag
    ? mode === "url_only"
      ? "no_retrieval_url_only"
      : "refusal"
    : unknownCount >= 4
    ? "unclear"
    : unknownCount >= 2
    ? "partial"
    : "clear";

  let clarityScore = 2;
  if (failureMode === "refusal" || failureMode === "no_retrieval_url_only") clarityScore = 1;
  else if (failureMode === "unclear") clarityScore = 2;
  else if (failureMode === "partial") clarityScore = 3;
  else {
    const allKnown = unknownCount === 0;
    clarityScore = allKnown && !hasHedging ? 5 : 4;
  }

  const verdictLabel = clarityScore >= 4 ? "Clearly" : clarityScore >= 3 ? "Partial" : "Unclear";

  return {
    failureMode,
    verdictLabel,
    hasCategory,
    hasAudience,
    hasOffering,
    hasHedging,
    refusalFlag,
    unknownCount,
    clarityScore,
    signals: {
      categoryMatch,
      audienceMatch,
      problemMatch,
      offeringMatch,
      summaryMatch,
      hedgingMatches,
      whyUncertain,
    },
  };
}

function parseStructuredSummary(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: {
    category?: string;
    audience?: string;
    problem?: string;
    offering?: string;
    summary?: string;
    whyUncertain?: string;
  } = {};

  const takeValue = (line: string) => {
    const stripped = line.replace(/^\d+\)\s*/, "");
    const idx = stripped.indexOf(":");
    if (idx === -1) return stripped.trim();
    return stripped.slice(idx + 1).trim();
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("category/type")) result.category = takeValue(line);
    else if (lower.startsWith("who it is for")) result.audience = takeValue(line);
    else if (lower.startsWith("what problem it solves")) result.problem = takeValue(line);
    else if (lower.startsWith("what it offers")) result.offering = takeValue(line);
    else if (lower.startsWith("1-sentence plain summary")) result.summary = takeValue(line);
    else if (lower.startsWith("why uncertain")) result.whyUncertain = takeValue(line);
  }

  return result;
}

function isUnknown(value?: string) {
  if (!value) return true;
  return value.trim().toLowerCase() === "unknown";
}
