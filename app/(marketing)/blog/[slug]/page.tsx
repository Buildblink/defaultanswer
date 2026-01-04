import Script from "next/script";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BlogPostLayout from "@/components/blog/BlogPostLayout";
import { mdxComponents } from "@/components/blog/mdx-components";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

const siteUrl = "https://www.defaultanswer.com";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {};
  }

  const { meta } = post;
  const canonical = meta.canonical ?? `${siteUrl}/blog/${meta.slug}`;
  const ogImage = meta.ogImage ?? "/og.png";

  return {
    title: `${meta.title} | DefaultAnswer`,
    description: meta.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${meta.title} | DefaultAnswer`,
      description: meta.description,
      type: "article",
      images: [ogImage],
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const { meta, content } = post;
  const published = meta.date ?? "";
  const updated = meta.date ?? "";
  const canonicalUrl = meta.canonical ?? `${siteUrl}/blog/${meta.slug}`;
  const ogImage = meta.ogImage ?? "/og.png";
  const dateLabel = new Date(meta.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.description,
    datePublished: published,
    dateModified: updated,
    author: {
      "@type": "Organization",
      name: meta.author,
    },
    publisher: {
      "@type": "Organization",
      name: "DefaultAnswer",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    url: canonicalUrl,
    image: ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "DefaultAnswer",
      url: siteUrl,
    },
  };

  return (
    <>
      <Script
        id={`ld-blogposting-${meta.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogPostLayout
        title={meta.title}
        description={meta.description}
        dateLabel={dateLabel}
        readingTimeMinutes={meta.readingTimeMinutes}
        category={meta.category}
        coreClaim={meta.coreClaim}
        tldr={meta.tldr}
      >
        <MDXRemote source={content} components={mdxComponents} />
      </BlogPostLayout>
    </>
  );
}
