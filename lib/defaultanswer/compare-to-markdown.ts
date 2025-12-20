import type { CompareResponseSuccess } from "./compare";

type BreakdownRow = {
  label: string;
  aPoints: number;
  bPoints: number;
  max: number;
  delta: number;
};

function oneLine(s?: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function trunc(s: string, n = 180) {
  const t = oneLine(s);
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export function compareToMarkdown(payload: CompareResponseSuccess): string {
const { a, b, diff } = payload;
const rows = buildBreakdownRows(a.breakdown, b.breakdown);
const lines: string[] = [];
const timestamp = new Date().toISOString();

  lines.push(`# DefaultAnswer Compare Report`);
  lines.push("");
  lines.push(`**URLs:** ${a.url} (you) vs ${b.url} (competitor)`);
  lines.push(`**Generated at:** ${timestamp}`);
  lines.push("");
  lines.push(`## Scores`);
  lines.push(`- You: ${a.score}`);
  lines.push(`- Competitor: ${b.score}`);
  lines.push(`- Delta (competitor - you): ${diff.scoreDelta}`);
  lines.push("");

  lines.push("## Biggest Gaps");
  if (diff.biggestGaps.length === 0) {
    lines.push("- None detected.");
  } else {
    diff.biggestGaps.slice(0, 5).forEach((g) =>
      lines.push(`- ${g.label}: competitor ${g.delta >= 0 ? "+" : ""}${g.delta} (${g.aPoints}/${g.max} vs ${g.bPoints}/${g.max})`)
    );
  }
  lines.push("");

  lines.push("## Quick Wins (for you)");
  if (diff.quickWins.length === 0) {
    lines.push("- None detected.");
  } else {
    diff.quickWins.slice(0, 5).forEach((g) => lines.push(`- ${g.label}: ${g.suggestedAction}`));
  }
  lines.push("");

  lines.push("## Breakdown (Side-by-Side)");
  lines.push("| Signal | You | Competitor | Max | Delta |");
  lines.push("| --- | --- | --- | --- | --- |");
  rows.forEach((r) => {
    lines.push(`| ${r.label} | ${r.aPoints}/${r.max} | ${r.bPoints}/${r.max} | ${r.max} | ${r.delta} |`);
  });
  lines.push("");

  lines.push("## Key Evidence");
  lines.push("### You");
  lines.push(...formatEvidenceLines(a));
  lines.push("");
  lines.push("### Competitor");
  lines.push(...formatEvidenceLines(b));

  return lines.join("\n");
}

function buildBreakdownRows(a: any[], b: any[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  const add = (items: any[], side: "aPoints" | "bPoints") => {
    for (const item of items) {
      const key = `${item.category}::${item.label}`;
      if (!map.has(key)) {
        map.set(key, { label: `${item.category}: ${item.label}`, aPoints: 0, bPoints: 0, max: item.max || 0, delta: 0 });
      }
      const entry = map.get(key)!;
      entry[side] = item.points;
      entry.max = item.max || entry.max;
      map.set(key, entry);
    }
  };
  add(a, "aPoints");
  add(b, "bPoints");
  return Array.from(map.values()).map((r) => ({ ...r, delta: r.bPoints - r.aPoints }));
}

function formatEvidenceLines(side: CompareResponseSuccess["a"]): string[] {
  const ev = side.extracted.evidence;
  const lines: string[] = [];
  if (side.extracted.title) lines.push(`- Title: ${trunc(side.extracted.title)}`);
  if (side.extracted.h1s?.[0]) lines.push(`- H1: ${trunc(side.extracted.h1s[0])}`);
  const pricingArr = side.analysis?.extracted?.evidence?.pricingEvidence || ev?.pricingEvidence;
  const pricingOut =
    Array.isArray(pricingArr) && pricingArr.length > 0 ? trunc(pricingArr[0], 180) : "(none)";
  if (pricingArr === undefined) {
    console.warn("[compare export] pricingEvidence missing for", side.url);
  }
  lines.push(`- Pricing: ${pricingOut}`);
  if (ev?.faqEvidence) {
    const faq = ev.faqEvidence;
    const faqText = faq.explicitFaqDetected
      ? "Explicit FAQ found"
      : faq.indirectFaqLinks.length
        ? "Indirect FAQ links"
        : "No FAQ signals";
    lines.push(`- FAQ: ${faqText}`);
  }
  if (side.extracted.schemaTypes?.length) {
    lines.push(`- Schema types: ${side.extracted.schemaTypes.slice(0, 5).map(oneLine).join(", ")}`);
  }
  return lines.length ? lines : ["- No evidence captured."];
}
