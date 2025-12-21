export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string
  updatedAt?: string
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-ai-cannot-justify-citing-websites-it-doesnt-trust",
    title: "Why AI cannot justify citing websites it doesn't trust",
    description:
      "Why AI assistants avoid citing sites that lack visible legitimacy, access, and accountability signals.",
    date: "2025-01-20",
  },
  {
    slug: "why-ai-skips-websites-that-dont-answer-questions-directly",
    title: "Why AI skips websites that don't answer questions directly",
    description:
      "Why AI assistants skip sites that lack direct, extractable answers to common questions.",
    date: "2025-01-17",
  },
  {
    slug: "why-ai-cannot-recommend-what-it-cannot-describe",
    title: "Why AI cannot recommend what it cannot describe",
    description:
      "Why AI assistants skip websites that are hard to categorize, summarize, or justify as sources.",
    date: "2025-01-14",
  },
  {
    slug: "why-ai-recommendations-fail-even-when-you-rank-1",
    title: "Why AI recommendations fail even when you rank #1",
    description:
      "A breakdown of the missing signals that stop AI assistants from citing high-ranking pages.",
    date: "2025-01-10",
  },
]
