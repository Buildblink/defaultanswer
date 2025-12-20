import { NextResponse } from "next/server";
import { runCompare } from "@/lib/defaultanswer/compare";

type RequestBody = {
  urlA?: string;
  urlB?: string;
};

export async function POST(req: Request) {
  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { urlA, urlB } = body || {};

  if (!urlA || !urlB) {
    return NextResponse.json({ ok: false, error: "urlA and urlB are required" }, { status: 400 });
  }

  try {
    const result = await runCompare(urlA, urlB);
    const status = result.ok ? 200 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: `Compare failed: ${message}` }, { status: 500 });
  }
}

