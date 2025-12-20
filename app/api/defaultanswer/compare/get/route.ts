import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const compareId = searchParams.get("compareId");

  if (!compareId) {
    return NextResponse.json({ ok: false, error: "compareId is required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("defaultanswer_compares")
      .select("id, url_a, url_b, payload")
      .eq("id", compareId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, compareId: data.id, urlA: data.url_a, urlB: data.url_b, payload: data.payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

