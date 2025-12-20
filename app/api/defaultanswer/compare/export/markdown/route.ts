import { NextResponse } from "next/server";
import { compareToMarkdown } from "@/lib/defaultanswer/compare-to-markdown";
import type { CompareResponseSuccess } from "@/lib/defaultanswer/compare";

type RequestBody = {
  payload?: CompareResponseSuccess;
};

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.payload || body.payload.ok !== true) {
    return NextResponse.json({ ok: false, error: "Valid compare payload required" }, { status: 400 });
  }

  try {
    const markdown = compareToMarkdown(body.payload);
    return NextResponse.json({ ok: true, markdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
