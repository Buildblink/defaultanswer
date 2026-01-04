import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { SWEEP_PROMPTS } from "@/lib/sweep/prompt-set";

type FilterParams = {
  from: string | null;
  to: string | null;
  model: string | null;
  provider: string | null;
  group: string | null;
  q: string | null;
  limit: number;
  offset: number;
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

function getPromptKeysByGroup(group: string): string[] {
  return SWEEP_PROMPTS.filter((prompt) => prompt.intent === group).map((prompt) => prompt.key);
}

function parseFilters(url: string): FilterParams {
  const { searchParams } = new URL(url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const model = searchParams.get("model");
  const provider = searchParams.get("provider");
  const group = searchParams.get("group");
  const q = searchParams.get("q");
  const limitRaw = Number(searchParams.get("limit") || "50");
  const offsetRaw = Number(searchParams.get("offset") || "0");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
  return { from, to, model, provider, group, q, limit, offset };
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

  const filters = parseFilters(req.url);
  const group = filters.group?.trim();
  let groupKeys: string[] | null = null;
  if (group) {
    groupKeys = getPromptKeysByGroup(group);
    if (!groupKeys.length) {
      return NextResponse.json({ error: "Unknown prompt group." }, { status: 400 });
    }
  }

  const supabaseAdmin = supabaseAdminResult.client!;
  let query = supabaseAdmin
    .from("ai_sweep_results")
    .select(
      `
        id,
        sweep_id,
        created_at,
        provider,
        model,
        prompt_key,
        prompt,
        prompt_text,
        response_text,
        response_json,
        error_text,
        winner,
        mention_rank,
        has_domain_mention,
        has_brand_mention,
        evaluation_notes,
        learning_signal,
        learning_extract,
        learning_result_tags (
          id,
          notes,
          tag:learning_tags (id, key, label)
        )
      `
    )
    .order("created_at", { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.model) query = query.eq("model", filters.model);
  if (filters.provider) query = query.eq("provider", filters.provider);
  if (groupKeys) query = query.in("prompt_key", groupKeys);
  if (filters.q) {
    const q = filters.q.replace(/%/g, "\\%");
    query = query.or(
      `prompt_key.ilike.%${q}%,prompt_text.ilike.%${q}%,prompt.ilike.%${q}%,response_text.ilike.%${q}%`
    );
  }

  const { data: results, error: resultsError } = await query;
  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  const { data: tags, error: tagsError } = await supabaseAdmin
    .from("learning_tags")
    .select("id, key, label, description")
    .order("key", { ascending: true });

  if (tagsError) {
    return NextResponse.json({ error: tagsError.message }, { status: 500 });
  }

  return NextResponse.json({ results: results || [], tags: tags || [] });
}
