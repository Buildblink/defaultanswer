import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/client";
import type { CompareResponse } from "@/lib/defaultanswer/compare";

type RequestBody = {
  urlA?: string;
  urlB?: string;
  comparePayload?: CompareResponse;
};

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { urlA, urlB, comparePayload } = body || {};
  if (!urlA || !urlB || !comparePayload || !comparePayload.ok) {
    return NextResponse.json(
      { ok: false, error: "urlA, urlB, and a successful comparePayload are required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("defaultanswer_compares")
      .insert({
        url_a: urlA,
        url_b: urlB,
        payload: comparePayload,
        report_id_a: comparePayload.a?.reportId || null,
        report_id_b: comparePayload.b?.reportId || null,
        user_id: null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, compareId: data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
