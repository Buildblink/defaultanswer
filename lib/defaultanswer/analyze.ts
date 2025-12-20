import {
  analyzeHtml,
  extractPageData,
  type AnalysisResult,
  type SnapshotQuality,
  type FetchDiagnostics,
  type FixPlanItem,
  type BreakdownItem,
  type ExtractedData,
} from "@/lib/defaultanswer/scoring";
import { isValidUrl, normalizeUrl } from "@/lib/defaultanswer/url-utils";

const DEFAULT_TIMEOUT_MS = 10_000;
const THIN_BYTES_THRESHOLD = 20_000;
const THIN_TEXT_THRESHOLD = 8_000;
const EMPTY_BODY_TEXT_THRESHOLD = 400;

export type AnalyzeUrlResult =
  | {
      ok: true;
      url: string;
      analysis: AnalysisResult;
      fallback: false;
      notes?: string;
    }
  | {
      ok: true;
      url: string;
      analysis: AnalysisResult;
      fallback: true;
      notes: string;
    };

/**
 * Analyze a URL (homepage only).
 * - No external APIs beyond fetching the provided URL
 * - Never throws: returns fallback analysis on any failure
 */
export async function analyzeUrl(
  inputUrl: string,
  opts?: { timeoutMs?: number }
): Promise<AnalyzeUrlResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchedAt = new Date().toISOString();

  const diagnosticsBase: FetchDiagnostics = {
    requestedUrl: inputUrl,
    ok: false,
  };

  if (!isValidUrl(inputUrl)) {
    return {
      ok: true,
      url: inputUrl,
      fallback: true,
      notes: "invalid url",
      analysis: getErrorAnalysis({
        url: inputUrl,
        fetchedAt,
        reason: "Invalid URL",
        diagnostics: { ...diagnosticsBase, errorType: "invalid_url" },
      }),
    };
  }

  const url = normalizeUrl(inputUrl);
  const diagnostics: FetchDiagnostics = {
    ...diagnosticsBase,
    requestedUrl: url,
  };

  let html = "";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DefaultAnswer/1.0 (LLM Recommendation Analysis)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);

    diagnostics.durationMs = Date.now() - startedAt;
    diagnostics.status = response.status;
    diagnostics.finalUrl = response.url;
    diagnostics.contentType = response.headers.get("content-type") || undefined;
    diagnostics.retryAfter = response.headers.get("retry-after");
    diagnostics.ok = response.ok;

    if (!response.ok) {
      diagnostics.errorType = classifyErrorTypeFromStatus(response.status);
      return {
        ok: true,
        url,
        fallback: true,
        notes: `fetch failed (HTTP ${response.status})`,
        analysis:
          diagnostics.errorType === "blocked"
            ? getBlockedAnalysis({
                url,
                fetchedAt,
                reason: `HTTP ${response.status}`,
                diagnostics,
              })
            : getErrorAnalysis({
                url,
                fetchedAt,
                reason: `HTTP ${response.status}`,
                diagnostics,
              }),
      };
    }

    const buffer = await response.arrayBuffer();
    diagnostics.bytes = buffer.byteLength;
    html = new TextDecoder().decode(buffer);
    diagnostics.ok = true;
  } catch (err) {
    clearTimeout(timeoutId);
    diagnostics.durationMs = Date.now() - startedAt;
    diagnostics.errorType = classifyErrorTypeFromError(err);
    const msg = err instanceof Error ? err.message : "unknown error";
    return {
      ok: true,
      url,
      fallback: true,
      notes: `fetch failed (${msg})`,
      analysis: getErrorAnalysis({ url, fetchedAt, reason: msg, diagnostics }),
    };
  }

  const snapshotQuality = classifySnapshotQuality(
    html,
    diagnostics.bytes ?? Buffer.byteLength(html || "", "utf-8")
  );

  const extracted = extractPageData(html, url);
  extracted.evaluatedPage = "Homepage HTML snapshot";
  extracted.evaluatedUrl = url;
  extracted.fetchedAt = fetchedAt;

  if (snapshotQuality !== "ok") {
    const analysis = getSnapshotIncompleteAnalysis({
      url,
      fetchedAt,
      snapshotQuality,
      diagnostics,
      extracted,
    });
    return { ok: true, url, analysis, fallback: false };
  }

  try {
    const analysis = analyzeHtml(html, url);
    analysis.extracted.evaluatedPage = "Homepage HTML snapshot";
    analysis.extracted.evaluatedUrl = url;
    analysis.extracted.fetchedAt = fetchedAt;
    analysis.snapshotQuality = snapshotQuality;
    analysis.fetchDiagnostics = { ...diagnostics, ok: true };
    analysis.analysisStatus = "ok";
    return { ok: true, url, analysis, fallback: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return {
      ok: true,
      url,
      fallback: true,
      notes: `analysis failed (${msg})`,
      analysis: getErrorAnalysis({ url, fetchedAt, reason: msg, diagnostics }),
    };
  }
}

function getBlockedAnalysis(params: {
  url: string;
  fetchedAt: string;
  reason: string;
  diagnostics?: FetchDiagnostics;
}): AnalysisResult {
  const { url, fetchedAt, reason, diagnostics } = params;
  const extracted = buildExtractedSkeleton(url, fetchedAt);

  return {
    score: -1,
    breakdown: [buildErrorBreakdown("Analysis unavailable", `Could not fetch or analyze the page (${reason})`)],
    weaknesses: ["Unable to analyze page — fetch was blocked."],
    fixPlan: getBlockedFixes(),
    extracted,
    reasoning: [],
    fetchDiagnostics: diagnostics,
    analysisStatus: "blocked",
  };
}

