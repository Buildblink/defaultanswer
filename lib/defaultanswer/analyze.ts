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
const PAGE_TIMEOUT_MS = 5_000;
const MAX_PAGES = 10;
const THIN_BYTES_THRESHOLD = 20_000;
const THIN_TEXT_THRESHOLD = 8_000;
const EMPTY_BODY_TEXT_THRESHOLD = 400;

// Common paths to check (in deterministic order)
const COMMON_PATHS = {
  pricing: ["/pricing", "/plans", "/purchase", "/subscribe"],
  about: ["/about", "/about-us", "/company", "/team"],
  contact: ["/contact", "/contact-us", "/support"],
  features: ["/features", "/solutions"],
};

type PageResult = {
  url: string;
  path: string;
  html: string;
  extracted: ExtractedData;
  error?: string;
};

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
    analysis.extracted.pageScanMetadata = {
      scannedPages: [{ url, path: "/", status: "success" }],
      totalScanned: 1,
      successCount: 1,
      errorCount: 0,
      scanDepth: "homepage-only",
    };
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

/**
 * Extract links from HTML that match common page patterns
 */
function extractCandidateLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const domain = extractDomain(baseUrl);

  // Extract all href attributes
  const hrefRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
      continue;
    }

    try {
      // Resolve relative URLs
      const absoluteUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
      const linkDomain = extractDomain(absoluteUrl);

      // Only include same-domain links
      if (linkDomain === domain) {
        links.add(absoluteUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(links);
}

/**
 * Find pages to analyze from homepage links and common paths
 */
function findPagesToAnalyze(homepageHtml: string, baseUrl: string): string[] {
  const pagesToCheck: string[] = [];
  const seen = new Set<string>();

  // Normalize base URL
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;

  // 1. Check common paths first (deterministic order)
  for (const category of ["pricing", "about", "contact", "features"] as const) {
    for (const path of COMMON_PATHS[category]) {
      const fullUrl = `${origin}${path}`;
      if (!seen.has(fullUrl)) {
        pagesToCheck.push(fullUrl);
        seen.add(fullUrl);
      }
    }
  }

  // 2. Parse homepage links
  const links = extractCandidateLinks(homepageHtml, baseUrl);

  // Extract link text for keyword matching
  const linkTextRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const linkTextMap = new Map<string, string>();
  let linkMatch;

  while ((linkMatch = linkTextRegex.exec(homepageHtml)) !== null) {
    const href = linkMatch[1].trim();
    const text = linkMatch[2].trim().toLowerCase();
    try {
      const absoluteUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
      linkTextMap.set(absoluteUrl, text);
    } catch {
      // Skip invalid URLs
    }
  }

  // 3. Add links that match patterns or keywords
  for (const link of links) {
    if (seen.has(link)) continue;

    const path = new URL(link).pathname.toLowerCase();
    const linkText = linkTextMap.get(link) || "";

    // Check if path or link text matches our keywords
    const keywords = ["pricing", "plans", "about", "contact", "support", "features", "solutions"];
    const matchesKeyword = keywords.some(
      (kw) => path.includes(kw) || linkText.includes(kw)
    );

    if (matchesKeyword && !seen.has(link)) {
      pagesToCheck.push(link);
      seen.add(link);
    }
  }

  return pagesToCheck.slice(0, MAX_PAGES - 1); // Reserve 1 slot for homepage
}

/**
 * Fetch a single page with timeout
 */
async function fetchPage(url: string, timeoutMs: number = PAGE_TIMEOUT_MS): Promise<{ html: string; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DefaultAnswer/1.0 (LLM Recommendation Analysis)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);

    // Skip error pages but don't fail entirely
    if (!response.ok) {
      return { html: "", error: `HTTP ${response.status}` };
    }

    const buffer = await response.arrayBuffer();
    const html = new TextDecoder().decode(buffer);
    return { html };
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "unknown error";
    return { html: "", error: msg };
  }
}

/**
 * Analyze URL with multi-page support
 * - Fetches homepage first
 * - Discovers and fetches relevant sub-pages
 * - Aggregates signals across all pages
 */
