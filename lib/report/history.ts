import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ReportScanSummary = {
  id?: string;
  user_id: string | null;
  normalized_url: string;
  report_id: string;
  created_at?: string;
  score: number;
  readiness: string;
  coverage_overall: number;
  has_faq: boolean;
  has_schema: boolean;
  has_pricing: boolean;
  primary_blocker: string;
};


export type InsertScanSummaryInput = {
  userId: string | null;
  normalizedUrl: string;
  reportId: string;
  score: number;
  readiness: string;
  coverageOverall: number;
  hasFaq: boolean;
  hasSchema: boolean;
  hasPricing: boolean;
  primaryBlocker: string;
};

export function normalizeUrl(input: string): string {
  if (!input) return "";
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return input
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/$/, "")
      .toLowerCase();
  }
}

export async function insertScanSummary(input: InsertScanSummaryInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const record: ReportScanSummary = {
    user_id: input.userId,
    normalized_url: input.normalizedUrl,
    report_id: input.reportId,
    score: input.score,
    readiness: input.readiness,
    coverage_overall: input.coverageOverall,
    has_faq: input.hasFaq,
    has_schema: input.hasSchema,
    has_pricing: input.hasPricing,
    primary_blocker: input.primaryBlocker,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from("report_scans")
      .insert(record)
      .select("*")
      .single();
    if (error) {
      console.warn("[report history] insert failed", error.message);
      return null;
    }
    return data as ReportScanSummary;
  } catch (err) {
    console.warn("[report history] insert failed", err);
    return null;
  }
}

export async function fetchLastScan(normalizedUrl: string, userId: string | null) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const query = supabaseAdmin
      .from("report_scans")
      .select("*")
      .eq("normalized_url", normalizedUrl)
      .order("created_at", { ascending: false })
      .limit(1);
    const { data, error } = userId
      ? await query.eq("user_id", userId)
      : await query.is("user_id", null);
    if (error) {
      console.warn("[report history] fetch last failed", error.message);
      return null;
    }
    return (data && data[0]) as ReportScanSummary | null;
  } catch (err) {
    console.warn("[report history] fetch last failed", err);
    return null;
  }
}

export async function fetchRecentScans(
  normalizedUrl: string,
  userId: string | null,
  limit = 10
) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const query = supabaseAdmin
      .from("report_scans")
      .select("*")
      .eq("normalized_url", normalizedUrl)
      .order("created_at", { ascending: false })
      .limit(limit);
    const { data, error } = userId
      ? await query.eq("user_id", userId)
      : await query.is("user_id", null);
    if (error) {
      console.warn("[report history] fetch recent failed", error.message);
      return [];
    }
    return (data || []) as ReportScanSummary[];
  } catch (err) {
    console.warn("[report history] fetch recent failed", err);
    return [];
  }
}
