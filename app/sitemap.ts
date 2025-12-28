import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";

function getBlogSlugs() {
  const blogDir = path.join(process.cwd(), "app", "(marketing)", "blog");
  const entries = fs.readdirSync(blogDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== "page.tsx");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.defaultanswer.com";
  const blogSlugs = getBlogSlugs();

  const staticRoutes = [
    "",
    "/methodology",
    "/glossary",
    "/blog",
    "/reports",
    "/about",
    "/contact",
    "/reports/defaultanswer.com",
  ];

  const blogRoutes = blogSlugs.map((slug) => `/blog/${slug}`);

  return [...staticRoutes, ...blogRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
