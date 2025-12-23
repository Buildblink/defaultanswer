export type ScanDeltaInput = {
  score: number;
  readiness: string;
  coverage_overall: number;
  has_faq: boolean;
  has_schema: boolean;
  has_pricing: boolean;
};

export function computeScanDelta(current: ScanDeltaInput, previous: ScanDeltaInput) {
  const scoreDelta = current.score - previous.score;
  const coverageDelta = current.coverage_overall - previous.coverage_overall;
  const readinessChanged = current.readiness !== previous.readiness;
  const chips: { label: string; tone: "positive" | "negative" | "neutral" }[] = [];

  if (current.has_pricing !== previous.has_pricing) {
    chips.push({
      label: current.has_pricing ? "Pricing now visible" : "Pricing no longer visible",
      tone: current.has_pricing ? "positive" : "negative",
    });
  }
  if (current.has_schema !== previous.has_schema && chips.length < 3) {
    chips.push({
      label: current.has_schema ? "Schema added" : "Schema removed",
      tone: current.has_schema ? "positive" : "negative",
    });
  }
  if (current.has_faq !== previous.has_faq && chips.length < 3) {
    chips.push({
      label: current.has_faq ? "FAQ added" : "FAQ removed",
      tone: current.has_faq ? "positive" : "negative",
    });
  }

  if (chips.length < 3) {
    if (scoreDelta >= 5) {
      chips.push({ label: "Score improved", tone: "positive" });
    } else if (scoreDelta <= -5) {
      chips.push({ label: "Score dropped", tone: "negative" });
    }
  }

  const summaryLine = `Since last scan: Score ${formatDelta(scoreDelta)}, Coverage ${formatDelta(coverageDelta)}`;

  return {
    scoreDelta,
    coverageDelta,
    readinessChanged,
    chips: chips.slice(0, 3),
    summaryLine,
  };
}

function formatDelta(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}
