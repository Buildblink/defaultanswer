import { NextResponse } from "next/server";
import {
  COLD_SUMMARY_PROMPT_VERSION,
  analyzeColdSummary,
  buildColdSummaryMessages,
  aggregateColdSummaryRuns,
  type ColdSummaryMode,
  type ColdSummarySnapshot,
} from "@/lib/defaultanswer/cold-summary";
import { extractPageData } from "@/lib/defaultanswer/scoring";
import { extractVisibleTextFromHtml } from "@/lib/defaultanswer/visible-text";

type RequestBody = {
  url?: string;
  model?: string;
  runs?: number;
  mode?: ColdSummaryMode;
  snapshot?: ColdSummarySnapshot;
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url) {
    return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  }

  let OpenAI: any;
  try {
    OpenAI = (await import("openai")).default;
  } catch {
    return NextResponse.json(
      { ok: false, error: "LLM unavailable (OpenAI SDK not installed. Run: npm install openai)." },
      { status: 500 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "LLM unavailable (missing OPENAI_API_KEY)." },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const model = (body.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const runs = Math.min(Math.max(Number(body.runs || 1), 1), 3);
  const mode: ColdSummaryMode = body.mode === "snapshot" ? "snapshot" : "url_only";
  const snapshot = await resolveSnapshotPayload({ url, mode, snapshot: body.snapshot });
  const { system, user } = buildColdSummaryMessages({ url, mode, snapshot });
  const promptsUsed = `${system}\n\n${user}`;

  try {
    const createdAt = new Date().toISOString();
    if (runs === 1) {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        max_tokens: 500,
      });

      const raw = response.choices?.[0]?.message?.content?.trim() || "";
      if (!raw) {
        return NextResponse.json(
          { ok: false, error: "Cold summary test returned an empty response." },
          { status: 500 }
        );
      }

      const analysis = analyzeColdSummary(raw, mode);

      return NextResponse.json({
        ok: true,
        result: {
          promptVersion: COLD_SUMMARY_PROMPT_VERSION,
          model: response.model || model,
          response: raw,
          rawOutput: raw,
          analysis,
          createdAt,
        },
      });
    }

    const calls = Array.from({ length: runs }).map(() =>
      openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        max_tokens: 500,
      })
    );

    const responses = await Promise.all(calls);
    const results = responses.map((resp) => {
      const raw = resp.choices?.[0]?.message?.content?.trim() || "";
      return {
        rawText: raw,
        analysis: analyzeColdSummary(raw, mode),
      };
    });

    return NextResponse.json({
      ok: true,
      multiRun: {
        promptVersion: COLD_SUMMARY_PROMPT_VERSION,
        model: responses[0]?.model || model,
        createdAt,
        promptsUsed,
        results,
        aggregate: aggregateColdSummaryRuns(results),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: `Cold summary failed: ${message}` }, { status: 500 });
  }
}

async function resolveSnapshotPayload({
  url,
  mode,
  snapshot,
}: {
  url: string;
  mode: ColdSummaryMode;
  snapshot?: ColdSummarySnapshot;
}): Promise<ColdSummarySnapshot | undefined> {
  if (mode !== "snapshot") return undefined;
  const normalized = normalizeSnapshot(snapshot);
  if (normalized?.excerpt && normalized.excerpt !== "Unknown") return normalized;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return normalized;
    const html = await res.text();
    if (!html) return normalized;
    const extracted = extractPageData(html, url);
    const visibleText = extractVisibleTextFromHtml(html);
    const excerpt = normalizeSnapshotText(visibleText, 1200);
    return normalizeSnapshot({
      title: extracted.title,
      metaDescription: extracted.metaDescription,
      h1: extracted.h1s?.[0],
      excerpt,
    });
  } catch {
    return normalized;
  }
}

function normalizeSnapshot(snapshot?: ColdSummarySnapshot): ColdSummarySnapshot | undefined {
  if (!snapshot) return undefined;
  const title = normalizeSnapshotText(snapshot.title, 200);
  const metaDescription = normalizeSnapshotText(snapshot.metaDescription, 260);
  const h1 = normalizeSnapshotText(snapshot.h1, 200);
  const excerpt = normalizeSnapshotText(snapshot.excerpt, 1200);
  return { title, metaDescription, h1, excerpt };
}

function normalizeSnapshotText(value?: string, maxLen = 1200): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLen);
}
