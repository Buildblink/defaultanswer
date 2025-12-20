/**
 * DefaultAnswer Report to Markdown Converter (V1.7)
 * 
 * Generates canonical Markdown output that can be copied
 * and pasted directly into ChatGPT/Claude/Perplexity.
 */

import { PROMPT_PACK_VERSION } from "./prompt-pack";
import { DEFAULTANSWER_VERSION } from "./version";
import type { FetchDiagnostics, SnapshotQuality } from "./scoring";
import type { SimulationResult } from "./simulation";

export type LiveRecommendationCheck = {
  id: string;
  query: string;
  model: "ChatGPT" | "Claude" | "Perplexity" | "Gemini" | "Copilot" | "Other";
  answer: string;
  outcome: "default" | "top_alternative" | "listed_option" | "not_mentioned";
  bullets: string[];
  guidance: string;
  brandFound: boolean;
  firstMentionIndex?: number;
  competitorCandidates?: { label: string; type: "domain" | "name"; count: number }[];
  createdAt: string;
};

export type ReportData = {
  url: string;
  score: number;
  readiness: {
    label: string;
    explanation: string;
  };
  summaryNote?: string;
  breakdown: Array<{
    label: string;
    points: number;
    max: number;
    reason: string;
    category?: string;
  }>;
  reasoning?: Array<{
    signal: string;
    interpretation: string;
    impact: "positive" | "negative" | "neutral";
  }>;
  fixPlan?: Array<{
    priority: string;
    action: string;
  }>;
  topFix?: {
    action: string;
    why: string;
    steps: string[];
  };
  simulation?: SimulationResult;
  liveChecks?: LiveRecommendationCheck[];
  competitiveDelta?: Array<{
    query: string;
    competitorAdvantage: string;
    whyLose: string;
  }>;
  historyDiff?: {
    scoreDelta: number;
    readinessChanged: boolean;
    signalChanges: { gained: string[]; lost: string[] };
    breakdownChanges: Array<{ label: string; category: string; delta: number }>;
  };
  snapshotQuality?: SnapshotQuality;
  fetchDiagnostics?: FetchDiagnostics;
  evidence?: {
    titleText?: string;
    h1Text?: string;
    h2Texts?: string[];
    schemaTypes?: string[];
    contactEvidence?: string[];
    faqEvidence?: {
      explicitFaqDetected: boolean;
      indirectFaqLinks: string[];
      directAnswerSnippets: string[];
    };
  };
  metadata: {
    reportId: string;
    domain: string;
    brand: string;
    timestamp: string;
    version: string;
    pageEvaluated?: string;
    evaluatedUrl?: string;
    canonicalUrl?: string;
    fetchTimestamp?: string;
  };
};

