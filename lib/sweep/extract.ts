type ExtractArgs = {
  responseText: string;
  brandNames: string[];
  domains: string[];
  expectList?: boolean;
};

type ExtractResult = {
  hasBrandMention: boolean;
  hasDomainMention: boolean;
  mentioned: boolean;
  mentionRank: number | null;
  winner: string | null;
  alternatives: string[];
  confidence: number;
  parseFailed: boolean;
  extractionConfidence: "high" | "medium" | "low";
};

type LearningExtractResult = {
  refusal_type: "none" | "partial" | "full";
  category_label: string | null;
  winner: string | null;
  mentioned_domains: string[];
  mentioned_brands: string[];
  confidence_language: "hedged" | "assertive" | "mixed";
};

type ListItem = {
  text: string;
  index: number;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasToken(text: string, tokens: string[]): boolean {
  return tokens.some((token) => {
    if (!token) return false;
    const pattern = token
      .trim()
      .replace(/\s+/g, "\\s+");
    const re = new RegExp(`\\b${pattern}\\b`, "i");
    return re.test(text);
  });
}

function parseListItems(rawText: string, expectList: boolean): ListItem[] {
  if (!expectList) return [];
  const lines = rawText.split(/\r?\n/);
  const numbered: ListItem[] = [];
  const bullets: ListItem[] = [];
  for (const line of lines) {
    const numMatch = line.match(/^\s*(\d+)[\.\)]\s+(.*)$/);
    if (numMatch) {
      const index = Number(numMatch[1]);
      if (Number.isFinite(index)) {
        numbered.push({ index, text: numMatch[2].trim() });
      }
      continue;
    }
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      bullets.push({ index: bullets.length + 1, text: bulletMatch[1].trim() });
    }
  }
  const byIndex = new Map<number, string>();
  for (const item of numbered) {
    if (!byIndex.has(item.index)) {
      byIndex.set(item.index, item.text);
    }
  }
  const ordered: ListItem[] = [];
  for (let idx = 1; idx <= 5; idx += 1) {
    const text = byIndex.get(idx);
    if (!text) break;
    ordered.push({ index: idx, text });
  }
  if (ordered.length > 0) return ordered;
  return bullets.slice(0, 5);
}

function stripToName(text: string): string {
  const normalized = text.replace(/[\u2013\u2014]/g, "-");
  const split = normalized.split(/[-:()]/)[0] || "";
  return split.trim();
}

function detectWinner(rawText: string): string | null {
  const match = rawText.match(/(?:best is|best:|top pick is|recommend(?:ed)?|winner is)\s+([^\n\.,;]+)/i);
  if (!match) return null;
  return stripToName(match[1]);
}

function isLikelyName(value: string): boolean {
  const text = value.trim();
  if (text.length < 2) return false;
  if (text.length > 80) return false;
  if (text.includes("\"") || text.includes("'")) return false;
  if (/[.!?]/.test(text)) return false;
  const lower = text.toLowerCase();
  const refusalTokens = [
    "i don't",
    "i do not",
    "can't",
    "cannot",
    "sorry",
    "unable",
    "as an ai",
    "i am",
    "i'm",
    "i cannot",
    "i don't have",
  ];
  if (refusalTokens.some((token) => lower.includes(token))) return false;
  if (text.split(/\s+/).length > 6) return false;
  return true;
}

function getExtractionConfidence(args: {
  responseText: string;
  listItems: ListItem[];
  parseFailed: boolean;
}): "high" | "medium" | "low" {
  if (args.parseFailed) return "low";
  if (args.listItems.length > 0) return "high";
  const normalized = normalize(args.responseText);
  const hedges = [
    "unknown",
    "unclear",
    "not sure",
    "unsure",
    "maybe",
    "might",
    "cannot",
    "can't",
    "hard to say",
  ];
  if (hedges.some((token) => normalized.includes(token))) return "low";
  if (normalized.length > 120) return "medium";
  return "low";
}

function extractDomains(text: string): string[] {
  const matches = text.match(/\b[a-z0-9][a-z0-9.-]+\.[a-z]{2,}\b/gi) || [];
  const cleaned = matches
    .map((value) => value.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

function extractBrands(text: string): string[] {
  const matches = text.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3}\b/g) || [];
  const stop = new Set(["I", "The", "This", "That", "These", "Those", "AI", "LLM"]);
  const cleaned = matches
    .map((value) => value.trim())
    .filter((value) => value.length >= 2 && value.length <= 40 && !stop.has(value))
    .map((value) => value.toLowerCase());
  return Array.from(new Set(cleaned));
}

