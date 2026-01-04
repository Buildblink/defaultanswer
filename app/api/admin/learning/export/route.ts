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
  return {
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    model: searchParams.get("model"),
    provider: searchParams.get("provider"),
    group: searchParams.get("group"),
    q: searchParams.get("q"),
  };
}

type SummaryResult = {
  mention_rate: number;
  refusal_rate: number;
  top_winners: Array<{ value: string; count: number }>;
  top_categories: Array<{ value: string; count: number }>;
  top_tags: Array<{ value: string; count: number }>;
  top_incumbents: Array<{ value: string; count: number }>;
  total: number;
};

function tally(map: Map<string, number>, value: string | null | undefined) {
  const key = (value || "").trim();
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function topEntries(map: Map<string, number>, limit = 5): Array<{ value: string; count: number }> {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

async function loadSummary(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  filters: FilterParams,
  groupKeys: string[] | null
): Promise<SummaryResult> {
  const winners = new Map<string, number>();
  const categories = new Map<string, number>();
  const tags = new Map<string, number>();
  const incumbents = new Map<string, number>();

  let total = 0;
  let mentionCount = 0;
  let refusalCount = 0;
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    let query = supabaseAdmin
      .from("ai_sweep_results")
      .select(
        `
          id,
          winner,
          has_domain_mention,
          has_brand_mention,
          learning_extract,
          learning_result_tags (tag:learning_tags (key))
        `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

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

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const batch = rows || [];
    if (!batch.length) break;

    for (const row of batch) {
      total += 1;
      if (row.has_domain_mention || row.has_brand_mention) mentionCount += 1;
      const learning = row.learning_extract as
        | {
            refusal_type?: string;
            category_label?: string | null;
            mentioned_brands?: string[];
          }
        | null;
      if (learning?.refusal_type && learning.refusal_type !== "none") refusalCount += 1;
      tally(winners, row.winner);
      tally(categories, learning?.category_label || null);
      if (Array.isArray(learning?.mentioned_brands)) {
        for (const brand of learning.mentioned_brands) {
          tally(incumbents, brand);
        }
      }
      const rowTags = row.learning_result_tags || [];
      for (const entry of rowTags) {
        const tagRecord = Array.isArray(entry?.tag) ? entry.tag[0] : entry?.tag;
        const tagKey = tagRecord?.key;
        tally(tags, tagKey);
      }
    }

    if (batch.length < pageSize) break;
    offset += pageSize;
    if (offset > 10000) break;
  }

  return {
    mention_rate: total ? mentionCount / total : 0,
    refusal_rate: total ? refusalCount / total : 0,
    top_winners: topEntries(winners),
    top_categories: topEntries(categories),
    top_tags: topEntries(tags),
    top_incumbents: topEntries(incumbents),
    total,
  };
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
  const maxRows = 5000;

  let countQuery = supabaseAdmin
    .from("ai_sweep_results")
    .select("id", { count: "exact", head: true });

  if (filters.from) countQuery = countQuery.gte("created_at", filters.from);
  if (filters.to) countQuery = countQuery.lte("created_at", filters.to);
  if (filters.model) countQuery = countQuery.eq("model", filters.model);
  if (filters.provider) countQuery = countQuery.eq("provider", filters.provider);
  if (groupKeys) countQuery = countQuery.in("prompt_key", groupKeys);
  if (filters.q) {
    const q = filters.q.replace(/%/g, "\\%");
    countQuery = countQuery.or(
      `prompt_key.ilike.%${q}%,prompt_text.ilike.%${q}%,prompt.ilike.%${q}%,response_text.ilike.%${q}%`
    );
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  let resultsQuery = supabaseAdmin
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
    .range(0, maxRows - 1);

  if (filters.from) resultsQuery = resultsQuery.gte("created_at", filters.from);
  if (filters.to) resultsQuery = resultsQuery.lte("created_at", filters.to);
  if (filters.model) resultsQuery = resultsQuery.eq("model", filters.model);
  if (filters.provider) resultsQuery = resultsQuery.eq("provider", filters.provider);
  if (groupKeys) resultsQuery = resultsQuery.in("prompt_key", groupKeys);
  if (filters.q) {
    const q = filters.q.replace(/%/g, "\\%");
    resultsQuery = resultsQuery.or(
      `prompt_key.ilike.%${q}%,prompt_text.ilike.%${q}%,prompt.ilike.%${q}%,response_text.ilike.%${q}%`
    );
  }

  const { data: results, error: resultsError } = await resultsQuery;
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

  let summary: SummaryResult;
  try {
    summary = await loadSummary(supabaseAdmin, filters, groupKeys);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const exportedAt = new Date().toISOString();
  const payload = {
    meta: {
      exported_at: exportedAt,
      filters,
      total: count || 0,
      truncated: (count || 0) > maxRows,
    },
    summary,
    results: results || [],
    tags: tags || [],
  };

  const dateTag = exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="learning-export-${dateTag}.json"`,
    },
  });
}
