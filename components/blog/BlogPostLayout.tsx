import Link from "next/link";
import Script from "next/script";
import { BlogCallout } from "./BlogCallout";
import { BlogCTA } from "./BlogCTA";
import { BlogJumpNav } from "./BlogJumpNav";

type BlogPostLayoutProps = {
  // Post metadata
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;

  // Content sections
  intro?: React.ReactNode;
  children: React.ReactNode;

  // Optional callouts
  contextCallout?: {
    label?: string;
    content: React.ReactNode;
  };
  coreClaim?: React.ReactNode;
  keyIdea?: React.ReactNode;
  tldr?: string[];

  // Navigation
  jumpNavItems?: Array<{ href: string; label: string }>;

  // Related content
  relatedPosts?: Array<{
    href: string;
    label: string;
  }>;

  // CTA customization
  showCTA?: boolean;
  ctaPosition?: "end" | "middle-and-end";
  customCTA?: React.ReactNode;

  // Closing section
  closingNote?: React.ReactNode;
};

export function BlogPostLayout({
  slug,
  title,
  description,
  date,
  updatedAt,
  intro,
  children,
  contextCallout,
  coreClaim,
  keyIdea,
  tldr,
  jumpNavItems,
  relatedPosts,
  showCTA = true,
  ctaPosition = "end",
  customCTA,
  closingNote,
}: BlogPostLayoutProps) {
  const siteUrl = "https://www.defaultanswer.com";
  const canonicalUrl = `${siteUrl}/blog/${slug}`;
  const published = date;
  const updated = updatedAt ?? published;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description,
    datePublished: published,
    dateModified: updated,
    author: {
      "@type": "Organization",
      name: "DefaultAnswer",
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
    image: `${siteUrl}/og.png`,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "DefaultAnswer",
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <Script
        id={`ld-blogposting-${slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-12">
        {/* Breadcrumb */}
        <div className="text-sm text-stone-600 dark:text-stone-300">
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span>AI recommendations</span>
        </div>

        {/* Title */}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>

        {/* Header callouts section */}
        <div className="mx-auto mt-5 max-w-3xl space-y-6">
          {/* Intro paragraph */}
          {intro && (
            <div className="text-base leading-relaxed text-stone-700 dark:text-stone-300">
              {intro}
            </div>
          )}

          {/* Related posts at top (if provided) */}
          {relatedPosts && relatedPosts.length > 0 && (
            <p className="text-base leading-relaxed text-stone-700 dark:text-stone-300">
              Related:{" "}
              {relatedPosts.map((post, idx) => (
                <span key={post.href}>
                  {idx > 0 && ", "}
                  <Link
                    href={post.href}
                    className="underline hover:text-stone-900 dark:hover:text-stone-50"
                  >
                    {post.label}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}

          {/* Context callout (optional - for explaining DefaultAnswer) */}
          {contextCallout && (
            <BlogCallout label={contextCallout.label || "DEFAULTANSWER CONTEXT"}>
              <div className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {contextCallout.content}
              </div>
            </BlogCallout>
          )}

          {/* Core claim */}
          {coreClaim && (
            <BlogCallout label="Core claim">
              <div className="text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-50">
                {coreClaim}
              </div>
            </BlogCallout>
          )}

          {/* Key idea */}
          {keyIdea && (
            <BlogCallout label="Key idea">
              <div className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {keyIdea}
              </div>
            </BlogCallout>
          )}

          {/* TL;DR */}
          {tldr && tldr.length > 0 && (
            <BlogCallout label="TL;DR">
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {tldr.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </BlogCallout>
          )}

          {/* Jump navigation */}
          {jumpNavItems && jumpNavItems.length > 0 && <BlogJumpNav items={jumpNavItems} />}
        </div>

        {/* Main content */}
        <div className="mx-auto mt-10 max-w-3xl space-y-12 text-stone-700 dark:text-stone-300">
          {children}

          {/* CTA in middle (if requested) */}
          {showCTA && ctaPosition === "middle-and-end" && (
            <div className="mt-6">{customCTA || <BlogCTA />}</div>
          )}

          {/* Closing note or final CTA */}
          {closingNote && (
            <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
              {closingNote}
            </div>
          )}

          {/* Final CTA */}
          {showCTA && <div className="mt-6">{customCTA || <BlogCTA />}</div>}
        </div>
      </article>
    </div>
  );
}
