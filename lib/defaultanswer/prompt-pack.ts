/**
 * Prompt Pack for DefaultAnswer scoring
 * 
 * These prompts are used to query LLMs about brand recommendations.
 * Version is exported for traceability in reports.
 */

export const PROMPT_PACK_VERSION = "v1";

export type Prompt = {
  id: string;
  category: "best" | "alternatives" | "comparison" | "use_case";
  template: string;
  description: string;
};

/**
 * Returns the prompt pack for a given brand/domain.
 * Placeholders:
 *   {{brand}} - The brand or company name
 *   {{domain}} - The domain being analyzed
 *   {{category}} - The product/service category
 */
export function getPromptPack(params: {
  brand?: string;
  domain?: string;
  category?: string;
}): Prompt[] {
  const { brand = "your brand", domain = "your-domain.com", category = "category" } = params;

  return [
    // Best-in-class queries
    {
      id: "best-1",
      category: "best",
      template: `What is the best ${category}?`,
      description: "Direct best-in-class query",
    },
    {
      id: "best-2",
      category: "best",
      template: `What ${category} do you recommend?`,
      description: "Recommendation request",
    },
    {
      id: "best-3",
      category: "best",
      template: `What's the top ${category} in 2024?`,
      description: "Time-bound best query",
    },

    // Alternatives queries
    {
      id: "alt-1",
      category: "alternatives",
      template: `What are alternatives to ${brand}?`,
      description: "Direct alternatives query",
    },
    {
      id: "alt-2",
      category: "alternatives",
      template: `What's similar to ${brand}?`,
      description: "Similarity query",
    },
    {
      id: "alt-3",
      category: "alternatives",
      template: `${brand} competitors`,
      description: "Competitor lookup",
    },

    // Comparison queries
    {
      id: "cmp-1",
      category: "comparison",
      template: `${brand} vs competitors`,
      description: "Brand vs field comparison",
    },
    {
      id: "cmp-2",
      category: "comparison",
      template: `Is ${brand} better than a competitor?`,
      description: "Head-to-head comparison",
    },
    {
      id: "cmp-3",
      category: "comparison",
      template: `Compare ${brand} to other ${category} options`,
      description: "Category comparison",
    },

    // Use-case queries
    {
      id: "use-1",
      category: "use_case",
      template: `Is ${brand} good for small businesses?`,
      description: "Segment fit query",
    },
    {
      id: "use-2",
      category: "use_case",
      template: `Should I use ${brand} for ${category}?`,
      description: "Direct recommendation query",
    },
    {
      id: "use-3",
      category: "use_case",
      template: `When should I choose ${brand}?`,
      description: "Use-case qualification",
    },
  ];
}

/**
 * Get prompts by category
 */
export function getPromptsByCategory(
  params: Parameters<typeof getPromptPack>[0],
  category: Prompt["category"]
): Prompt[] {
  return getPromptPack(params).filter((p) => p.category === category);
}