function getErrorAnalysis(params: {
  url: string;
  fetchedAt: string;
  reason: string;
  diagnostics?: FetchDiagnostics;
}): AnalysisResult {
  const { url, fetchedAt, reason, diagnostics } = params;
  const extracted = buildExtractedSkeleton(url, fetchedAt);

  return {
    score: -1,
    breakdown: [buildErrorBreakdown("Analysis unavailable", `Could not fetch or analyze the page (${reason})`)],
    weaknesses: ["Unable to analyze page — fetch failed or the site was unavailable."],
    fixPlan: [
      {
        priority: "high",
        action: "Ensure your site is publicly accessible and not blocking automated requests.",
      },
      {
        priority: "medium",
        action: "Check that your homepage loads without requiring JavaScript to render core content.",
      },
    ],
    extracted,
    reasoning: [],
    fetchDiagnostics: diagnostics,
    analysisStatus: diagnostics?.errorType === "blocked" ? "blocked" : "error",
  };
}

function getSnapshotIncompleteAnalysis(params: {
  url: string;
  fetchedAt: string;
  snapshotQuality: SnapshotQuality;
  diagnostics?: FetchDiagnostics;
  extracted: ExtractedData;
}): AnalysisResult {
  const { url, fetchedAt, snapshotQuality, diagnostics } = params;
  const weakness =
    "Analysis incomplete — the homepage content appears to require JavaScript or is too thin to evaluate reliably.";

  const extracted = buildExtractedSkeleton(url, fetchedAt, params.extracted);

  return {
    score: -2,
    breakdown: [buildErrorBreakdown("Snapshot incomplete", weakness)],
    weaknesses: [weakness],
    fixPlan: [
      { priority: "high", action: "Make core identity + FAQ answers visible in server-rendered HTML." },
      { priority: "medium", action: "Ensure title/meta/H1 exist in initial HTML." },
      { priority: "low", action: "Add schema JSON-LD to initial HTML." },
    ],
    extracted,
    reasoning: [],
    snapshotQuality,
    fetchDiagnostics: diagnostics,
    analysisStatus: "snapshot_incomplete",
  };
}

function classifySnapshotQuality(html: string, bytes: number): SnapshotQuality {
  const bodyContent = extractBody(html);
  const visibleText = stripHtml(bodyContent || html);
  const isThin = bytes < THIN_BYTES_THRESHOLD || visibleText.length < THIN_TEXT_THRESHOLD;

  const hasJsRoots =
    /__next/i.test(html) ||
    /id=["']root["']/i.test(html) ||
    /id=["']app["']/i.test(html) ||
    /window\.__NUXT__/i.test(html) ||
    /data-reactroot/i.test(html) ||
    /<script[^>]+chunk[^>]*\.js/i.test(html) ||
    /<script[^>]+bundle[^>]*\.js/i.test(html);
  const bodyMostlyEmpty = stripHtml(bodyContent).trim().length < EMPTY_BODY_TEXT_THRESHOLD;

  if (bodyMostlyEmpty && hasJsRoots) return "likely_js";
  if (isThin) return "thin";
  return "ok";
}

function classifyErrorTypeFromStatus(status?: number): FetchDiagnostics["errorType"] {
  if (!status) return "unknown";
  if (status === 403 || status === 429) return "blocked";
  return "unknown";
}

function classifyErrorTypeFromError(err: unknown): FetchDiagnostics["errorType"] {
  if (err instanceof Error) {
    if (/abort/i.test(err.name) || /abort/i.test(err.message) || /timeout/i.test(err.message)) {
      return "timeout";
    }
    if (/ENOTFOUND|dns/i.test(err.message)) return "dns";
  }
  return "unknown";
}

function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function extractBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

function buildExtractedSkeleton(
  url: string,
  fetchedAt: string,
  overrides?: Partial<ExtractedData>
): ExtractedData {
  const domain = extractDomain(url);
  const brand = domain.split(".")[0] || "";
  const brandCapitalized = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "";

  return {
    title: undefined,
    metaDescription: undefined,
    h1s: [],
    h2s: [],
    h3s: [],
    hasFAQ: false,
    hasIndirectFAQ: false,
    hasDirectAnswerBlock: false,
    hasSchema: false,
    hasSchemaJsonLd: false,
    schemaTypes: [],
    hasPricing: false,
    hasAbout: false,
    hasContact: false,
    hasContactSignals: false,
    contactEvidence: [],
    domain,
    brandGuess: brandCapitalized,
    canonicalUrl: undefined,
    evaluatedPage: "Homepage HTML snapshot",
    evaluatedUrl: url,
    fetchedAt,
    evidence: undefined,
    ...overrides,
  };
}

function buildErrorBreakdown(label: string, reason: string): BreakdownItem {
  return {
    label,
    points: 0,
    max: 100,
    reason,
    category: "Error",
  };
}

function getBlockedFixes(): FixPlanItem[] {
  return [
    {
      priority: "high",
      action: "Ensure your site is publicly accessible and not blocking automated requests.",
    },
    {
      priority: "medium",
      action: "Allow the homepage HTML to be fetched without authentication, bot challenges, or rate limits.",
    },
  ];
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

