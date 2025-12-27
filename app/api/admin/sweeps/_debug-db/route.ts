import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PROMPT_SET_VERSION } from "@/lib/sweep/prompt-set";

function normalizeSupabaseError(error: unknown) {
  if (!error) {
    return { code: null, message: "Unknown error", details: null, hint: null };
  }
  if (error instanceof Error) {
    return { code: null, message: error.message, details: null, hint: null };
  }
  const cast = error as { code?: string; message?: string; details?: string; hint?: string };
  return {
    code: cast.code ?? null,
    message: cast.message ?? String(error),
    details: cast.details ?? null,
    hint: cast.hint ?? null,
  };
}

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

export async function GET(req: Request) {
  const debugId = crypto.randomUUID();
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, debugId, stage: "auth", error: normalizeSupabaseError(auth.message) },
      { status: auth.status }
    );
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdminClient();
  } catch (err) {
    const error = normalizeSupabaseError(err);
    return NextResponse.json(
      { ok: false, debugId, stage: "supabase_admin_client", error },
      { status: 500 }
    );
  }

  const table = "ai_sweeps";
  const selectResult = await supabaseAdmin.from(table).select("id").limit(1);
  const selectError = selectResult.error ? normalizeSupabaseError(selectResult.error) : null;

  const insertResult = await supabaseAdmin
    .from(table)
    .insert({
      label: "__debug__",
      prompt_set_version: PROMPT_SET_VERSION,
      prompts_count: 0,
      models: [],
      notes: "debug insert/delete",
    })
    .select("id")
    .single();
  const insertError = insertResult.error ? normalizeSupabaseError(insertResult.error) : null;
  const insertedId = insertResult.data?.id ?? null;

  let deleteError = null;
  if (insertedId) {
    const deleteResult = await supabaseAdmin.from(table).delete().eq("id", insertedId);
    deleteError = deleteResult.error ? normalizeSupabaseError(deleteResult.error) : null;
  }

  return NextResponse.json({
    ok: !selectError && !insertError && !deleteError,
    debugId,
    table,
    select: { ok: !selectError, error: selectError, rowCount: selectResult.data?.length ?? 0 },
    insert: { ok: !insertError, error: insertError, id: insertedId },
    delete: { ok: insertedId ? !deleteError : false, error: deleteError },
  });
}

