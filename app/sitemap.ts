import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.defaultanswer.com";
  const blogSlugs = getAllPosts().map((post) => post.slug);

  const staticRoutes = [
    "",
    "/methodology",
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
