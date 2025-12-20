import { NextResponse } from "next/server";
import { isHistoryConfigured } from "@/lib/defaultanswer/history";
import { supabaseAdmin } from "@/lib/supabase/supabase/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
  if (!isHistoryConfigured()) return NextResponse.json({ ok: false, error: "History not configured" }, { status: 200 });

  try {
    const { data, error } = await supabaseAdmin
      .from("defaultanswer_scans")
      .select("id, created_at, score, readiness, hash")
      .eq("url", url)
      .order("created_at", { ascending: false })
      .limit(Number.isNaN(limit) ? 20 : limit);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, scans: data || [] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
