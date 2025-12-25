import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getEntitlements } from "@/lib/auth/entitlements";

type LiveProofRequest = {
  evaluatedUrl: string;
  prompts: string[];
};

type LiveProofResponse = {
  provider: "openai";
  model: string;
  generatedAt: string;
  items: Array<{
    prompt: string;
    responseText: string;
    mentioned: string[];
  }>;
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

  let payload: LiveProofRequest;
  try {
    payload = (await request.json()) as LiveProofRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { evaluatedUrl, prompts } = payload || {};
  if (!evaluatedUrl || !isValidUrl(evaluatedUrl)) {
    return NextResponse.json({ error: "Invalid evaluatedUrl." }, { status: 400 });
  }
  if (!Array.isArray(prompts) || prompts.length === 0 || prompts.length > 6) {
    return NextResponse.json({ error: "Invalid prompts." }, { status: 400 });
  }
  if (prompts.some((p) => typeof p !== "string" || p.trim().length === 0 || p.length > 220)) {
    return NextResponse.json({ error: "Invalid prompt length." }, { status: 400 });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });

  try {
    const generatedAt = new Date().toISOString();
    const items = await Promise.all(
      prompts.map(async (prompt) => {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "Answer the user's question with a short ranked list (max 5). Include brief reasons.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 350,
        });
        const responseText = response.choices[0]?.message?.content?.trim() || "";
        return {
          prompt,
          responseText,
          mentioned: extractMentions(responseText),
        };
      })
    );

    const result: LiveProofResponse = {
      provider: "openai",
      model,
      generatedAt,
      items,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.warn("[live-proof] upstream failure", err);
    return NextResponse.json({ error: "Upstream model call failed." }, { status: 502 });
  }
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function extractMentions(text: string): string[] {
  if (!text) return [];
  const domainMatches = text.match(/([a-z0-9-]+\.)+[a-z]{2,}/gi) || [];
  const nameMatches = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
  const stopwords = new Set([
    "The",
    "And",
    "For",
    "With",
    "This",
    "That",
    "You",
    "Your",
    "From",
    "Are",
    "But",
    "Not",
    "Top",
    "Best",
    "List",
    "Ranked",
  ]);
  const all = [...domainMatches, ...nameMatches]
    .map((m) => m.trim())
    .filter((m) => m.length >= 3 && !stopwords.has(m));
  const deduped: string[] = [];
  for (const item of all) {
    if (!deduped.includes(item)) deduped.push(item);
    if (deduped.length >= 12) break;
  }
  return deduped;
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
