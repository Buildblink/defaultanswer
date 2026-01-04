import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string;
  category?: string;
  tags?: string[];
  published?: boolean;
  canonical?: string;
  ogImage?: string;
  tldr?: string[];
  coreClaim?: string;
  author?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  canonical?: string;
  ogImage?: string;
  tldr?: string[];
  coreClaim?: string;
  author: string;
  readingTimeMinutes: number;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const DEFAULT_CATEGORY = "AI recommendations";

function stripLeadingH1(content: string) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.startsWith("# ")) {
    lines.shift();
    if (lines[0]?.trim() === "") {
      lines.shift();
    }
  }
  return lines.join("\n");
}

function estimateReadingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function parsePost(slug: string, raw: string) {
  const parsed = matter(raw);
  const data = parsed.data as BlogFrontmatter;

  if (!data.title || !data.description || !data.date) {
    throw new Error(`Missing required frontmatter in ${slug}.mdx`);
  }

  const category = data.category ?? DEFAULT_CATEGORY;
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const author = data.author ?? "DefaultAnswer";
  const content = stripLeadingH1(parsed.content);
  const readingTimeMinutes = estimateReadingTime(content);

  return {
    meta: {
      slug,
      title: data.title,
      description: data.description,
      date: data.date,
      category,
      tags,
      canonical: data.canonical,
      ogImage: data.ogImage,
      tldr: data.tldr,
      coreClaim: data.coreClaim,
      author,
      readingTimeMinutes,
    },
    content,
    published: data.published !== false,
  };
}

export function getAllPosts() {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(BLOG_DIR);
  return entries
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => {
      const slug = name.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, name), "utf8");
      return parsePost(slug, raw);
    })
    .filter((post) => post.published)
    .map((post) => post.meta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string) {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parsePost(slug, raw);
  return {
    meta: parsed.meta,
    content: parsed.content,
  };
}
