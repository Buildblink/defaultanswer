import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type TagBody = {
  tag_keys?: string[];
  notes?: string;
};

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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabaseAdminResult = getAdminClient();
  if (!supabaseAdminResult.ok) {
    return NextResponse.json({ error: supabaseAdminResult.message }, { status: supabaseAdminResult.status });
  }

  let body: TagBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { id: resultId } = await context.params;
  const tagKeys = Array.isArray(body.tag_keys) ? body.tag_keys.filter(Boolean) : [];
  const notes = typeof body.notes === "string" ? body.notes : null;

  const supabaseAdmin = supabaseAdminResult.client!;
  if (!resultId) {
    return NextResponse.json({ error: "Missing result id." }, { status: 400 });
  }

  if (!tagKeys.length) {
    const { error: clearError } = await supabaseAdmin
      .from("learning_result_tags")
      .delete()
      .eq("result_id", resultId);
    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, tags: [] });
  }

  const { data: tags, error: tagsError } = await supabaseAdmin
    .from("learning_tags")
    .select("id, key")
    .in("key", tagKeys);

  if (tagsError) {
    return NextResponse.json({ error: tagsError.message }, { status: 500 });
  }

  const tagIds = (tags || []).map((tag) => tag.id);
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("learning_result_tags")
    .select("id, tag_id")
    .eq("result_id", resultId);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingIds = new Set((existing || []).map((row) => row.tag_id));
  const desiredIds = new Set(tagIds);
  const toDelete = (existing || []).filter((row) => !desiredIds.has(row.tag_id)).map((row) => row.tag_id);

  if (toDelete.length) {
    const { error: deleteError } = await supabaseAdmin
      .from("learning_result_tags")
      .delete()
      .eq("result_id", resultId)
      .in("tag_id", toDelete);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  const upserts = tagIds.map((tagId) => ({
    result_id: resultId,
    tag_id: tagId,
    notes,
  }));

  if (upserts.length) {
    const { error: upsertError } = await supabaseAdmin
      .from("learning_result_tags")
      .upsert(upserts, { onConflict: "result_id,tag_id" });
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  const { data: updated, error: updatedError } = await supabaseAdmin
    .from("learning_result_tags")
    .select("id, notes, tag:learning_tags (id, key, label)")
    .eq("result_id", resultId);

  if (updatedError) {
    return NextResponse.json({ error: updatedError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tags: updated || [] });
}
