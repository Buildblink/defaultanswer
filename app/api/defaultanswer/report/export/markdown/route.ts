import { NextResponse } from "next/server";
import { reportToMarkdown } from "@/lib/defaultanswer/report-to-markdown";
import type { ReportData } from "@/lib/defaultanswer/report-to-markdown";

type RequestBody = {
  report?: ReportData;
};

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.report) {
    return NextResponse.json({ ok: false, error: "report is required" }, { status: 400 });
  }

  try {
    const markdown = reportToMarkdown(body.report);
    return NextResponse.json({ ok: true, markdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

