import type { AnalysisResult, FetchDiagnostics } from "./scoring";

export type SimulationResult = {
  recommendedAsDefault: boolean;
  confidence: number; // 0-100
  topReasons: string[]; // max 5
  missingSignals: string[]; // max 7
  nextActions: {
    priority: "high" | "medium" | "low";
    action: string;
    why: string;
    validate: string;
  }[]; // max 8
  alternative_categories: Array<{
    category: string;
    why_ai_picks_it: string;
    what_ai_looks_for: string[];
  }>;
  decision_criteria: string[]; // 6-10 bullets
  likely_inclusion: {
    included: boolean;
    confidence: number; // 0-100
    why: string[];
  };
  // Deprecated (kept for backward compatibility with markdown + UI fallbacks)
  missing_signals: string[];
  recommended_definition_block: {
    h1: string;
    subheadline: string;
    three_bullets: string[];
  };
  disclaimer: string;
  version: "sim-v1";
};

type RunSimulationParams = {
  url: string;
  analysis: AnalysisResult;
};

const MODEL =
  process.env.OPENAI_SIMULATION_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4o-mini";

const DEFAULT_DISCLAIMER =
  "This is a model-based simulation using your homepage snapshot + general LLM behavior. It is not a measurement of live model outputs.";

export async function runSimulation(
  params: RunSimulationParams
): Promise<
  | {
      ok: true;
      simulation: SimulationResult;
      model: string;
      tokens?: { input?: number; output?: number };
    }
  | { ok: false; error: string }
