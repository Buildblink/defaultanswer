import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PROMPT_SET_VERSION, SWEEP_PROMPTS } from "@/lib/sweep/prompt-set";
import { extractLearningFields, extractSweepSignals } from "@/lib/sweep/extract";
import { runPrompt as runOpenAiPrompt } from "@/lib/sweep/providers/openai";
import { runPrompt as runAnthropicPrompt } from "@/lib/sweep/providers/anthropic";

type RunBody = {
  label?: string;
  category?: string;
  brandName?: string;
  domain?: string;
  providers?: { openai?: boolean; anthropic?: boolean };
  limitPrompts?: number;
  preset?: string;
  model?: string;
  openaiModel?: string;
  anthropicModel?: string;
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

function logDebug(payload: Record<string, unknown>) {
  console.log(JSON.stringify(payload));
}

function buildPrompt(template: string, vars: { category: string; brandName: string; domain: string }) {
  return template
    .replace(/\{\{CATEGORY\}\}/g, vars.category)
    .replace(/\{\{BRAND_NAME\}\}/g, vars.brandName)
    .replace(/\{\{BRAND\}\}/g, vars.brandName)
    .replace(/\{\{DOMAIN\}\}/g, vars.domain)
    .trim();
}

function isUnknownResponse(text: string): { unknown: boolean; reason: string | null } {
  const trimmed = (text || "").trim();
  if (!trimmed) return { unknown: false, reason: null };
  const hasUnknown = /\bunknown\b/i.test(trimmed);
  return { unknown: hasUnknown, reason: hasUnknown ? trimmed : null };
}

function shouldExpectList(promptKey: string): boolean {
  return (
    promptKey === "category_natural_mentions" ||
    promptKey === "category_top_tools" ||
    promptKey === "category_compare_tools" ||
    promptKey === "learning_best_tools_generic"
  );
}

function buildBrandNames(brandName: string): string[] {
  const camel = brandName.replace(/([a-z])([A-Z])/g, "$1 $2");
  const collapsed = brandName.replace(/\s+/g, "");
  const variants = [brandName, camel, collapsed].map((v) => v.trim()).filter(Boolean);
  return Array.from(new Set(variants));
}

export async function POST(req: Request) {
  const debugId = crypto.randomUUID();
  logDebug({ debugId, stage: "start", hasAdminToken: Boolean(req.headers.get("x-admin-token")) });

  const auth = requireAdmin(req);
  if (!auth.ok) {
    logDebug({ debugId, stage: "auth", error: auth.message });
    return NextResponse.json(
      { ok: false, debugId, stage: "auth", error: { code: null, message: auth.message, details: null, hint: null } },
      { status: auth.status }
    );
  }

  let body: RunBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  logDebug({
    debugId,
    stage: "input",
    params: {
      label: body.label,
      category: body.category,
      brandName: body.brandName,
      domain: body.domain,
      providers: body.providers,
      limitPrompts: body.limitPrompts,
      preset: body.preset,
      model: body.model,
      openaiModel: body.openaiModel,
      anthropicModel: body.anthropicModel,
    },
  });

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdminClient();
  } catch (err) {
    const error = normalizeSupabaseError(err);
    logDebug({
      debugId,
      stage: "supabase_admin_client",
      client: "service_role",
      supabaseUrlPresent: Boolean(process.env.SUPABASE_URL),
      serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      error,
    });
    return NextResponse.json(
      { ok: false, debugId, stage: "supabase_admin_client", error },
      { status: 500 }
    );
  }

  logDebug({
    debugId,
    stage: "supabase_admin_client",
    client: "service_role",
    supabaseUrlPresent: Boolean(process.env.SUPABASE_URL),
    serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });

  const preset = body.preset || "";
  const defaultCategory =
    preset === "learning_v1_1"
      ? "AI visibility and recommendation diagnostics"
      : preset === "learning_confidence_gate_v1"
        ? "AI recommendation confidence"
        : "LLM recommendation readiness audit for websites/brands";
  const category = body.category || defaultCategory;
  const brandName = body.brandName || "DefaultAnswer";
  const domain = body.domain || "defaultanswer.com";
  const limitPrompts = Math.min(body.limitPrompts ?? SWEEP_PROMPTS.length, SWEEP_PROMPTS.length);
  const providers = {
    openai: body.providers?.openai ?? true,
    anthropic: body.providers?.anthropic ?? true,
  };

  if (providers.openai && !process.env.OPENAI_API_KEY) {
    const error = normalizeSupabaseError("OPENAI_API_KEY not set.");
    logDebug({ debugId, stage: "openai_key", error });
    return NextResponse.json({ ok: false, debugId, stage: "openai_key", error }, { status: 400 });
  }
  if (providers.anthropic && !process.env.ANTHROPIC_API_KEY) {
    const error = normalizeSupabaseError("ANTHROPIC_API_KEY not set.");
    logDebug({ debugId, stage: "anthropic_key", error });
    return NextResponse.json({ ok: false, debugId, stage: "anthropic_key", error }, { status: 400 });
  }

  const promptVars = { category, brandName, domain };
  const basePrompts =
    body.preset === "learning_v1_1"
      ? SWEEP_PROMPTS.filter((prompt) => prompt.intent === "learning_v1_1")
      : body.preset === "learning_confidence_gate_v1"
      ? SWEEP_PROMPTS.filter((prompt) => prompt.intent === "learning_confidence_gate_v1")
      : SWEEP_PROMPTS;
  logDebug({
    debugId,
    stage: "prompts_resolved",
    promptSetVersion: PROMPT_SET_VERSION,
    promptCount: basePrompts.length,
    preset,
  });
  const prompts = basePrompts.slice(0, limitPrompts).map((prompt) => ({
    ...prompt,
    promptText: buildPrompt(prompt.template, promptVars),
  }));
  logDebug({
    debugId,
    stage: "prompts_prepared",
    preparedCount: prompts.length,
    sampleKeys: prompts.slice(0, 3).map((prompt) => prompt.key),
  });

  const openaiModel = body.openaiModel || body.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const anthropicModel =
    body.anthropicModel || body.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  const models: Array<{ provider: string; model: string }> = [];
  if (providers.openai) {
    models.push({ provider: "openai", model: openaiModel });
  }
  if (providers.anthropic) {
    models.push({ provider: "anthropic", model: anthropicModel });
  }
  logDebug({ debugId, stage: "models", models, providers });
  const { data: sweepRow, error: sweepError } = await supabaseAdmin
    .from("ai_sweeps")
    .insert({
      label: body.label || "manual",
      prompt_set_version: PROMPT_SET_VERSION,
      prompts_count: prompts.length,
      models,
      notes: null,
    })
    .select("id, created_at")
    .single();

  if (sweepError || !sweepRow) {
    const error = normalizeSupabaseError(sweepError || "Failed to create sweep.");
    logDebug({ debugId, stage: "insert_sweep", table: "ai_sweeps", error });
    return NextResponse.json(
      { ok: false, debugId, stage: "insert_sweep", error },
      { status: 500 }
    );
  }

  const sweepId = sweepRow.id as string;
  logDebug({ debugId, stage: "insert_sweep", table: "ai_sweeps", sweepId });

  const brandNames = buildBrandNames(brandName);
  const domains = [domain, `www.${domain}`];

  let attempted = 0;
  let inserted = 0;
  let failed = 0;
  const errors: string[] = [];
  const seenErrors = new Set<string>();
  const providerStats = {
    openai: { attempted: 0, succeeded: 0, failed: 0 },
    anthropic: { attempted: 0, succeeded: 0, failed: 0 },
  };
  if (providers.openai) {
    const model = openaiModel;
    logDebug({
      debugId,
      stage: "prepared_results",
      provider: "openai",
      preparedCount: prompts.length,
      sampleKeys: prompts.slice(0, 3).map((prompt) => prompt.key),
    });
    for (const prompt of prompts) {
      console.log("[sweep][openai]", prompt.key);
      let responseText: string | null = null;
      let responseJson: unknown = null;
      let usageJson: unknown | null = null;
      let errorText: string | null = null;
      const startedAt = Date.now();
      providerStats.openai.attempted += 1;
      try {
        const response = await runOpenAiPrompt(prompt.promptText, model);
        responseText = response.text;
        responseJson = response.responseJson;
        usageJson = response.usageJson;
        providerStats.openai.succeeded += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "OpenAI error";
        errorText = msg;
        console.warn("[sweep][openai] failed:", msg);
        providerStats.openai.failed += 1;
      }
      const latencyMs = Date.now() - startedAt;
      const unknownInfo = isUnknownResponse(responseText || "");
      const expectList = shouldExpectList(prompt.key);
      const extracted = extractSweepSignals({
        responseText: responseText || "",
        brandNames,
        domains,
        expectList,
      });
      const learningExtract = extractLearningFields({
        prompt: prompt.promptText,
        response: responseText,
      });
      const finalErrorText = errorText ?? (extracted.parseFailed ? "parse_failed" : null);
      const evaluationNotes = {
        extraction_confidence: extracted.extractionConfidence,
        reason_if_unknown: unknownInfo.reason,
      };

      attempted += 1;
      const { error: insertError } = await supabaseAdmin.from("ai_sweep_results").insert({
        sweep_id: sweepId,
        provider: "openai",
        model,
        prompt_key: prompt.key,
        prompt: prompt.promptText,
        prompt_text: prompt.promptText,
        response_text: responseText,
        response_json: responseJson,
        usage_json: usageJson,
        error_text: finalErrorText,
        latency_ms: latencyMs,
        mentioned: extracted.mentioned,
        mention_rank: extracted.mentionRank,
        winner: extracted.winner,
        alternatives: extracted.alternatives,
        has_domain_mention: extracted.hasDomainMention,
        has_brand_mention: extracted.hasBrandMention,
        confidence: extracted.confidence,
        evaluation_notes: evaluationNotes,
        learning_signal: null,
        learning_extract: learningExtract,
      });
      if (insertError) {
        const error = normalizeSupabaseError(insertError);
        logDebug({
          debugId,
          stage: "insert_sweep_results",
          provider: "openai",
          promptKey: prompt.key,
          table: "ai_sweep_results",
          error,
          insertedCount: inserted,
        });
        failed += 1;
        console.error("[sweep][openai] insert failed:", insertError);
        if (!seenErrors.has(insertError.message)) {
          errors.push(insertError.message);
          seenErrors.add(insertError.message);
        }
        return NextResponse.json(
          { ok: false, debugId, stage: "insert_sweep_results", error },
          { status: 500 }
        );
      } else {
        inserted += 1;
        logDebug({
          debugId,
          stage: "insert_sweep_results",
          provider: "openai",
          promptKey: prompt.key,
          table: "ai_sweep_results",
          insertedCount: inserted,
          error: null,
        });
      }
    }
  }

  if (providers.anthropic) {
    const model = anthropicModel;
    logDebug({
      debugId,
      stage: "prepared_results",
      provider: "anthropic",
      preparedCount: prompts.length,
      sampleKeys: prompts.slice(0, 3).map((prompt) => prompt.key),
    });
    for (const prompt of prompts) {
      console.log("[sweep][anthropic]", prompt.key);
      let responseText: string | null = null;
      let responseJson: unknown = null;
      let usageJson: unknown | null = null;
      let errorText: string | null = null;
      const startedAt = Date.now();
      providerStats.anthropic.attempted += 1;
      try {
        const response = await runAnthropicPrompt(prompt.promptText, model);
        responseText = response.text;
        responseJson = response.responseJson;
        usageJson = response.usageJson;
        providerStats.anthropic.succeeded += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Anthropic error";
        errorText = msg;
        console.warn("[sweep][anthropic] failed:", msg);
        providerStats.anthropic.failed += 1;
      }
      const latencyMs = Date.now() - startedAt;
      const unknownInfo = isUnknownResponse(responseText || "");
      const expectList = shouldExpectList(prompt.key);
      const extracted = extractSweepSignals({
        responseText: responseText || "",
        brandNames,
        domains,
        expectList,
      });
      const learningExtract = extractLearningFields({
        prompt: prompt.promptText,
        response: responseText,
      });
      const finalErrorText = errorText ?? (extracted.parseFailed ? "parse_failed" : null);
      const evaluationNotes = {
        extraction_confidence: extracted.extractionConfidence,
        reason_if_unknown: unknownInfo.reason,
      };

      attempted += 1;
      const { error: insertError } = await supabaseAdmin.from("ai_sweep_results").insert({
        sweep_id: sweepId,
        provider: "anthropic",
        model,
        prompt_key: prompt.key,
        prompt: prompt.promptText,
        prompt_text: prompt.promptText,
        response_text: responseText,
        response_json: responseJson,
        usage_json: usageJson,
        error_text: finalErrorText,
        latency_ms: latencyMs,
        mentioned: extracted.mentioned,
        mention_rank: extracted.mentionRank,
        winner: extracted.winner,
        alternatives: extracted.alternatives,
        has_domain_mention: extracted.hasDomainMention,
        has_brand_mention: extracted.hasBrandMention,
        confidence: extracted.confidence,
        evaluation_notes: evaluationNotes,
        learning_signal: null,
        learning_extract: learningExtract,
      });
      if (insertError) {
        const error = normalizeSupabaseError(insertError);
        logDebug({
          debugId,
          stage: "insert_sweep_results",
          provider: "anthropic",
          promptKey: prompt.key,
          table: "ai_sweep_results",
          error,
          insertedCount: inserted,
        });
        failed += 1;
        console.error("[sweep][anthropic] insert failed:", insertError);
        if (!seenErrors.has(insertError.message)) {
          errors.push(insertError.message);
          seenErrors.add(insertError.message);
        }
        return NextResponse.json(
          { ok: false, debugId, stage: "insert_sweep_results", error },
          { status: 500 }
        );
      } else {
        inserted += 1;
        logDebug({
          debugId,
          stage: "insert_sweep_results",
          provider: "anthropic",
          promptKey: prompt.key,
          table: "ai_sweep_results",
          insertedCount: inserted,
          error: null,
        });
      }
    }
  }

  logDebug({
    debugId,
    stage: "provider_summary",
    providerStats,
    attempted,
    inserted,
    failed,
  });
  return NextResponse.json({
    ok: true,
    debugId,
    sweepId,
    attempted,
    inserted,
    failed,
    errors,
    first_error: errors[0] || null,
  });
}
