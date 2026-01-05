import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export default async function reportsSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.defaultanswer.com";
  const supabase = getSupabaseAdmin();

  // Fetch all stored reports
  const { data: reports } = await supabase
    .from('stored_reports')
    .select('domain, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (!reports) return [];

  return reports.map((report) => ({
    url: `${baseUrl}/reports/${report.domain}`,
    lastModified: new Date(report.updated_at || report.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
}
