import type { MetadataRoute } from "next";

export default function staticSitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.defaultanswer.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/methodology`,
      lastModified: new Date('2024-12-20'), // Methodology last updated
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/insights`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reports`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date('2024-12-15'), // About page last updated
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date('2024-12-15'), // Contact page last updated
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    // Curated example reports (indexed for content marketing)
    {
      url: `${baseUrl}/reports/defaultanswer.com`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    // Add more curated examples here as needed:
    // { url: `${baseUrl}/reports/otterly.ai`, ... },
    // { url: `${baseUrl}/reports/hubspot.com`, ... },
  ];
}
