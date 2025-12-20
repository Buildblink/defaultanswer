/**
 * DefaultAnswer Scoring Engine V1.1
 * 
 * Transparent, explainable scoring based on on-page signals
 * that plausibly influence LLM recommendations.
 * 
 * Total: 100 points
 * - Entity Clarity: 25 pts
 * - Structural Comprehension: 20 pts
 * - Answerability Signals: 20 pts
 * - Trust & Legitimacy: 20 pts
 * - Commercial Clarity: 15 pts
 */

import { extractVisibleTextFromHtml } from "./visible-text";
import { cleanEvidenceText } from "./evidence-text";
export type SnapshotQuality = "ok" | "thin" | "likely_js";

export type FetchDiagnostics = {
  requestedUrl: string;
  finalUrl?: string;
  status?: number;
  ok: boolean;
  errorType?: "blocked" | "timeout" | "dns" | "invalid_url" | "unknown";
  contentType?: string;
  bytes?: number;
  durationMs?: number;
  retryAfter?: string | null;
};

export type AnalysisStatus = "ok" | "blocked" | "snapshot_incomplete" | "error";

export type BreakdownItem = {
  label: string;
  points: number;
  max: number;
  reason: string;
  category: string;
};

export type Evidence = {
  titleText?: string;
  metaDescription?: string;
  h1Text?: string;
  h2Texts?: string[]; // first 8
  schemaTypes?: string[];
  schemaRawSample?: string; // ~first 400 chars (sanitized)
  contactEvidence?: string[];
  aboutEvidence?: string[];
  faqEvidence?: {
    explicitFaqDetected: boolean;
    indirectFaqLinks: string[]; // matched hrefs
    directAnswerSnippets: string[]; // 1–3
  };
  pricingEvidence?: string[]; // short snippets/keywords
};

export type ExtractedData = {
  title?: string;
  metaDescription?: string;
  h1s: string[];
  h2s: string[];
  h3s: string[];
  hasFAQ: boolean;
  hasIndirectFAQ: boolean;
  hasDirectAnswerBlock: boolean;
  hasSchema: boolean; // kept for backward compatibility (alias of hasSchemaJsonLd)
  hasSchemaJsonLd: boolean;
  schemaTypes: string[];
  hasPricing: boolean;
  hasAbout: boolean;
  hasContact: boolean;
  hasContactSignals: boolean;
  contactEvidence: string[];
  domain: string;
  brandGuess: string;
  canonicalUrl?: string;
  evaluatedPage?: string;
  evaluatedUrl?: string;
  fetchedAt?: string;
  evidence?: Evidence;
};

export type FixPlanItem = {
  priority: "high" | "medium" | "low";
  action: string;
};

export type ReasoningBullet = {
  signal: string;
  interpretation: string;
  impact: "positive" | "negative" | "neutral";
};

export type AnalysisResult = {
  score: number;
  breakdown: BreakdownItem[];
  weaknesses: string[];
  fixPlan: FixPlanItem[];
  extracted: ExtractedData;
  reasoning: ReasoningBullet[];
  snapshotQuality?: SnapshotQuality;
  fetchDiagnostics?: FetchDiagnostics;
  analysisStatus?: AnalysisStatus;
};

/**
 * Extract relevant data from HTML
 */
