export const PROMPT_SET_VERSION = "v3-grounded";

export type SweepPrompt = {
  key: string;
  template: string;
  intent:
    | "grounding"
    | "evaluation"
    | "category_ranking"
    | "citation_style"
    | "learning_v1_1"
    | "learning_confidence_gate_v1";
};

const LIST =
  "Return a numbered list of exactly 5 items (1-5). One concise sentence per item.";

const CATEGORY = "{{CATEGORY}}";
const BRAND = "{{BRAND_NAME}}";
const DOMAIN = "{{DOMAIN}}";

export const SWEEP_PROMPTS: SweepPrompt[] = [
  {
    key: "ground_brand_name_inference",
    intent: "grounding",
    template: `Based only on the name "${BRAND}", what kind of product or service would you expect this to be? Answer in 1 short paragraph.`,
  },
  {
    key: "ground_domain_inference",
    intent: "grounding",
    template: `Based on public web patterns, what would you expect ${DOMAIN} to offer? Answer in 1-2 neutral sentences.`,
  },
  {
    key: "ground_category_assignment",
    intent: "grounding",
    template: `If ${BRAND} were a real product, which category would it most logically belong to? Respond with ONE category and one sentence explaining why.`,
  },
  {
    key: "ground_problem_definition",
    intent: "grounding",
    template: `What problem would a product like ${BRAND} likely be designed to solve? Answer in 1 short paragraph.`,
  },
  {
    key: "evaluation_recommendation_trigger",
    intent: "evaluation",
    template: `In what situations or user questions would you recommend a tool like ${BRAND}? Answer briefly.`,
  },
  {
    key: "evaluation_non_recommendation",
    intent: "evaluation",
    template: `In what situations would you NOT recommend a tool like ${BRAND}, and why?`,
  },
  {
    key: "evaluation_category_fit",
    intent: "evaluation",
    template: `Would ${BRAND} be a reasonable recommendation in the category "${CATEGORY}"? Explain briefly why or why not.`,
  },
  {
    key: "category_natural_mentions",
    intent: "category_ranking",
    template: `If someone asks for tools in the category "${CATEGORY}", which products or services would you naturally mention? ${LIST}`,
  },
  {
    key: "category_top_tools",
    intent: "category_ranking",
    template: `List the top tools for "${CATEGORY}". ${LIST}`,
  },
  {
    key: "category_compare_tools",
    intent: "category_ranking",
    template: `Compare the leading tools in "${CATEGORY}". ${LIST}`,
  },
  {
    key: "category_brand_vs_competitors",
    intent: "category_ranking",
    template: `Compare ${BRAND} to other tools in "${CATEGORY}". What stands out and what is unclear?`,
  },
  {
    key: "citation_expected_evidence",
    intent: "citation_style",
    template: `If you were to cite ${BRAND} alongside competitors in "${CATEGORY}", what public evidence would you expect to see first?`,
  },
  {
    key: "citation_citable_content",
    intent: "citation_style",
    template: `What types of public pages or content make a product in "${CATEGORY}" more citeable by AI assistants? ${LIST}`,
  },
  {
    key: "citation_sources_confidence",
    intent: "citation_style",
    template: `When answering questions about "${CATEGORY}", what kinds of sources or pages would you feel confident citing, and why?`,
  },
  {
    key: "learning_category_assignment",
    intent: "learning_v1_1",
    template: `You are labeling a software product for a directory.

Return exactly one line in this format:
Category: <2-5 words>

Brand: ${BRAND}
Domain: ${DOMAIN}`,
  },
  {
    key: "learning_directory_category",
    intent: "learning_v1_1",
    template: `If ${BRAND} appeared in a software directory, what category would it be listed under? Format: Category: ...`,
  },
  {
    key: "learning_invent_category",
    intent: "learning_v1_1",
    template: `Invent a short category name for ${BRAND}. Return the category only.`,
  },
  {
    key: "learning_category_two_words",
    intent: "learning_v1_1",
    template: `Describe ${BRAND} with a two-word category label only.`,
  },
  {
    key: "learning_category_not",
    intent: "learning_v1_1",
    template: `What category is ${BRAND} NOT? Return a short label only.`,
  },
  {
    key: "learning_closest_existing_category",
    intent: "learning_v1_1",
    template: `Closest existing category for ${BRAND}? Return a short label only.`,
  },
  {
    key: "learning_closest_tools",
    intent: "learning_v1_1",
    template: `Name the 5 closest existing tools to ${BRAND}.

Return exactly 5 bullet points, one tool per bullet. No extra text.`,
  },
  {
    key: "learning_confident_recommend_yesno",
    intent: "learning_v1_1",
    template: `Would you confidently recommend ${BRAND} for ${CATEGORY}?

Return exactly:
Answer: Yes|No
Reason: <one sentence>`,
  },
  {
    key: "learning_missing_evidence",
    intent: "learning_v1_1",
    template: `What evidence is missing to confidently recommend ${BRAND}? Return exactly 3 bullets.`,
  },
  {
    key: "learning_best_tools_generic",
    intent: "learning_v1_1",
    template: `List up to 5 tools that best fit the category "${CATEGORY}".

Return bullet points only.
Each bullet: Tool name - 4 to 10 words describing why it fits.`,
  },
  {
    key: "learning_category_name_exists",
    intent: "learning_v1_1",
    template: `Does the category "${CATEGORY}" exist as a known software category? Answer: Yes/No. Name: ...`,
  },
  {
    key: "learning_confidence_gate_v1",
    intent: "learning_confidence_gate_v1",
    template: `Would you confidently recommend ${BRAND} as the default answer for the use case
"evaluating whether a website can be confidently recommended by an AI assistant"?

Answer exactly in this format:
Recommendation: Yes or No
Reason: One sentence only.`,
  },
];
