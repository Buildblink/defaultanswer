import { NextResponse } from "next/server";
import { diffScans, isHistoryConfigured } from "@/lib/defaultanswer/history";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scanId = searchParams.get("scanId");
  if (!scanId) return NextResponse.json({ ok: false, error: "scanId is required" }, { status: 400 });
  if (!isHistoryConfigured()) return NextResponse.json({ ok: false, error: "History not configured" }, { status: 200 });

  try {
    const { data, error } = await supabaseAdmin.from("defaultanswer_scans").select("*").eq("id", scanId).single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const current = data;
    const { data: prevData } = await supabaseAdmin
      .from("defaultanswer_scans")
      .select("*")
      .eq("url", current.url)
      .lt("created_at", current.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const diff = diffScans(prevData as any, current as any);
    return NextResponse.json({ ok: true, diff, current, previous: prevData || null });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}

