import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";

function getBlogSlugs() {
  const blogDir = path.join(process.cwd(), "app", "blog");
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
    "/blog",
    "/about",
    "/contact",
  ];

  const blogRoutes = blogSlugs.map((slug) => `/blog/${slug}`);

  return [...staticRoutes, ...blogRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
