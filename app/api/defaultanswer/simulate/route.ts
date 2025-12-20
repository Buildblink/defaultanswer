import { NextResponse } from "next/server";
import { runSimulation } from "@/lib/defaultanswer/simulation";
import type { AnalysisResult } from "@/lib/defaultanswer/scoring";

type RequestBody = {
  url?: string;
  analysis?: AnalysisResult;
};

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, analysis } = body || {};
  if (!url || !analysis) {
    return NextResponse.json({ ok: false, error: "url and analysis are required" }, { status: 400 });
  }

  try {
    const result = await runSimulation({ url, analysis });
    if (!result.ok) {
      const status = /missing api key|not reliable|unreliable|sdk not installed|openai/i.test(result.error)
        ? 200
        : 500;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: `Simulation failed: ${message}` }, { status: 500 });
  }
}

