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

  const supabaseAdmin = supabaseAdminResult.client!;
  const { count: sweepsCount, error: sweepsError } = await supabaseAdmin
    .from("ai_sweeps")
    .select("id", { count: "exact", head: true });

  if (sweepsError) {
    return NextResponse.json({ error: sweepsError.message }, { status: 500 });
  }

  const { count: resultsCount, error: resultsError } = await supabaseAdmin
    .from("ai_sweep_results")
    .select("id", { count: "exact", head: true });

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  const { data: latestSweep, error: latestError } = await supabaseAdmin
    .from("ai_sweeps")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return NextResponse.json({ error: latestError.message }, { status: 500 });
  }

  return NextResponse.json({
    sweeps_count: sweepsCount ?? 0,
    results_count: resultsCount ?? 0,
    latest_sweep_id: latestSweep?.id ?? null,
  });
}
