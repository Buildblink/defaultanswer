import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getEntitlements } from "@/lib/auth/entitlements";
import { getLiveProofPromptSet } from "@/lib/report/liveproof-prompts";

type MentionCheckRequest = {
  brandName: string;
  domain: string;
  model?: string;
  category?: string;
};

type MentionCheckPromptResult = {
  id: string;
  title: string;
  prompt: string;
  responseText: string;
  result: {
    mentioned: boolean;
    rank: number | null;
    recommended: string | null;
    alternatives: string[];
    confidence: "high" | "medium" | "low";
    reason: string | null;
    exclusionReason: string | null;
    verdict: "Recommended" | "Not Recommended";
  };
};

type MentionCheckResponse = {
  category: string;
  prompts: Array<{ id: string; text: string }>;
  results: MentionCheckPromptResult[];
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const requestLog = new Map<string, number[]>();

export async function POST(request: Request) {
  const { isPro } = await getEntitlements();
  if (!isPro) {
    return NextResponse.json({ error: "Pro required." }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set." }, { status: 500 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let payload: MentionCheckRequest;
  try {
    payload = (await request.json()) as MentionCheckRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { brandName, domain, model, category } = payload || {};
  if (typeof brandName !== "string" || typeof domain !== "string") {
    return NextResponse.json({ error: "Invalid brand or domain." }, { status: 400 });
  }
  if (!brandName.trim() && !domain.trim()) {
    return NextResponse.json({ error: "Brand or domain required." }, { status: 400 });
  }
  if (model && !/^[a-zA-Z0-9._-]{1,64}$/.test(model)) {
    return NextResponse.json({ error: "Invalid model." }, { status: 400 });
  }

  const selectedModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "Category required." }, { status: 400 });
  }

  const promptSet = getLiveProofPromptSet({ brandName, domain, category });

  try {
    const results = await Promise.all(
      promptSet.map(async (prompt) => {
        const response = await openai.chat.completions.create({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content:
                "Answer the user's question with a short ranked list (max 5). Include brief reasons.",
            },
            { role: "user", content: prompt.text },
          ],
          temperature: 0.2,
          max_tokens: 350,
        });
        const responseText = response.choices[0]?.message?.content?.trim() || "";
        const analysis = analyzeResponse(responseText, brandName, domain);

        return {
          id: prompt.id,
          title: prompt.title,
          prompt: prompt.text,
          responseText,
          result: analysis,
        };
      })
    );

    const result: MentionCheckResponse = {
      category,
      prompts: promptSet.map((prompt) => ({ id: prompt.id, text: prompt.text })),
      results,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.warn("[mention-check] upstream failure", err);
    return NextResponse.json({ error: "Upstream model call failed." }, { status: 502 });
  }
}

function analyzeResponse(text: string, brandName: string, domain: string) {
  const response = text || "";
  const responseLower = response.toLowerCase();
  const normalizedDomain = normalizeDomain(domain);
  const variants = buildBrandVariants(brandName, normalizedDomain);
  const mentioned = variants.some((variant) => variant && responseLower.includes(variant));

  const listLines = extractListLines(response);
  const recommended = extractRecommendedTool(response);
  const rank = findBrandRank(listLines, variants, recommended, mentioned);
  const alternatives = extractAlternativesFromList(listLines, variants, recommended).slice(0, 3);
  const confidence = resolveConfidence(responseLower, recommended, listLines.length > 0);
  const reason = mentioned ? extractReason(response) : "Brand not mentioned in AI recommendation";
  const exclusionReason = mentioned ? null : detectExclusionReason(responseLower);
  const verdict: "Recommended" | "Not Recommended" = mentioned
    ? "Recommended"
    : "Not Recommended";

  return {
    mentioned,
    rank,
    recommended,
    alternatives,
    confidence,
    reason,
    exclusionReason,
    verdict,
  };
}

function normalizeDomain(domain: string): string {
  const trimmed = (domain || "").trim();
  if (!trimmed) return "";
  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    return trimmed.toLowerCase();
  }
  return trimmed.replace(/^www\./i, "").toLowerCase();
}

function buildBrandVariants(brand: string, domain: string): string[] {
  const variants = new Set<string>();
  const cleanBrand = (brand || "").trim().toLowerCase();
  if (cleanBrand) {
    variants.add(cleanBrand);
    variants.add(cleanBrand.replace(/\s+/g, ""));
  }
  const cleanDomain = (domain || "").trim().toLowerCase();
  if (cleanDomain) {
    variants.add(cleanDomain);
    variants.add(`www.${cleanDomain}`);
  }
  return Array.from(variants).filter((v) => v.length >= 3);
}

function extractListLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const listLines: string[] = [];
  const bulletRegex = /^\s*(?:\d+[\.\)]|[-*])\s+/;
  for (const line of lines) {
    if (bulletRegex.test(line) || line.includes("|")) {
      listLines.push(line);
    }
  }
  return listLines;
}

