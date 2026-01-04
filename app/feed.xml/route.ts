import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/blog";

const siteUrl = "https://www.defaultanswer.com";

export const runtime = "nodejs";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = getAllPosts()
    .map((post) => {
      const link = `${siteUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.date).toUTCString();
      return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>${link}</link>
        <guid>${link}</guid>
        <pubDate>${pubDate}</pubDate>
        <description>${escapeXml(post.description)}</description>
      </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DefaultAnswer Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Analysis on AI recommendation readiness, retrievability, and the signals that affect citing decisions.</description>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
