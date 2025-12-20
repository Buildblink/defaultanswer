import { NextResponse } from "next/server";
import { fetchLatestScans, isHistoryConfigured } from "@/lib/defaultanswer/history";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  if (!isHistoryConfigured()) {
    return NextResponse.json({ ok: false, error: "History not configured" }, { status: 200 });
  }
  const res = await fetchLatestScans(url);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, latest: res.latest, previous: res.previous });
}
