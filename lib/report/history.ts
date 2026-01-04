/**
 * Report Storage - requires Supabase table: stored_reports
 *
 * SQL to create table:
 *
 * CREATE TABLE IF NOT EXISTS stored_reports (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   domain TEXT NOT NULL,
 *   report_id TEXT NOT NULL,
 *   user_id TEXT,
 *   url TEXT NOT NULL,
 *   analysis_data JSONB NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(domain, user_id)
 * );
 *
 * CREATE INDEX idx_stored_reports_domain ON stored_reports(domain);
 * CREATE INDEX idx_stored_reports_user_id ON stored_reports(user_id);
 */

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

export type StoredReport = {
  id?: string;
  domain: string; // normalized domain (e.g., "otterly.ai")
  report_id: string;
  user_id: string | null;
  created_at?: string;
  updated_at?: string;
  analysis_data: any; // AnalysisResult JSON
  url: string; // original URL analyzed
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

/**
 * Extract domain from URL for clean report URLs
 * e.g., "https://www.otterly.ai/pricing" -> "otterly.ai"
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
}

/**
 * Save full report data for clean URL access
 */
export async function saveReport(params: {
  domain: string;
  reportId: string;
  userId: string | null;
  analysisData: any;
  url: string;
}): Promise<StoredReport | null> {
  const supabaseAdmin = getSupabaseAdmin();

  const record = {
    domain: params.domain,
    report_id: params.reportId,
    user_id: params.userId,
    analysis_data: params.analysisData,
    url: params.url,
  };

  try {
    // Upsert: update if domain exists for this user, insert otherwise
    const { data, error } = await supabaseAdmin
      .from("stored_reports")
      .upsert(record, {
        onConflict: "domain,user_id",
      })
      .select("*")
      .single();

    if (error) {
      console.error("[report storage] save failed", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        domain: params.domain,
      });
      return null;
    }
    console.log("[report storage] saved successfully", { domain: params.domain, id: data.id });
    return data as StoredReport;
  } catch (err) {
    console.error("[report storage] save exception", err);
    return null;
  }
}

/**
 * Fetch report by domain
 */
export async function fetchReportByDomain(
  domain: string,
  userId: string | null = null
): Promise<StoredReport | null> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const query = supabaseAdmin
      .from("stored_reports")
      .select("*")
      .eq("domain", domain)
      .order("created_at", { ascending: false })
      .limit(1);

    const { data, error } = userId
      ? await query.eq("user_id", userId)
      : await query.is("user_id", null);

    if (error) {
      console.warn("[report storage] fetch failed", error.message);
      return null;
    }
    return (data && data[0]) as StoredReport | null;
  } catch (err) {
    console.warn("[report storage] fetch failed", err);
    return null;
  }
}
