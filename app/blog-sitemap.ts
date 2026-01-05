import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

export default function blogSitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.defaultanswer.com";
  const posts = getAllPosts();

  return posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));
}