function detectRefusalType(text: string): "none" | "partial" | "full" {
  const normalized = normalize(text);
  if (!normalized) return "full";
  const refusalTokens = [
    "i cannot",
    "i can't",
    "i do not",
    "i don't",
    "i am unable",
    "i'm unable",
    "i cannot access",
    "i can't access",
    "no access",
    "not able to access",
    "cannot browse",
    "can't browse",
    "unable to browse",
    "as an ai",
    "i don't have access",
  ];
  const refused = refusalTokens.some((token) => normalized.includes(token));
  if (!refused) return "none";
  const partialMarkers = ["however", "but", "still", "general guidance", "in general"];
  if (partialMarkers.some((token) => normalized.includes(token)) && normalized.length > 80) {
    return "partial";
  }
  return "full";
}

function extractCategoryLabel(text: string): string | null {
  const direct = text.match(/category\s*:\s*([^\n\.;]+)/i);
  const fallback = text.match(/this is (?:an|a)\s+([^\n\.;]+)/i);
  const value = (direct?.[1] || fallback?.[1] || "").trim();
  if (!value) return null;
  if (value.length > 80) return null;
  return value;
}

function detectConfidenceLanguage(text: string): "hedged" | "assertive" | "mixed" {
  const normalized = normalize(text);
  const hedgedTokens = [
    "might",
    "may",
    "could",
    "possibly",
    "likely",
    "seems",
    "appears",
    "unclear",
    "not sure",
    "unsure",
    "unknown",
  ];
  const assertiveTokens = ["definitely", "clearly", "will", "always", "must", "best", "top"];
  const hedged = hedgedTokens.some((token) => normalized.includes(token));
  const assertive = assertiveTokens.some((token) => normalized.includes(token));
  if (hedged && assertive) return "mixed";
  if (hedged) return "hedged";
  return "assertive";
}

export function extractLearningFields(args: { prompt: string; response: string | null }): LearningExtractResult {
  const prompt = args.prompt || "";
  const response = args.response || "";
  const winner = detectWinner(response);
  return {
    refusal_type: detectRefusalType(response),
    category_label: extractCategoryLabel(response),
    winner: winner && isLikelyName(winner) ? winner : null,
    mentioned_domains: extractDomains(`${prompt}\n${response}`).slice(0, 10),
    mentioned_brands: extractBrands(response).slice(0, 10),
    confidence_language: detectConfidenceLanguage(response),
  };
}

export function extractSweepSignals(args: ExtractArgs): ExtractResult {
  const responseText = args.responseText || "";
  const normalized = normalize(responseText);
  const hasBrandMention = hasToken(normalized, args.brandNames);
  const hasDomainMention = args.domains.some((domain) =>
    domain ? normalized.includes(domain.toLowerCase()) : false
  );
  const mentioned = hasBrandMention || hasDomainMention;

  const expectList = args.expectList ?? true;
  const listItems = parseListItems(responseText, expectList);
  const parseFailed = expectList && listItems.length === 0;
  let mentionRank: number | null = null;
  if (!parseFailed) {
    listItems.forEach((item) => {
      if (mentionRank) return;
      const itemNorm = normalize(item.text);
      if (hasToken(itemNorm, args.brandNames) || args.domains.some((d) => itemNorm.includes(d.toLowerCase()))) {
        mentionRank = item.index;
      }
    });
  }

  let winner: string | null = null;
  let alternatives: string[] = [];
  if (!parseFailed && listItems.length > 0) {
    const candidate = stripToName(listItems[0].text) || "";
    winner = isLikelyName(candidate) ? candidate : null;
    alternatives = listItems
      .slice(1, 5)
      .map((item) => stripToName(item.text))
      .filter((item) => item && isLikelyName(item));
  } else {
    winner = detectWinner(responseText);
    if (winner && !isLikelyName(winner)) {
      winner = null;
    }
  }

  let confidence = 0;
  if (mentionRank === 1) confidence += 60;
  else if (mentionRank && mentionRank <= 3) confidence += 40;
  else if (mentioned) confidence += 20;
  if (winner) confidence += 10;
  confidence = Math.max(0, Math.min(100, confidence));

  return {
    hasBrandMention,
    hasDomainMention,
    mentioned,
    mentionRank,
    winner,
    alternatives,
    confidence,
    parseFailed,
    extractionConfidence: getExtractionConfidence({ responseText, listItems, parseFailed }),
  };
}
