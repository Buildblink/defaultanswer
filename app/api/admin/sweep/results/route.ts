import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function requireAdmin(req: Request) {
  const expected = process.env.DEFAULTANSWER_ADMIN_TOKEN;
  if (!expected) {
    return { ok: false, status: 500, message: "DEFAULTANSWER_ADMIN_TOKEN not set." };
  }
  const token = req.headers.get("x-admin-token");
  if (!token || token !== expected) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  return { ok: true };
}

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, message: "Missing SUPABASE_SERVICE_ROLE_KEY" };
  }
  return { ok: true, client: getSupabaseAdmin() };
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabaseAdminResult = getAdminClient();
  if (!supabaseAdminResult.ok) {
    return NextResponse.json({ error: supabaseAdminResult.message }, { status: supabaseAdminResult.status });
  }

  const { searchParams } = new URL(req.url);
  const sweepId = searchParams.get("sweepId");
  if (!sweepId) {
    return NextResponse.json({ error: "Missing sweepId" }, { status: 400 });
  }

  const supabaseAdmin = supabaseAdminResult.client!;
  const { data: results, error: resultsError } = await supabaseAdmin
    .from("ai_sweep_results")
    .select("*")
    .eq("sweep_id", sweepId)
    .order("created_at", { ascending: false });

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  return NextResponse.json({ results: results || [] });
}