> {
  const { url, analysis } = params;

  let OpenAI: any;
  try {
    OpenAI = (await import("openai")).default;
  } catch {
    return {
      ok: false,
      error: "LLM simulation unavailable (OpenAI SDK not installed. Run: npm install openai).",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "LLM simulation unavailable (missing OPENAI_API_KEY)." };
  }

  if (analysis.analysisStatus && analysis.analysisStatus !== "ok") {
    return { ok: false, error: "Snapshot unreliable." };
  }
  if (analysis.snapshotQuality && analysis.snapshotQuality !== "ok") {
    return { ok: false, error: "Snapshot unreliable." };
  }

  const openai = new OpenAI({ apiKey });
  let domain = analysis.extracted.domain;
  if (!domain) {
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      domain = url.replace(/^https?:\/\//, "").split("/")[0];
    }
  }
  const brand = analysis.extracted.brandGuess || (domain ? domain.split(".")[0] : "");

  const evidence = {
    title: analysis.extracted.title,
    meta: analysis.extracted.metaDescription,
    h1: analysis.extracted.h1s?.[0],
    h2s: (analysis.extracted.h2s || []).slice(0, 5),
    schemaTypes: (analysis.extracted.schemaTypes || []).slice(0, 5),
    hasSchemaJsonLd: analysis.extracted.hasSchemaJsonLd,
    contactEvidence: (analysis.extracted.contactEvidence || []).slice(0, 3),
    faqSignals: {
      explicit: analysis.extracted.hasFAQ,
      indirect: analysis.extracted.hasIndirectFAQ,
      directAnswers: analysis.extracted.hasDirectAnswerBlock,
    },
  };

  const breakdownSummary = (analysis.breakdown || []).map((b) => ({
    label: b.label,
    category: b.category,
    points: b.points,
    max: b.max,
  }));

  const payload = {
    domain,
    brandGuess: brand,
    url,
    score: analysis.score,
    snapshotQuality: analysis.snapshotQuality ?? "ok",
    diagnostics: sanitizeDiagnostics(analysis.fetchDiagnostics),
    evidence,
    breakdown: breakdownSummary.slice(0, 12),
  };

  const system = [
    "You are simulating how a careful LLM would choose alternatives when answering user questions.",
    "Use only the provided snapshot signals and general web priors.",
    "Do NOT invent competitor brand names. Use categories only.",
    "Do NOT claim rankings or numeric positions.",
    "Return JSON ONLY in the exact schema provided.",
  ].join(" ");

  const schemaDescription = {
    recommendedAsDefault: "boolean",
    confidence: "number 0-100",
    topReasons: "string[] (max 5)",
    missingSignals: "string[] (max 7)",
    nextActions:
      "[{ priority:'high'|'medium'|'low', action:string, why:string, validate:string }] (max 8)",
    alternative_categories: "[{ category, why_ai_picks_it, what_ai_looks_for[] }]",
    decision_criteria: "string[] (6-10)",
    likely_inclusion: "{ included:boolean, confidence:number, why:string[] }",
    missing_signals: "string[] (duplicate of missingSignals for backward compatibility)",
    recommended_definition_block: "{ h1, subheadline, three_bullets[] }",
    disclaimer: "string",
    version: "sim-v1",
  };

  const user = [
    "Simulate how an LLM would pick default recommendations given this site.",
    "Return JSON ONLY with these keys and nothing else:",
    JSON.stringify(schemaDescription, null, 2),
    "",
    "Input:",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(raw);
    if (!parsed) {
      return { ok: false, error: "LLM simulation failed to return valid JSON." };
    }

    const normalized = normalizeSimulation(parsed, evidence);

    return {
      ok: true,
      simulation: normalized,
      model: response.model || MODEL,
      tokens: response.usage
        ? { input: response.usage.prompt_tokens, output: response.usage.completion_tokens }
        : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { ok: false, error: `LLM simulation failed: ${msg}` };
  }
}

function normalizeSimulation(raw: any, evidence: any): SimulationResult {
  const recommendedAsDefault =
    typeof raw.recommendedAsDefault === "boolean"
      ? raw.recommendedAsDefault
      : !!raw?.likely_inclusion?.included;
  const confidence = clampNumber(
    raw.confidence ?? raw?.likely_inclusion?.confidence ?? 0,
    0,
    100
  );
  const topReasons = toStringArray(
    raw.topReasons || raw.top_reasons || raw?.likely_inclusion?.why,
    5
  );
  const missingSignals = toStringArray(
    raw.missingSignals || raw.missing_signals || [],
    7
  );
  const nextActions = Array.isArray(raw.nextActions)
    ? raw.nextActions
        .slice(0, 8)
        .map((a: any) => ({
          priority: normalizePriority(a.priority),
          action: typeof a.action === "string" ? a.action : "",
          why: typeof a.why === "string" ? a.why : "",
          validate: typeof a.validate === "string" ? a.validate : "",
        }))
        .filter((a: any) => a.action)
    : [];

  const alternative_categories = Array.isArray(raw.alternative_categories)
    ? raw.alternative_categories
        .map((c: any) => ({
          category: typeof c?.category === "string" ? c.category : "",
          why_ai_picks_it: typeof c?.why_ai_picks_it === "string" ? c.why_ai_picks_it : "",
          what_ai_looks_for: toStringArray(c?.what_ai_looks_for, 5),
        }))
        .filter((c: any) => c.category)
    : [];

  const decision_criteria = toStringArray(raw.decision_criteria, 10);

  const likely_inclusion = raw.likely_inclusion && typeof raw.likely_inclusion === "object"
    ? {
        included: !!raw.likely_inclusion.included,
        confidence: clampNumber(raw.likely_inclusion.confidence ?? confidence, 0, 100),
        why: toStringArray(raw.likely_inclusion.why, 5),
      }
    : {
        included: recommendedAsDefault,
        confidence,
        why: topReasons,
      };

  const recommended_definition_block = raw.recommended_definition_block && typeof raw.recommended_definition_block === "object"
    ? {
        h1: raw.recommended_definition_block.h1 || evidence?.h1 || "State your category in one sentence",
        subheadline:
          raw.recommended_definition_block.subheadline ||
          evidence?.meta ||
          "Clarify what you do, who it is for, and the primary outcome.",
        three_bullets: toStringArray(raw.recommended_definition_block.three_bullets, 3),
      }
    : {
        h1: evidence?.h1 || "State your category in one sentence",
        subheadline: evidence?.meta || "Clarify what you do, who it is for, and the primary outcome.",
        three_bullets: [],
      };

  return {
    recommendedAsDefault,
    confidence,
    topReasons,
    missingSignals,
    nextActions,
    alternative_categories,
    decision_criteria,
    likely_inclusion,
    missing_signals: missingSignals,
    recommended_definition_block,
    disclaimer: raw.disclaimer || DEFAULT_DISCLAIMER,
    version: "sim-v1",
  };
}

function sanitizeDiagnostics(diag?: FetchDiagnostics | null) {
  if (!diag) return null;
  return {
    status: diag.status,
    ok: diag.ok,
    errorType: diag.errorType,
    contentType: diag.contentType,
    bytes: diag.bytes,
    durationMs: diag.durationMs,
    retryAfter: diag.retryAfter,
  };
}

function toStringArray(value: any, limit: number): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function clampNumber(value: any, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizePriority(value: any): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

function safeJsonParse(text: string): any | null {
  if (!text) return null;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  const candidate = text.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}