export function extractPageData(html: string, url: string): ExtractedData {
  const domain = extractDomain(url);
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;

  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = metaDescMatch ? decodeHtmlEntities(metaDescMatch[1].trim()) : undefined;

  // Extract H1s
  const h1Regex = /<h1[^>]*>([^<]*(?:<[^/h][^>]*>[^<]*)*)<\/h1>/gi;
  const h1s: string[] = [];
  let h1Match;
  while ((h1Match = h1Regex.exec(html)) !== null) {
    const text = stripHtml(h1Match[1]).trim();
    if (text) h1s.push(text);
  }

  // Extract H2s
  const h2Regex = /<h2[^>]*>([^<]*(?:<[^/h][^>]*>[^<]*)*)<\/h2>/gi;
  const h2s: string[] = [];
  let h2Match;
  while ((h2Match = h2Regex.exec(html)) !== null) {
    const text = stripHtml(h2Match[1]).trim();
    if (text) h2s.push(text);
  }

  // Extract H3s (for FAQ detection)
  const h3Regex = /<h3[^>]*>([^<]*(?:<[^/h][^>]*>[^<]*)*)<\/h3>/gi;
  const h3s: string[] = [];
  let h3Match;
  while ((h3Match = h3Regex.exec(html)) !== null) {
    const text = stripHtml(h3Match[1]).trim();
    if (text) h3s.push(text);
  }

  // Detect FAQ section
  const faqPatterns = /faq|frequently asked|questions|q\s*&\s*a/i;
  const hasFAQ = h2s.some(h => faqPatterns.test(h)) 
    || h3s.some(h => faqPatterns.test(h))
    || /<section[^>]*id=["']faq["']/i.test(html)
    || /<div[^>]*class=["'][^"']*faq[^"']*["']/i.test(html);

  // Link-based (indirect) FAQ/support detection (no crawling, homepage only)
  // If we can find at least one matching link, grant partial FAQ credit later.
  const indirectFaqLinkPatterns = /(\/docs|\/help|\/support|\/faq|\/knowledge|\/academy)([\"'#?\/]|$)/i;
  const indirectFaqLinks = !hasFAQ ? extractMatchingHrefs(html, indirectFaqLinkPatterns, 5) : [];
  const hasIndirectFAQ = indirectFaqLinks.length > 0;

  // Canonical URL (metadata only)
  const canonicalMatch =
    html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : undefined;

  // Guess brand name (used in multiple downstream heuristics)
  const brandGuess = guessBrand(title, domain);

  // Direct Answer Blocks heuristic (single-page only)
  // - definition-like patterns near top
  // - OR a "how it works/process" heading plus >=2 steps/bullets
  const visibleText = stripHtml(html);
  const topTextWindow = visibleText.slice(0, 2500);
  const def = detectDefinitionBlockSnippets(topTextWindow, brandGuess);
  const hasDefinitionBlock = def.hit;
  const hasHowItWorksHeading =
    [...h2s, ...h3s].some((h) => /how\s+it\s+works?|process/i.test(h));
  const listItemCount = (html.match(/<li\b/gi) || []).length;
  const hasNumberedSteps = /\b1\.\s+.{0,200}\b2\.\s+/s.test(topTextWindow);
  const hasDirectAnswerBlock =
    hasDefinitionBlock || (hasHowItWorksHeading && (listItemCount >= 2 || hasNumberedSteps));
  const directAnswerSnippets = [
    ...def.snippets,
    ...(hasHowItWorksHeading ? ["How it works / process section detected"] : []),
  ]
    .map((s) => sanitizeShort(s, 160))
    .slice(0, 3);

  // Schema detection robustness:
  // - script type contains ld+json (covers charset variants)
  // - OR "@context" and "schema.org" appear within a small window
  const hasSchemaScriptType = /<script[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>/i.test(html);
  const hasSchemaContextWindow = schemaContextWindowHeuristic(html);
  const hasSchemaJsonLd = hasSchemaScriptType || hasSchemaContextWindow;
  const schemaTypes = hasSchemaJsonLd ? extractSchemaTypes(html) : [];
  const schemaRawSample = hasSchemaJsonLd ? extractFirstJsonLdRawSample(html) : undefined;
  const hasSchema = hasSchemaJsonLd;

  // Detect pricing mentions using visible text for detection and cleaned text for evidence
  const pricingVisibleText = extractVisibleTextFromHtml(html);
  const cleanedPricingText = cleanEvidenceText(pricingVisibleText);
  const pricingPatterns = /pricing|plans|price|\$\d|\u20ac\d|\u0141\d|\/month|\/year|per month|per year|free tier|free plan/i;
  const hasPricing = pricingPatterns.test(pricingVisibleText.toLowerCase());
  let pricingEvidence: string[] = [];
  if (hasPricing) {
    const evidenceLower = cleanedPricingText.toLowerCase();
    const m = pricingPatterns.exec(evidenceLower);
    if (m?.index != null) {
      pricingEvidence = [extractContext(cleanedPricingText, m.index, 160)];
    } else {
      const snippet = firstPricingSnippetFromVisible(pricingVisibleText);
      pricingEvidence = snippet ? [snippet] : ["Pricing detected"];
    }
  }

  // Detect About page link
  const hasAbout =
    /<a[^>]*href=["'][^"']*(about|company|team|mission|our-story|our_story|who-we-are|who_we_are)[^"']*["'][^>]*>/i.test(html) ||
    /<a[^>]*>(\s*)(about|company|team|mission|our story|who we are)(\s*)<\/a>/i.test(html);
  const aboutEvidence = extractAboutEvidence(html, 3);

  // Detect Contact page or email
  const contactEvidence: string[] = [];
  const hasMailto = /<a[^>]*href=["']mailto:[^"']*["'][^>]*>/i.test(html);
  if (hasMailto) contactEvidence.push("mailto link");
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(html);
  if (hasEmail) contactEvidence.push("email found");
  const hasContactLinkHref = /<a[^>]*href=["'][^"']*(contact|support|help)[^"']*["'][^>]*>/i.test(html);
  const hasContactLinkText = /<a[^>]*>([^<]{0,80})(contact|support|help|customer support|get in touch)([^<]{0,80})<\/a>/i.test(html);
  if (hasContactLinkHref || hasContactLinkText) contactEvidence.push("support/contact link");
  const hasPhoneLike = detectPhoneLike(html);
  if (hasPhoneLike) contactEvidence.push("phone-like pattern");
  const hasContactSignals = contactEvidence.length > 0;
  const hasContact = hasContactSignals;

  const evidence: Evidence = {
    titleText: title ? sanitizeShort(title, 140) : undefined,
    metaDescription: metaDescription ? sanitizeShort(metaDescription, 200) : undefined,
    h1Text: h1s[0] ? sanitizeShort(h1s[0], 160) : undefined,
    h2Texts: h2s.slice(0, 8).map((h) => sanitizeShort(h, 120)),
    schemaTypes: schemaTypes.slice(0, 8),
    schemaRawSample: schemaRawSample ? sanitizeShort(schemaRawSample, 400) : undefined,
    contactEvidence: contactEvidence.slice(0, 5),
    aboutEvidence: aboutEvidence.slice(0, 3),
    faqEvidence: {
      explicitFaqDetected: hasFAQ,
      indirectFaqLinks,
      directAnswerSnippets,
    },
    pricingEvidence: pricingEvidence.slice(0, 3),
  };

  return {
    title,
    metaDescription,
    h1s,
    h2s,
    h3s,
    hasFAQ,
    hasIndirectFAQ,
    hasDirectAnswerBlock,
    hasSchema,
    hasSchemaJsonLd,
    schemaTypes,
    hasPricing,
    hasAbout,
    hasContact,
    hasContactSignals,
    contactEvidence,
    domain,
    brandGuess,
    canonicalUrl,
    evidence,
  };
}

/**
 * Calculate score breakdown based on extracted data
 */
export function calculateScore(extracted: ExtractedData): {
  score: number;
  breakdown: BreakdownItem[];
} {
  const breakdown: BreakdownItem[] = [];

  // ===== 1. Entity Clarity (25 pts) =====
  
  // Title exists & includes brand/entity (10)
  const titleHasBrand = extracted.title 
    && extracted.brandGuess 
    && extracted.title.toLowerCase().includes(extracted.brandGuess.toLowerCase());
  const titlePoints = extracted.title 
    ? (titleHasBrand ? 10 : 5) 
    : 0;
  breakdown.push({
    label: "Title includes brand/entity",
    points: titlePoints,
    max: 10,
    reason: !extracted.title 
      ? "No title tag found" 
      : titleHasBrand 
        ? `Title "${extracted.title.slice(0, 50)}..." includes brand name`
        : "Title exists but brand name not clearly present",
    category: "Entity Clarity",
  });

  // Meta description exists (5)
  const metaPoints = extracted.metaDescription ? 5 : 0;
  breakdown.push({
    label: "Meta description present",
    points: metaPoints,
    max: 5,
    reason: extracted.metaDescription 
      ? `Meta description found (${extracted.metaDescription.length} chars)`
      : "No meta description tag found",
    category: "Entity Clarity",
  });

  // H1 clearly describes product/category (10)
  const h1Quality = evaluateH1Quality(extracted.h1s, extracted.brandGuess);
  breakdown.push({
    label: "H1 describes product/category",
    points: h1Quality.points,
    max: 10,
    reason: h1Quality.reason,
    category: "Entity Clarity",
  });

  // ===== 2. Structural Comprehension (20 pts) =====

  // ≥1 H1 present (5)
  const hasH1Points = extracted.h1s.length >= 1 ? 5 : 0;
  breakdown.push({
    label: "H1 heading present",
    points: hasH1Points,
    max: 5,
    reason: extracted.h1s.length >= 1 
      ? `Found ${extracted.h1s.length} H1 heading(s)`
      : "No H1 heading found on page",
    category: "Structural Comprehension",
  });

  // ≥3 H2s present (5)
  const h2Count = extracted.h2s.length;
  const h2Points = h2Count >= 3 ? 5 : h2Count >= 1 ? 2 : 0;
  breakdown.push({
    label: "Multiple H2 headings",
    points: h2Points,
    max: 5,
    reason: h2Count >= 3 
      ? `Found ${h2Count} H2 headings providing good structure`
      : h2Count >= 1 
        ? `Only ${h2Count} H2 heading(s) found, recommend 3+`
        : "No H2 headings found",
    category: "Structural Comprehension",
  });

  // Headings are not generic (10)
  const headingQuality = evaluateHeadingQuality([...extracted.h1s, ...extracted.h2s]);
  breakdown.push({
    label: "Headings are descriptive",
    points: headingQuality.points,
    max: 10,
    reason: headingQuality.reason,
    category: "Structural Comprehension",
  });

  // ===== 3. Answerability Signals (20 pts) =====

  // FAQ section detected (10)
  const faqPoints = extracted.hasFAQ
    ? 10
    : extracted.hasDirectAnswerBlock
      ? 6
      : extracted.hasIndirectFAQ
        ? 4
        : 0;
  breakdown.push({
    label: "FAQ section present",
    points: faqPoints,
    max: 10,
    reason: extracted.hasFAQ
      ? "FAQ section detected on page"
      : extracted.hasDirectAnswerBlock
        ? "Direct answer blocks detected (partial credit)"
        : extracted.hasIndirectFAQ
          ? "Indirect FAQ presence detected"
          : "No retrievable answer blocks found on homepage",
    category: "Answerability Signals",
  });

  // Schema.org JSON-LD present (10)
  const schemaPoints = extracted.hasSchemaJsonLd ? 10 : 0;
  breakdown.push({
    label: "Schema.org markup",
    points: schemaPoints,
    max: 10,
    reason: extracted.hasSchemaJsonLd
      ? extracted.schemaTypes.length
        ? `JSON-LD structured data found (types: ${extracted.schemaTypes.slice(0, 5).join(", ")})`
        : "JSON-LD structured data found"
      : "No Schema.org JSON-LD found — reduces entity certainty",
    category: "Answerability Signals",
  });

  // ===== 4. Trust & Legitimacy (20 pts) =====

  // About page link present (10)
  const aboutPoints = extracted.hasAbout ? 10 : 0;
  breakdown.push({
    label: "About page linked",
    points: aboutPoints,
    max: 10,
    reason: extracted.hasAbout 
      ? "About/Company/Team page link found"
      : "No About page link found — reduces perceived legitimacy",
    category: "Trust & Legitimacy",
  });

  // Contact page or email present (10)
  const contactPoints = extracted.hasContactSignals ? 10 : 0;
  breakdown.push({
    label: "Contact info present",
    points: contactPoints,
    max: 10,
    reason: extracted.hasContactSignals
      ? `Contact signals found (${extracted.contactEvidence.slice(0, 3).join(", ")})`
      : "No contact signals found — reduces trust and recommendation confidence",
    category: "Trust & Legitimacy",
  });

  // ===== 5. Commercial Clarity (15 pts) =====

  // Pricing or plans mentioned (15)
  const pricingPoints = extracted.hasPricing ? 15 : 0;
  breakdown.push({
    label: "Pricing/plans visible",
    points: pricingPoints,
    max: 15,
    reason: extracted.hasPricing 
      ? "Pricing or plans information detected"
      : "No pricing information found — unclear what users get",
    category: "Commercial Clarity",
  });

  // Calculate total
  const score = breakdown.reduce((sum, item) => sum + item.points, 0);

  return { score, breakdown };
}

/**
 * Generate weaknesses based on low-scoring areas
 */
export function generateWeaknesses(breakdown: BreakdownItem[]): string[] {
  const weaknesses: string[] = [];

  for (const item of breakdown) {
    const percentage = item.points / item.max;
    
    if (percentage < 0.7) {
      // Generate contextual weakness message
      const weakness = getWeaknessMessage(item);
      if (weakness) weaknesses.push(weakness);
    }
  }

  return weaknesses;
}

/**
 * Generate fix plan based on weaknesses
 */
export function generateFixPlan(breakdown: BreakdownItem[], extracted: ExtractedData): FixPlanItem[] {
  const fixes: FixPlanItem[] = [];

  for (const item of breakdown) {
    const percentage = item.points / item.max;
    
    if (percentage < 0.7) {
      const fix = getFixAction(item, extracted);
      if (fix) fixes.push(fix);
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  fixes.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to 7 fixes
  return fixes.slice(0, 7);
}

// ===== Helper Functions =====

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function guessBrand(title: string | undefined, domain: string): string {
  // Try first meaningful word from title
  if (title) {
    const words = title.split(/[\s\-–—|:]+/);
    const firstWord = words[0]?.trim();
    if (firstWord && firstWord.length > 1 && !/^(the|a|an|home|welcome)$/i.test(firstWord)) {
      return firstWord;
    }
  }
  
  // Fallback to domain name
  const domainName = domain.split(".")[0];
  return domainName.charAt(0).toUpperCase() + domainName.slice(1);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function detectDefinitionBlockSnippets(
  text: string,
  brandGuess: string
): { hit: boolean; snippets: string[] } {
  const t = (text || "");
  const lower = t.toLowerCase();
  const brand = (brandGuess || "").toLowerCase();
  const snippets: string[] = [];
  if (!t) return { hit: false, snippets };

  // Prefer brand-anchored patterns when possible
  if (brand && brand.length >= 2) {
    const re = new RegExp(
      `\\b${escapeRegex(brand)}\\b\\s+(is\\s+a|helps|is\\s+an|provides|builds|offers)\\b`,
      "i"
    );
    const m = re.exec(t);
    if (m) {
      snippets.push(extractContext(t, m.index, 140));
    }
    const whatIs = new RegExp(`what\\s+is\\s+${escapeRegex(brand)}`, "i");
    const w = whatIs.exec(t);
    if (w) {
      snippets.push(extractContext(t, w.index, 140));
    }
  }

  // Generic definition patterns (less strict)
  const generic = /\b(is a|helps|built for)\b/i;
  const g = generic.exec(t);
  if (g) snippets.push(extractContext(t, g.index, 140));

  return { hit: snippets.length > 0, snippets: uniqStrings(snippets).slice(0, 3) };
}

function detectPhoneLike(html: string): boolean {
  const t = stripHtml(html);
  // Simple phone-like pattern: requires 10+ digits across groups, avoids matching plain years.
  // Examples: (555) 123-4567, +1 555 123 4567, 555-123-4567
  const re = /(\+?\d{1,3}[\s.-]?)?(\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/g;
  const matches = t.match(re) || [];
  return matches.some((m) => {
    const digits = (m.match(/\d/g) || []).length;
    if (digits < 10) return false;
    // avoid pure year-like strings
    if (/^\s*20\d{2}\s*$/.test(m)) return false;
    return true;
  });
}

function schemaContextWindowHeuristic(html: string): boolean {
  const idx = html.search(/@context/i);
  if (idx < 0) return false;
  const start = Math.max(0, idx - 2500);
  const end = Math.min(html.length, idx + 2500);
  const win = html.slice(start, end);
  return /schema\.org/i.test(win);
}

function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  const scriptRe = /<script[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const json = JSON.parse(raw);
      collectTypesFromJsonLd(json, types);
    } catch {
      // ignore parse errors; presence still counts via hasSchemaJsonLd
    }
  }
  return Array.from(types);
}

function collectTypesFromJsonLd(value: any, out: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) collectTypesFromJsonLd(v, out);
    return;
  }
  if (typeof value !== "object") return;

  const typeVal = (value as any)["@type"];
  if (typeof typeVal === "string") out.add(typeVal);
  if (Array.isArray(typeVal)) {
    for (const t of typeVal) if (typeof t === "string") out.add(t);
  }

  const graph = (value as any)["@graph"];
  if (graph) collectTypesFromJsonLd(graph, out);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractContext(text: string, index: number, maxLen: number): string {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + maxLen);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function uniqStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const k = (v || "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function sanitizeShort(text: string, maxLen: number): string {
  return (text || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function extractMatchingHrefs(html: string, hrefRe: RegExp, limit: number): string[] {
  const out: string[] = [];
  const re = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = (m[1] || "").trim();
    if (!href) continue;
    if (hrefRe.test(href)) out.push(href);
    if (out.length >= limit) break;
  }
  return uniqStrings(out).slice(0, limit);
}

function extractAboutEvidence(html: string, limit: number): string[] {
  const out: string[] = [];
  const re = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const textRe = /(about|company|team|mission|our story|who we are)/i;
  const hrefRe = /(about|company|team|mission|our-story|who-we-are)/i;
  while ((m = re.exec(html)) !== null) {
    const href = (m[1] || "").trim();
    const text = stripHtml(m[2] || "").trim();
    if (hrefRe.test(href) || textRe.test(text)) {
      out.push(`link: ${href}${text ? ` (“${sanitizeShort(text, 60)}”)` : ""}`);
    }
    if (out.length >= limit) break;
  }
  return uniqStrings(out).slice(0, limit);
}

function extractKeywordSnippets(text: string, keywordRe: RegExp, limit: number): string[] {
  const out: string[] = [];
  const t = (text || "").replace(/\s+/g, " ");
  const re = new RegExp(keywordRe.source, keywordRe.flags.includes("i") ? "ig" : "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    out.push(extractContext(t, m.index, 120));
    if (out.length >= limit) break;
  }
  return uniqStrings(out).slice(0, limit);
}

function extractPricingSnippets(text: string, keywordRe: RegExp, limit: number): string[] {
  if (!text) return [];
  const flags = keywordRe.flags.includes("g") ? keywordRe.flags : `${keywordRe.flags}g`;
  const re = new RegExp(keywordRe.source, flags);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(makeSnippet(text, m.index));
    if (out.length >= limit) break;
    if (!re.global) break;
  }
  return uniqStrings(out).slice(0, limit);
}

function makeSnippet(text: string, index: number, before = 80, after = 160): string {
  const start = Math.max(0, index - before);
  const end = Math.min(text.length, index + after);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function firstPricingSnippetFromVisible(visibleText: string): string {
  const lower = visibleText.toLowerCase();
  const idx = lower.indexOf("pricing");
  if (idx < 0) return "";
  const start = Math.max(0, idx - 80);
  const end = Math.min(visibleText.length, idx + 160);
  const window = visibleText.slice(start, end);
  return cleanEvidenceText(window).replace(/\s+/g, " ").trim();
}

function extractFirstJsonLdRawSample(html: string): string | undefined {
  const scriptRe = /<script[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/i;
  const m = scriptRe.exec(html);
  if (!m) return undefined;
  const raw = (m[1] || "").replace(/\s+/g, " ").trim();
  return raw.slice(0, 400);
}

function evaluateH1Quality(h1s: string[], brand: string): { points: number; reason: string } {
  if (h1s.length === 0) {
    return { points: 0, reason: "No H1 heading found" };
  }

  const h1 = h1s[0];
  const genericPatterns = /^(welcome|home|hello|hey|hi|untitled|page|website)$/i;
  
  if (genericPatterns.test(h1.trim())) {
    return { points: 2, reason: `H1 "${h1}" is too generic for LLMs to understand` };
  }

  // Check if H1 is descriptive (has multiple words)
  const wordCount = h1.split(/\s+/).length;
  if (wordCount >= 3) {
    return { points: 10, reason: `H1 "${h1.slice(0, 50)}..." clearly describes the offering` };
  } else if (wordCount >= 2) {
    return { points: 7, reason: `H1 "${h1}" is brief — consider more descriptive text` };
  } else {
    return { points: 4, reason: `H1 "${h1}" is a single word — add context for LLMs` };
  }
}

function evaluateHeadingQuality(headings: string[]): { points: number; reason: string } {
  if (headings.length === 0) {
    return { points: 0, reason: "No headings found on page" };
  }

  const genericPatterns = /^(welcome|home|hello|hey|hi|untitled|section|more|learn more|click here|read more)$/i;
  const genericCount = headings.filter(h => genericPatterns.test(h.trim())).length;
  const totalCount = headings.length;
  const genericRatio = genericCount / totalCount;

  if (genericRatio > 0.5) {
    return { points: 2, reason: `${genericCount}/${totalCount} headings are generic (Welcome, Home, etc.)` };
  } else if (genericRatio > 0.2) {
    return { points: 6, reason: "Some headings are generic — use descriptive text" };
  } else {
    return { points: 10, reason: "Headings are descriptive and meaningful" };
  }
}

function getWeaknessMessage(item: BreakdownItem): string | null {
  const messages: Record<string, string> = {
    "Title includes brand/entity": "AI lacks a clear definition of what your brand is — your title doesn't establish entity identity.",
    "Meta description present": "Missing meta description means LLMs have less context about your page's purpose.",
    "H1 describes product/category": "Your main heading doesn't clearly describe what you offer — LLMs need explicit category signals.",
    "H1 heading present": "No H1 heading found — this is a critical structural signal for LLMs.",
    "Multiple H2 headings": "Insufficient heading structure — LLMs rely on headings to understand page organization.",
    "Headings are descriptive": "Generic headings like 'Welcome' or 'Home' don't help LLMs understand your content.",
    "FAQ section present": "No FAQ section found — LLMs heavily weight Q&A-style content for recommendations.",
    "Schema.org markup": "Missing structured data — Schema.org helps LLMs categorize your entity type.",
    "About page linked": "No About page detected — LLMs prefer businesses with verifiable backgrounds.",
    "Contact info present": "No contact information found — this reduces trust signals for LLM recommendations.",
    "Pricing/plans visible": "Pricing not visible — unclear commercial offering weakens recommendation likelihood.",
  };

  return messages[item.label] || null;
}

function getFixAction(item: BreakdownItem, extracted: ExtractedData): FixPlanItem | null {
  const fixes: Record<string, FixPlanItem> = {
    "Title includes brand/entity": {
      priority: "high",
      action: `Update your title tag to include "${extracted.brandGuess}" and a clear product category description.`,
    },
    "Meta description present": {
      priority: "medium",
      action: "Add a meta description (150-160 chars) that clearly states what you offer and who it's for.",
    },
    "H1 describes product/category": {
      priority: "high",
      action: "Rewrite your H1 to be a clear, complete sentence that defines your product category.",
    },
    "H1 heading present": {
      priority: "high",
      action: "Add an H1 heading that clearly states what your product/service is in one sentence.",
    },
    "Multiple H2 headings": {
      priority: "medium",
      action: "Add H2 sections for Features, Benefits, How It Works, and Use Cases.",
    },
    "Headings are descriptive": {
      priority: "medium",
      action: "Replace generic headings with specific, descriptive text that explains each section's content.",
    },
    "FAQ section present": {
      // If we already earned partial answerability via direct answer blocks, treat FAQ as retrieval-alignment refinement (MEDIUM),
      // otherwise it's a foundational HIGH priority fix.
      priority: extracted.hasDirectAnswerBlock ? "medium" : "high",
      action: extracted.hasDirectAnswerBlock
        ? `Convert key answers into a visible FAQ section for retrieval alignment (e.g., 'What is ${extracted.brandGuess}?', 'Who is it for?', 'How does it work?').`
        : `Add an FAQ section answering: 'What is ${extracted.brandGuess}?', 'Who is it for?', 'How does it work?'`,
    },
    "Schema.org markup": {
      priority: "medium",
      action: "Add Schema.org JSON-LD for Organization, Product, or SoftwareApplication as appropriate.",
    },
    "About page linked": {
      priority: "medium",
      action: "Create an About page explaining your company background, team, and mission.",
    },
    "Contact info present": {
      priority: "low",
      action: "Add a Contact page or visible email address to establish business legitimacy.",
    },
    "Pricing/plans visible": {
      priority: "low",
      action: "Add a Pricing section or page with clear plan names and what users get.",
    },
  };

  return fixes[item.label] || null;
}

/**
 * Generate simulated LLM reasoning bullets based on extracted signals
 * V1.2: Explains how an LLM would interpret the page
 */
export function generateReasoning(extracted: ExtractedData, breakdown: BreakdownItem[]): ReasoningBullet[] {
  const bullets: ReasoningBullet[] = [];
  const brand = extracted.brandGuess || "this site";

  // === Entity Clarity Reasoning ===
  if (extracted.title && extracted.h1s.length > 0) {
    const h1 = extracted.h1s[0];
    const titleScore = breakdown.find(b => b.label === "Title includes brand/entity");
    const h1Score = breakdown.find(b => b.label === "H1 describes product/category");
    
    if (titleScore && titleScore.points >= 7 && h1Score && h1Score.points >= 7) {
      bullets.push({
        signal: "Entity Clarity",
        interpretation: `When asked "What is ${brand}?", I can confidently extract that the title "${extracted.title.slice(0, 60)}${extracted.title.length > 60 ? '...' : ''}" and main heading "${h1.slice(0, 50)}${h1.length > 50 ? '...' : ''}" establish ${brand} as a clear entity in its category.`,
        impact: "positive",
      });
    } else if (titleScore && titleScore.points < 5) {
      bullets.push({
        signal: "Entity Clarity",
        interpretation: `The page title doesn't clearly establish what ${brand} is. When users ask "What is ${brand}?", I would struggle to provide a confident answer because the core identity signal is weak or generic.`,
        impact: "negative",
      });
    }
  } else if (!extracted.title || extracted.h1s.length === 0) {
    bullets.push({
      signal: "Entity Clarity",
      interpretation: `${brand} lacks fundamental identity signals — ${!extracted.title ? "no title tag" : ""}${!extracted.title && extracted.h1s.length === 0 ? " and " : ""}${extracted.h1s.length === 0 ? "no H1 heading" : ""}. When a user asks me to recommend solutions in this category, I cannot confidently identify what ${brand} even is.`,
      impact: "negative",
    });
  }

  // === Structural Reasoning ===
  const h2Count = extracted.h2s.length;
  const headingScore = breakdown.find(b => b.label === "Headings are descriptive");
  
  if (h2Count >= 3 && headingScore && headingScore.points >= 7) {
    bullets.push({
      signal: "Content Structure",
      interpretation: `The page has ${h2Count} well-organized sections with descriptive headings. This structured layout helps me understand the product's features, benefits, and use cases — making it easier to cite ${brand} when answering relevant queries.`,
      impact: "positive",
    });
  } else if (h2Count < 2) {
    bullets.push({
      signal: "Content Structure",
      interpretation: `With only ${h2Count} section heading${h2Count === 1 ? '' : 's'}, the page lacks the structural depth I need to understand ${brand}'s full offering. Competitors with better-organized content will be easier for me to comprehend and recommend.`,
      impact: "negative",
    });
  }

  // === Answerability Reasoning ===
  if (extracted.hasFAQ) {
    bullets.push({
      signal: "Answerability",
      interpretation: `The FAQ section is particularly valuable — it presents information in a question-answer format that directly matches how users query me. When someone asks "${extracted.brandGuess ? `Is ${extracted.brandGuess} good for X?` : 'common questions'}", I can often pull relevant answers from FAQ content.`,
      impact: "positive",
    });
  } else {
    bullets.push({
      signal: "Answerability",
      interpretation: `Without an FAQ section, the page misses a key opportunity. I'm trained on billions of Q&A pairs, so FAQ-formatted content is highly aligned with how I process and retrieve information. Adding one would significantly improve ${brand}'s citation likelihood.`,
      impact: "negative",
    });
  }

  // === Schema/Structured Data Reasoning ===
  if (extracted.hasSchema) {
    bullets.push({
      signal: "Structured Data",
      interpretation: `The presence of Schema.org markup provides machine-readable entity information. This structured data helps me categorize ${brand} correctly and understand its relationship to competitors and the broader market.`,
      impact: "positive",
    });
  }

  // === Trust & Legitimacy Reasoning ===
  const hasAbout = extracted.hasAbout;
  const hasContact = extracted.hasContactSignals;
  
  if (hasAbout && hasContact) {
    bullets.push({
      signal: "Trust Signals",
      interpretation: `${brand} shows legitimate business indicators — About and Contact pages are present. When recommending products, I weigh these trust signals because users expect me to suggest real, reachable businesses.`,
      impact: "positive",
    });
  } else if (!hasAbout && !hasContact) {
    bullets.push({
      signal: "Trust Signals",
      interpretation: `I cannot find About or Contact information for ${brand}. This lack of verifiable business presence makes me hesitant to recommend it over competitors who clearly establish their legitimacy and reachability.`,
      impact: "negative",
    });
  }

  // === Commercial Clarity Reasoning ===
  if (extracted.hasPricing) {
    bullets.push({
      signal: "Commercial Clarity",
      interpretation: `Pricing information is visible, which helps me answer "How much does ${brand} cost?" queries. Users often ask me to compare solutions by price, and ${brand} can be included in those comparisons.`,
      impact: "positive",
    });
  } else {
    bullets.push({
      signal: "Commercial Clarity",
      interpretation: `No clear pricing is visible on the homepage. When users ask me "What's the best affordable X?" or "Compare pricing for X solutions", I cannot include ${brand} in my response because I don't know its pricing tier.`,
      impact: "negative",
    });
  }

  // Limit to 5 most impactful bullets, prioritizing negatives (actionable) then positives
  const negatives = bullets.filter(b => b.impact === "negative");
  const positives = bullets.filter(b => b.impact === "positive");
  
  // Return mix: up to 3 negatives (actionable feedback) + up to 2 positives (strengths)
  return [...negatives.slice(0, 3), ...positives.slice(0, 2)].slice(0, 5);
}

/**
 * Main analysis function
 */
export function analyzeHtml(html: string, url: string): AnalysisResult {
  const extracted = extractPageData(html, url);
  const { score, breakdown } = calculateScore(extracted);
  const weaknesses = generateWeaknesses(breakdown);
  const fixPlan = generateFixPlan(breakdown, extracted);
  const reasoning = generateReasoning(extracted, breakdown);

  return {
    score,
    breakdown,
    weaknesses,
    fixPlan,
    extracted,
    reasoning,
  };
}
