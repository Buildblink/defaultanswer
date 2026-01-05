import type { MetadataRoute } from "next";
import { INSIGHTS } from "@/lib/insights/insights";

export default function insightsSitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.defaultanswer.com";

  return INSIGHTS.map((insight) => ({
    url: `${baseUrl}/insights/${insight.slug}`,
    lastModified: new Date(insight.lastUpdated),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
}