function findBrandRank(
  lines: string[],
  variants: string[],
  recommended: string | null,
  mentioned: boolean
): number | null {
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)[\.\)]\s+/);
    if (!match) continue;
    const lower = line.toLowerCase();
    if (variants.some((v) => v && lower.includes(v))) {
      return Number(match[1]);
    }
  }
  if (mentioned && recommended && variants.some((v) => v && recommended.toLowerCase().includes(v))) {
    return 1;
  }
  return mentioned ? 1 : null;
}

function extractRecommendedTool(text: string): string | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const direct = lines.find((line) => /^(recommendation|recommended)\s*:/i.test(line));
  if (direct) {
    const after = direct.split(":").slice(1).join(":").trim();
    return extractCandidateLabel(after);
  }

  const recommendSentence = text.match(/I recommend ([A-Z][A-Za-z0-9\s\.\-]{1,60})/);
  if (recommendSentence) {
    return extractCandidateLabel(recommendSentence[1]);
  }

  const boldMatch = text.match(/\*\*([A-Za-z0-9][^*]{1,40})\*\*/);
  if (boldMatch) {
    return extractCandidateLabel(boldMatch[1]);
  }

  const listLines = extractListLines(text);
  if (listLines.length > 0) {
    const first = stripListPrefix(listLines[0]);
    return extractCandidateLabel(first);
  }

  const nameMatches = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
  const firstCandidate = nameMatches.find((n) => !STOPWORDS.has(n.toLowerCase()));
  return firstCandidate || null;
}

function extractAlternativesFromList(
  lines: string[],
  variants: string[],
  recommended: string | null
): string[] {
  const excluded = new Set(variants.map((v) => v.toLowerCase()));
  if (recommended) excluded.add(recommended.toLowerCase());
  const candidates: string[] = [];
  for (const line of lines) {
    const cleaned = stripListPrefix(line);
    const tableParts = cleaned.split("|").map((part) => part.trim()).filter(Boolean);
    const firstCell = tableParts[0] || cleaned;
    const label = extractCandidateLabel(firstCell);
    if (label && !excluded.has(label.toLowerCase())) {
      candidates.push(label);
    }

    const domainMatches = cleaned.match(/([a-z0-9-]+\.)+[a-z]{2,}/gi) || [];
    for (const d of domainMatches) {
      const lower = d.toLowerCase();
      if (!excluded.has(lower)) {
        candidates.push(d);
      }
    }

    const nameMatches = cleaned.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
    for (const n of nameMatches) {
      const lower = n.toLowerCase();
      if (excluded.has(lower)) continue;
      if (STOPWORDS.has(lower)) continue;
      candidates.push(n);
    }
  }

  const unique: string[] = [];
  for (const item of candidates) {
    if (unique.some((u) => u.toLowerCase() === item.toLowerCase())) continue;
    unique.push(item);
    if (unique.length >= 12) break;
  }
  return unique;
}

function stripListPrefix(line: string): string {
  return line.replace(/^\s*(?:\d+[\.\)]|[-*])\s+/, "").trim();
}

function extractCandidateLabel(text: string): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/\s[-:]\s/);
  const candidate = parts[0] || cleaned;
  const normalized = candidate.replace(/^[\W_]+/, "").trim();
  return normalized || null;
}

function resolveConfidence(
  responseLower: string,
  recommended: string | null,
  hasList: boolean
): "high" | "medium" | "low" {
  const definitive =
    responseLower.includes("i recommend") ||
    responseLower.includes("my recommendation is") ||
    responseLower.includes("recommendation:");
  if (responseLower.includes("it depends")) return "low";
  if (definitive && recommended && !hasList) return "high";
  if (definitive || recommended) return "medium";
  return "low";
}

function extractReason(text: string): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const because = sentences.find((s) => /because/i.test(s));
  if (because) return truncateSentence(because);
  if (sentences.length > 0) return truncateSentence(sentences[0]);
  return null;
}

function detectExclusionReason(textLower: string): string | null {
  if (/pricing|price|budget|cost/i.test(textLower)) return "Pricing or budget constraints.";
  if (/enterprise|large teams|large org/i.test(textLower)) return "Enterprise positioning.";
  if (/unclear|insufficient|not enough info|limited information/i.test(textLower)) {
    return "Insufficient public information.";
  }
  return null;
}

function truncateSentence(sentence: string): string {
  const trimmed = sentence.trim();
  if (trimmed.length <= 200) return trimmed;
  return `${trimmed.slice(0, 197)}...`;
}

function getClientIp(request: Request): string {
  const header = request.headers.get("x-forwarded-for") || "";
  const ip = header.split(",")[0]?.trim();
  return ip || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const existing = requestLog.get(ip) || [];
  const recent = existing.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    requestLog.set(ip, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return true;
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "you",
  "your",
  "from",
  "are",
  "but",
  "not",
  "top",
  "best",
  "list",
  "ranked",
  "recommended",
  "option",
  "options",
]);