export async function analyzeUrlMultiPage(
  inputUrl: string,
  opts?: { timeoutMs?: number }
): Promise<AnalyzeUrlResult> {
  // First, analyze the homepage using the existing single-page logic
  const homepageResult = await analyzeUrl(inputUrl, opts);

  // If homepage analysis failed, return early
  if (homepageResult.fallback || !homepageResult.analysis || homepageResult.analysis.analysisStatus !== "ok") {
    return homepageResult;
  }

  const baseUrl = homepageResult.url;

  // Refetch the homepage to get the HTML for link extraction
  const { html: refetchedHtml } = await fetchPage(baseUrl, opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (!refetchedHtml) {
    // Can't fetch additional pages, return homepage-only result
    return homepageResult;
  }

  // Find pages to analyze
  const pagesToCheck = findPagesToAnalyze(refetchedHtml, baseUrl);

  // Fetch and extract data from each page
  const pageResults: PageResult[] = [{
    url: baseUrl,
    path: "/",
    html: refetchedHtml,
    extracted: homepageResult.analysis.extracted,
  }];

  // Track scan metadata
  const scannedPages: Array<{ url: string; path: string; status: "success" | "error"; error?: string }> = [
    { url: baseUrl, path: "/", status: "success" }
  ];

  for (const pageUrl of pagesToCheck) {
    const { html, error } = await fetchPage(pageUrl);
    const path = new URL(pageUrl).pathname;

    if (error || !html) {
      // Track error but continue
      scannedPages.push({
        url: pageUrl,
        path,
        status: "error",
        error: error || "Empty response",
      });
      continue;
    }

    // Extract data from this page
    const extracted = extractPageData(html, pageUrl);

    pageResults.push({
      url: pageUrl,
      path,
      html,
      extracted,
    });

    scannedPages.push({
      url: pageUrl,
      path,
      status: "success",
    });

    // Respect MAX_PAGES limit
    if (pageResults.length >= MAX_PAGES) {
      break;
    }
  }

  // Build page scan metadata
  const successCount = scannedPages.filter(p => p.status === "success").length;
  const errorCount = scannedPages.filter(p => p.status === "error").length;
  const pageScanMetadata = {
    scannedPages,
    totalScanned: scannedPages.length,
    successCount,
    errorCount,
    scanDepth: scannedPages.length > 1 ? ("multi-page" as const) : ("homepage-only" as const),
  };

  // Aggregate signals from all pages
  const aggregated = aggregatePageResults(pageResults, baseUrl);
  aggregated.pageScanMetadata = pageScanMetadata;

  // Re-analyze with aggregated data
  const analysis = analyzeHtml(refetchedHtml, baseUrl);
  analysis.extracted = aggregated;
  analysis.extracted.evaluatedPage = `${pageResults.length} page${pageResults.length > 1 ? "s" : ""} analyzed`;
  analysis.extracted.evaluatedUrl = baseUrl;
  analysis.extracted.fetchedAt = homepageResult.analysis.extracted.fetchedAt;
  analysis.snapshotQuality = homepageResult.analysis.snapshotQuality;
  analysis.fetchDiagnostics = homepageResult.analysis.fetchDiagnostics;
  analysis.analysisStatus = "ok";

  return { ok: true, url: baseUrl, analysis, fallback: false };
}

/**
 * Aggregate extracted data from multiple pages
 */
function aggregatePageResults(pages: PageResult[], baseUrl: string): ExtractedData {
  if (pages.length === 0) {
    return buildExtractedSkeleton(baseUrl, new Date().toISOString());
  }

  // Start with homepage data
  const homepage = pages[0];
  const aggregated = { ...homepage.extracted };

  // Track where each signal was found
  const signalSources: { [key: string]: string[] } = {
    pricing: [],
    faq: [],
    about: [],
    contact: [],
    schema: [],
  };

  // Aggregate signals from all pages
  for (const page of pages) {
    const ex = page.extracted;
    const pageName = page.path === "/" ? "homepage" : page.path;

    // Pricing
    if (ex.hasPricing && !signalSources.pricing.includes(pageName)) {
      aggregated.hasPricing = true;
      signalSources.pricing.push(pageName);
    }

    // FAQ
    if (ex.hasFAQ && !signalSources.faq.includes(pageName)) {
      aggregated.hasFAQ = true;
      signalSources.faq.push(pageName);
    }

    // About
    if (ex.hasAbout && !signalSources.about.includes(pageName)) {
      aggregated.hasAbout = true;
      signalSources.about.push(pageName);
    }

    // Contact
    if (ex.hasContact && !signalSources.contact.includes(pageName)) {
      aggregated.hasContact = true;
      signalSources.contact.push(pageName);
      aggregated.contactEvidence.push(...ex.contactEvidence);
    }

    // Schema
    if (ex.hasSchemaJsonLd && !signalSources.schema.includes(pageName)) {
      aggregated.hasSchemaJsonLd = true;
      aggregated.hasSchema = true;
      signalSources.schema.push(pageName);
      aggregated.schemaTypes.push(...ex.schemaTypes);
    }
  }

  // Deduplicate arrays
  aggregated.contactEvidence = [...new Set(aggregated.contactEvidence)];
  aggregated.schemaTypes = [...new Set(aggregated.schemaTypes)];

  // Update evidence to show where signals were found
  if (aggregated.evidence) {
    const evidence = { ...aggregated.evidence };

    // Add source information to evidence
    if (signalSources.pricing.length > 0) {
      const sources = signalSources.pricing.join(", ");
      evidence.pricingEvidence = [
        ...(evidence.pricingEvidence || []),
        `Found on: ${sources}`,
      ];
    }

    if (signalSources.faq.length > 0) {
      const sources = signalSources.faq.join(", ");
      if (evidence.faqEvidence) {
        evidence.faqEvidence = {
          ...evidence.faqEvidence,
          indirectFaqLinks: [
            ...evidence.faqEvidence.indirectFaqLinks,
            `FAQ found on: ${sources}`,
          ],
        };
      }
    }

    if (signalSources.contact.length > 0) {
      const sources = signalSources.contact.join(", ");
      evidence.contactEvidence = [
        ...(evidence.contactEvidence || []),
        `Contact info found on: ${sources}`,
      ];
    }

    aggregated.evidence = evidence;
  }

  return aggregated;
}

