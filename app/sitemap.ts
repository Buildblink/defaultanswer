import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.defaultanswer.com";

  return [
    {
      url: `${baseUrl}/static-sitemap.xml`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/blog-sitemap.xml`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/reports-sitemap.xml`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/insights-sitemap.xml`,
      lastModified: new Date(),
    },
  ];
}