export function reportToMarkdown(report: ReportData): string {
  const lines: string[] = [];

  // Header
  lines.push("# DefaultAnswer Report");
  lines.push("");

  // Summary section
  lines.push("## Summary");
  lines.push(`- **URL:** ${report.url || "N/A"}`);
  lines.push(`- **Default Answer Score™:** ${report.score >= 0 ? `${report.score}/100` : "Pending"}`);
  lines.push(`- **Default Answer Readiness:** ${report.readiness.label}`);
  lines.push(`- **Verdict:** ${report.readiness.explanation}`);
  if (report.summaryNote) {
    lines.push(`- **Note:** ${report.summaryNote}`);
  }
  lines.push("");

  // What to Fix First (if available)
  if (report.topFix) {
    lines.push("## The one change that would most increase my confidence");
    lines.push("**If you fix one thing, fix this:**");
    lines.push(`- **Action:** ${report.topFix.action}`);
    lines.push(`- **Why this matters to the model:** ${report.topFix.why}`);
    lines.push("- **How to validate:**");
    report.topFix.steps.forEach((step, idx) => {
      lines.push(`  ${idx + 1}. ${step}`);
    });
    lines.push("");
  }

  // Score Breakdown (grouped by category)
  if (report.breakdown && report.breakdown.length > 0) {
    lines.push("## Score Breakdown");
    
    // Group by category
    const byCategory = groupBreakdownByCategory(report.breakdown);
    
    for (const [category, items] of byCategory) {
      const categoryPoints = items.reduce((sum, i) => sum + i.points, 0);
      const categoryMax = items.reduce((sum, i) => sum + i.max, 0);
      lines.push(`### ${category} (${categoryPoints}/${categoryMax})`);
      
      for (const item of items) {
        const status = item.points === item.max ? "✓" : item.points > 0 ? "△" : "✗";
        lines.push(`- ${status} **${item.label}:** ${item.points}/${item.max} — ${item.reason}`);
      }
      lines.push("");
    }
  }

  // Evidence (Snapshot) - short, defensible signals only
  lines.push("## Evidence (Snapshot)");
  if (report.fetchDiagnostics?.errorType === "blocked" || (report.score < 0 && !report.evidence)) {
    lines.push("- **Evidence:** Unavailable (fetch blocked or not captured)");
    lines.push("");
  } else if (report.snapshotQuality && report.snapshotQuality !== "ok") {
    lines.push("- **Evidence:** Evidence limited — HTML snapshot incomplete.");
    lines.push("");
  } else {
    const ev = report.evidence;
    if (ev) {
      if (ev.titleText) lines.push(`- **Title:** ${ev.titleText}`);
      if (ev.h1Text) lines.push(`- **H1:** ${ev.h1Text}`);
      if (ev.h2Texts?.length) {
        lines.push(`- **H2s (first 5):**`);
        ev.h2Texts.slice(0, 5).forEach((h) => lines.push(`  - ${h}`));
      }
      if (ev.schemaTypes) {
        lines.push(
          `- **Schema types:** ${ev.schemaTypes.length ? `[${ev.schemaTypes.join(", ")}]` : "[]"}`
        );
      }
      if (ev.contactEvidence?.length) {
        lines.push(`- **Contact evidence:** ${ev.contactEvidence.slice(0, 2).join(", ")}`);
      }
      if (ev.faqEvidence) {
        const f = ev.faqEvidence;
        lines.push(
          `- **FAQ signals:** explicit=${f.explicitFaqDetected ? "yes" : "no"}, indirect_links=${f.indirectFaqLinks.length}, direct_answer_snippets=${f.directAnswerSnippets.length}`
        );
      }
    }
    lines.push("");
  }

  // Snapshot diagnostics
  lines.push("## Snapshot Diagnostics");
  const diag = report.fetchDiagnostics;
  lines.push(`- HTTP status: ${diag?.status ?? "N/A"}`);
  lines.push(`- Content type: ${diag?.contentType ?? "N/A"}`);
  lines.push(
    `- Bytes received: ${
      typeof diag?.bytes === "number" ? diag.bytes.toLocaleString() : "N/A"
    }`
  );
  lines.push(`- Snapshot quality: ${report.snapshotQuality ?? "N/A"}`);
  lines.push(`- Fetch timestamp: ${report.metadata.fetchTimestamp || report.metadata.timestamp}`);
  lines.push("");

  // Competitive Delta
  if (report.competitiveDelta && report.competitiveDelta.length > 0) {
    lines.push("## Where AI Might Recommend Alternatives Instead");
    for (const bullet of report.competitiveDelta.slice(0, 4)) {
      lines.push(`- **When users ask:** “${bullet.query}”`);
      lines.push(`  **AI is more likely to cite sites that:** ${bullet.competitorAdvantage}`);
      lines.push(`  **Why you lose here:** ${bullet.whyLose}`);
    }
    lines.push("");
  }

  // History Diff
  if (report.historyDiff) {
    lines.push("## What changed since last scan");
    lines.push(`- Score change: ${report.historyDiff.scoreDelta >= 0 ? "+" : ""}${report.historyDiff.scoreDelta}`);
    if (report.historyDiff.readinessChanged) {
      lines.push("- Readiness changed");
    }
    if (report.historyDiff.signalChanges.gained.length > 0) {
      lines.push(`- Signals gained: ${report.historyDiff.signalChanges.gained.join(", ")}`);
    }
    if (report.historyDiff.signalChanges.lost.length > 0) {
      lines.push(`- Signals lost: ${report.historyDiff.signalChanges.lost.join(", ")}`);
    }
    if (report.historyDiff.breakdownChanges.length > 0) {
      lines.push("- Top movers:");
      report.historyDiff.breakdownChanges.slice(0, 5).forEach((m) =>
        lines.push(`  - ${m.category}: ${m.label} (${m.delta >= 0 ? "+" : ""}${m.delta})`)
      );
    }
    lines.push("");
  }

  // How AI Interprets Your Brand (if reasoning available)
  if (report.reasoning && report.reasoning.length > 0) {
    lines.push("## How AI Interprets Your Brand");
    
    for (const bullet of report.reasoning) {
      const impactLabel = bullet.impact === "positive" ? "Strength" : bullet.impact === "negative" ? "Weakness" : "Neutral";
      lines.push(`- **(${impactLabel} — ${bullet.signal})** ${bullet.interpretation}`);
    }
    lines.push("");
  }

  // Live Simulation (LLM)
  if (report.simulation) {
    const sim = report.simulation;
    const recommended = sim.recommendedAsDefault ?? sim.likely_inclusion?.included ?? false;
    const confidence = sim.confidence ?? sim.likely_inclusion?.confidence ?? 0;
    const topReasons = sim.topReasons?.length ? sim.topReasons : sim.likely_inclusion?.why || [];
    const missingSignals = sim.missingSignals?.length ? sim.missingSignals : sim.missing_signals || [];

    lines.push("## Live Simulation (LLM)");
    lines.push(`- Would AI recommend you?: ${recommended ? "Yes" : "No"} (confidence ${confidence}/100)`);

    if (topReasons.length) {
      lines.push("- Top reasons:");
      topReasons.slice(0, 5).forEach((r) => lines.push(`  - ${r}`));
    }

    if (missingSignals.length) {
      lines.push("- Missing signals:");
      missingSignals.slice(0, 7).forEach((m) => lines.push(`  - ${m}`));
    }

    if (sim.nextActions?.length) {
      lines.push("- Next actions:");
      sim.nextActions.slice(0, 8).forEach((a) =>
        lines.push(`  - [${a.priority.toUpperCase()}] ${a.action} (Why: ${a.why}; Validate: ${a.validate})`)
      );
    }

    if (sim.decision_criteria?.length) {
      lines.push("- Decision criteria:");
      sim.decision_criteria.slice(0, 10).forEach((c) => lines.push(`  - ${c}`));
    }

    if (sim.alternative_categories?.length) {
      lines.push("- Alternative categories AI might choose instead:");
      sim.alternative_categories.slice(0, 4).forEach((c) =>
        lines.push(`  - ${c.category} — ${c.why_ai_picks_it}`)
      );
    }

    lines.push("");
    lines.push("## Recommended Definition Block");
    lines.push(`H1: ${sim.recommended_definition_block.h1}`);
    lines.push(`Subheadline: ${sim.recommended_definition_block.subheadline}`);
    sim.recommended_definition_block.three_bullets.slice(0, 3).forEach((b) => lines.push(`- ${b}`));
    lines.push("");
    lines.push(
      sim.disclaimer ||
        "This is a model-based simulation using your homepage snapshot + general LLM behavior. It is not a measurement of live model outputs."
    );
    lines.push("");
  }

  // 14-Day Fix Plan (if available)
  if (report.fixPlan && report.fixPlan.length > 0) {
    lines.push("## 14-Day Fix Plan");
    
    for (const fix of report.fixPlan) {
      const priorityTag = `[${fix.priority.toUpperCase()}]`;
      lines.push(`- ${priorityTag} ${fix.action}`);
    }
    lines.push("");
  }

  // Live AI Recommendation Check (if available)
  if (report.liveChecks && report.liveChecks.length > 0) {
    lines.push("## Live AI Recommendation Check (Proof Mode)");
    report.liveChecks.slice(0, 5).forEach((check, idx) => {
      const label = check.createdAt ? `Result ${idx + 1} (${check.createdAt})` : `Result ${idx + 1}`;
      lines.push(`**${label}**`);
      lines.push(`- **Query:** ${check.query}`);
      lines.push(`- **Model:** ${check.model}`);
      lines.push(`- **Outcome:** ${formatOutcome(check.outcome)}`);
      if (check.competitorCandidates && check.competitorCandidates.length > 0) {
        lines.push("- **Competitors mentioned:**");
        check.competitorCandidates.slice(0, 5).forEach((c) =>
          lines.push(`  - ${c.label} (${c.type}, ${c.count}x)`)
        );
      }
      lines.push("- **Why:**");
      (check.bullets || []).slice(0, 5).forEach((s) => lines.push(`  - ${s}`));
      lines.push("- **What this means:**");
      lines.push(`  - ${check.guidance || ""}`);
      lines.push("");
    });
  }

  // Metadata
  lines.push("## Metadata");
  lines.push(`- **Report ID:** ${report.metadata.reportId}`);
  lines.push(`- **Domain:** ${report.metadata.domain || "N/A"}`);
  lines.push(`- **Brand (guessed):** ${report.metadata.brand || "N/A"}`);
  if (report.metadata.pageEvaluated) {
    lines.push(`- **Page evaluated:** ${report.metadata.pageEvaluated}`);
  }
  if (report.metadata.canonicalUrl) {
    lines.push(`- **Evaluated URL (canonical):** ${report.metadata.canonicalUrl}`);
  } else if (report.metadata.evaluatedUrl) {
    lines.push(`- **Evaluated URL:** ${report.metadata.evaluatedUrl}`);
  }
  if (report.metadata.fetchTimestamp) {
    lines.push(`- **Fetch timestamp:** ${report.metadata.fetchTimestamp}`);
  }
  lines.push(`- **Generated at:** ${report.metadata.timestamp}`);
  lines.push(`- **DefaultAnswer Version:** ${DEFAULTANSWER_VERSION}`);
  lines.push(`- **Scoring Engine:** v1.1`);
  lines.push(`- **Prompt Pack:** ${PROMPT_PACK_VERSION}`);
  lines.push("");

  // Footer
  lines.push("---");
  lines.push(
    `*Generated by DefaultAnswer ${DEFAULTANSWER_VERSION} — LLM Recommendation Intelligence*`
  );

  return lines.join("\n");
}

function groupBreakdownByCategory(
  breakdown: Array<{ label: string; points: number; max: number; reason: string; category?: string }>
): [string, typeof breakdown][] {
  const groups: Record<string, typeof breakdown> = {};
  
  for (const item of breakdown) {
    const cat = item.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  
  // Order categories consistently
  const categoryOrder = [
    "Entity Clarity",
    "Structural Comprehension",
    "Answerability Signals",
    "Trust & Legitimacy",
    "Commercial Clarity",
    "Other",
    "Error",
  ];
  
  return categoryOrder
    .filter(cat => groups[cat])
    .map(cat => [cat, groups[cat]] as [string, typeof breakdown]);
}

function formatOutcome(outcome: LiveRecommendationCheck["outcome"]): string {
  switch (outcome) {
    case "default":
      return "Default Recommendation";
    case "top_alternative":
      return "Top Alternative";
    case "listed_option":
      return "Listed Option";
    default:
      return "Not Mentioned";
  }
}

