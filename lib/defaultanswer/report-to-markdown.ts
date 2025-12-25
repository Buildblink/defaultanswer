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
import type {
  ColdSummaryExistingSignals,
  ColdSummaryMode,
  ColdSummaryMultiRun,
  ColdSummaryResult,
} from "./cold-summary";
import { buildColdFixPlaybook, pickRepresentativeRun } from "./cold-summary";
import { computeScanDelta } from "@/lib/report/deltas";
import type { ReportV2, ReportV2Options } from "@/lib/report/report-v2";

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
  coldSummary?: ColdSummaryResult;
  coldSummaryMulti?: ColdSummaryMultiRun;
  coldSummaryByMode?: ColdSummaryByMode;
  existingSignals?: ColdSummaryExistingSignals;
  competitiveDelta?: Array<{
    query: string;
    competitorAdvantage: string;
    whyLose: string;
  }>;
  reportV2?: ReportV2;
  proHistory?: {
    isPro: boolean;
    access: boolean;
    message?: string;
    current?: {
      score: number;
      readiness: string;
      coverage_overall: number;
      has_faq: boolean;
      has_schema: boolean;
      has_pricing: boolean;
    };
    previous?: {
      score: number;
      readiness: string;
      coverage_overall: number;
      has_faq: boolean;
      has_schema: boolean;
      has_pricing: boolean;
    } | null;
    recent?: Array<{
      id?: string;
      created_at?: string;
      score: number;
      readiness: string;
      coverage_overall: number;
      has_faq: boolean;
      has_schema: boolean;
      has_pricing: boolean;
    }>;
  };
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

export type ColdSummaryModeStore = {
  singleRun?: ColdSummaryResult;
  multiRun?: ColdSummaryMultiRun;
};

export type ColdSummaryByMode = Partial<Record<ColdSummaryMode, ColdSummaryModeStore>>;

export function reportToMarkdown(report: ReportData): string {
  const lines: string[] = [];
  const reportV2Defaults: Required<ReportV2Options> = {
    maxBullets: 6,
    promptCountPerBucket: 3,
    includeSimulatedAiProof: true,
    includeCitationReadiness: true,
    includeImplementationExamples: true,
    includeQuoteReady: true,
  };

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

  // History (Pro)
  if (report.proHistory) {
    if (!report.proHistory.isPro) {
      lines.push("## Monitoring (Pro)");
      lines.push("Monitoring is locked. Unlock monitoring to save scan history.");
      lines.push("");
    } else {
      lines.push("## History (Pro)");
      if (report.proHistory.previous && report.proHistory.current) {
        const delta = computeScanDelta(report.proHistory.current, report.proHistory.previous);
        lines.push("### Since last scan");
        lines.push(`Score: ${delta.scoreDelta >= 0 ? "+" : ""}${delta.scoreDelta}`);
        lines.push(`Coverage: ${delta.coverageDelta >= 0 ? "+" : ""}${delta.coverageDelta}`);
        lines.push(
          `Changes: ${delta.chips.length ? delta.chips.map((c) => c.label).join(", ") : "none detected"}`
        );
      } else {
        lines.push(`- ${report.proHistory.message || "First scan saved."}`);
      }
      lines.push("");
    }
  }

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

  // Report V2 sections (after Fix this first, before Evidence/Diagnostics)
  if (report.reportV2) {
    const v2 = applyReportV2Options(report.reportV2, reportV2Defaults);

    // Right now
    lines.push("## Right now");
    lines.push("**You would be recommended for:**");
    if (v2.rightNow.recommended.length > 0) {
      v2.rightNow.recommended.forEach((prompt) => lines.push(`- ${prompt}`));
    } else {
      lines.push("- No prompts confidently recommend you yet.");
    }
    lines.push("**You would be skipped for:**");
    if (v2.rightNow.skipped.length > 0) {
      v2.rightNow.skipped.forEach((prompt) => lines.push(`- ${prompt}`));
    } else {
      lines.push("- No prompts confidently skip you yet.");
    }
    lines.push("**Why this happens:**");
    lines.push(v2.rightNow.reason);
    lines.push("");

    const modeStore = report.coldSummaryByMode;
    if (modeStore) {
      appendColdSummarySection(lines, "Cold AI (URL-only)", "url_only", modeStore.url_only, report.existingSignals);
      appendColdSummarySection(lines, "Cold AI (Snapshot)", "snapshot", modeStore.snapshot, report.existingSignals);
    } else if (report.coldSummaryMulti || report.coldSummary) {
      appendColdSummarySection(lines, "Cold AI (URL-only)", "url_only", {
        singleRun: report.coldSummary,
        multiRun: report.coldSummaryMulti,
      }, report.existingSignals);
    }

    // Share-ready summary
    lines.push("## Share-ready summary");
    lines.push(v2.sharePack.execSummary);
    lines.push("");
    lines.push(v2.sharePack.quotePack);
    lines.push("");
    lines.push(v2.sharePack.fixChecklist);
    lines.push("");

    // 1) What AI recommends instead of you (Simulated)
    if (v2.aiProof.length > 0) {
      lines.push("## What AI recommends instead of you (Simulated)");
      lines.push(
        "Simulated examples to illustrate observable behavior. For real model outputs, enable Live Proof in settings."
      );
      lines.push(
        "Model-free verdicts below approximate citation readiness without model calls."
      );
      lines.push("Live Proof: run in-app (not included in exported markdown).");
      v2.aiProof.forEach((proof) => {
        lines.push(`- **Model:** ${proof.modelLabel}`);
        lines.push(
          `  **Prompt:** ${proof.prompt} (${proof.verdict}, ${proof.confidence}% confidence)`
        );
        lines.push(`  **Simulated response:** ${proof.response}`);
        if (proof.recommended.length > 0) {
          lines.push(`  **Recommended archetypes:** ${proof.recommended.join("; ")}`);
        }
        if (proof.skipReason) {
          lines.push(`  **Mention:** Not mentioned (${proof.skipReason})`);
        } else {
          lines.push("  **Mention:** Mentioned as a viable option");
        }
        lines.push(`  **So what:** ${proof.soWhat}`);
        lines.push(`  **Primary blocker:** ${proof.primaryBlocker}`);
      });
      lines.push("");
    }

    // 2) How AI reasoned through this decision
    if (v2.reasoning.steps.length > 0) {
      lines.push("## How AI reasoned through this decision");
      lines.push("**Reasoning steps:**");
      v2.reasoning.steps.forEach((step, idx) => {
        lines.push(`  ${idx + 1}. ${step}`);
      });
      lines.push("**Confidence breaks down because:**");
      v2.reasoning.confidenceBreakdown.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }

    // 3) Retrieve vs infer
    lines.push("## What AI can retrieve vs what it has to guess");
    lines.push(v2.retrieveVsInfer.explanation);
    if (v2.retrieveVsInfer.retrievable.length > 0) {
      lines.push("**Retrievable:**");
      v2.retrieveVsInfer.retrievable.forEach((item) => lines.push(`- ${item}`));
    }
    if (v2.retrieveVsInfer.inferred.length > 0) {
      lines.push("**Inferred:**");
      v2.retrieveVsInfer.inferred.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("");

    // 4) Evidence coverage
    lines.push("## Evidence coverage (how much AI can actually use)");
    lines.push(`- **Overall coverage:** ${v2.coverage.overall}/100`);
    lines.push(`- **Structure coverage:** ${v2.coverage.structure}/100`);
    lines.push(`- **Answer coverage:** ${v2.coverage.answer}/100`);
    lines.push(`- **Entity coverage:** ${v2.coverage.entity}/100`);
    lines.push(`- **Commercial coverage:** ${v2.coverage.commercial}/100`);
    lines.push(`- **Next move:** ${v2.coverage.nextMove}`);
    lines.push("");

    // 5) Competitive positioning snapshot
    lines.push("## Competitive positioning snapshot");
    v2.competitiveSnapshot.rows.forEach((row) => {
      lines.push(
        `- **${row.label}:** Answer clarity ${row.answerClarity}, Commercial clarity ${row.commercialClarity}, Justification ease ${row.justificationEase}. ${row.note}`
      );
    });
    lines.push("");

    // 6) Prompt radar
    lines.push("## Questions you can win, and where you're blocked");
    lines.push("**Winnable now:**");
    v2.promptRadar.winnableNow.forEach((item) => {
      lines.push(`- ${item.prompt} — ${item.reason}`);
    });
    lines.push("**One fix away:**");
    v2.promptRadar.oneFixAway.forEach((item) => {
      lines.push(`- ${item.prompt} — ${item.reason}`);
    });
    lines.push("**Blocked:**");
    v2.promptRadar.blocked.forEach((item) => {
      lines.push(`- ${item.prompt} — ${item.reason}`);
    });
    lines.push("");

    // 7) Implementation examples
    lines.push('## What "good" looks like (copy/paste examples)');
    lines.push("**FAQ examples:**");
    v2.implementationExamples.faqs.forEach((faq) => {
      lines.push(`- Q: ${faq.q}`);
      lines.push(`  A: ${faq.a}`);
    });
    lines.push("**Schema snippet:**");
    lines.push("```json");
    lines.push(JSON.stringify(v2.implementationExamples.schemaSnippetJson, null, 2));
    lines.push("```");
    lines.push("**Pricing clarity:**");
    lines.push(`- Before: ${v2.implementationExamples.pricingClarity.before}`);
    lines.push(`- After: ${v2.implementationExamples.pricingClarity.after}`);
    lines.push("");

    // 8) Quote-ready copy
    if (v2.quoteReady.length > 0) {
      lines.push("## Quote-ready copy you can paste today");
      v2.quoteReady.forEach((item) => {
        lines.push(`- **${item.label}**`);
        lines.push(`  **Copy:** ${item.copy}`);
        lines.push(`  **Placement:** ${item.placement}`);
        lines.push(`  **Why:** ${item.why}`);
      });
      lines.push("");
    }

    // 9) Citation readiness
    lines.push("## Citation readiness");
    lines.push("**Citable sentences:**");
    v2.citationReadiness.citableSentences.forEach((sentence) => {
      lines.push(`- ${sentence}`);
    });
    lines.push("**Why these are citable:**");
    v2.citationReadiness.whyCitable.forEach((item) => lines.push(`- ${item}`));
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

function appendColdSummarySection(
  lines: string[],
  title: string,
  mode: ColdSummaryMode,
  data?: ColdSummaryModeStore,
  existingSignals?: ColdSummaryExistingSignals
) {
  if (!data || (!data.singleRun && !data.multiRun)) return;
  const multi = data.multiRun;
  const single = data.singleRun;
  const useMulti = multi
    ? !single || new Date(multi.createdAt).getTime() >= new Date(single.createdAt).getTime()
    : false;
  const representative = useMulti && multi ? pickRepresentativeRun(multi.results, multi.aggregate) : null;
  const output = representative?.rawText || single?.rawOutput || single?.response || "";
  const analysis = representative?.analysis || single?.analysis;
  const verdictLabel = analysis?.verdictLabel || "Unclear";
  const clarityScore = typeof analysis?.clarityScore === "number" ? analysis?.clarityScore : 1;

  lines.push(`## ${title}`);
  if (useMulti && multi) {
    lines.push(`- **Prompt version:** ${multi.promptVersion}`);
    lines.push(`- **Model:** ${multi.model}`);
    lines.push(`- **Consistency:** ${multi.aggregate.consistencyLabel}`);
    lines.push(
      `- **Verdict distribution:** clear=${multi.aggregate.verdictCounts.clear}, partial=${multi.aggregate.verdictCounts.partial}, unclear=${multi.aggregate.verdictCounts.unclear}, refusal=${multi.aggregate.verdictCounts.refusal}`
    );
    lines.push(`- **Refusals:** ${multi.aggregate.refusalsCount}`);
    lines.push(`- **Clarity avg:** ${multi.aggregate.clarityAvg}/5`);
    lines.push(`- **Unknown avg:** ${multi.aggregate.unknownAvg}`);
  } else if (single) {
    lines.push(`- **Prompt version:** ${single.promptVersion}`);
    lines.push(`- **Model:** ${single.model}`);
  }

  lines.push(`- **Verdict:** ${verdictLabel}`);
  lines.push(`- **Clarity score:** ${clarityScore}/5`);
  if (analysis?.failureMode === "refusal") {
    lines.push("- **Failure mode:** refusal / no retrieval");
  } else if (analysis?.failureMode === "no_retrieval_url_only") {
    lines.push("- **Failure mode:** no retrieval (URL-only)");
  }
  lines.push("- **Signals:**");
  lines.push(`  - Explicit category: ${analysis?.hasCategory ? "detected" : "missing"}`);
  lines.push(`  - Audience clarity: ${analysis?.hasAudience ? "detected" : "missing"}`);
  lines.push(`  - Offering detected: ${analysis?.hasOffering ? "detected" : "missing"}`);
  lines.push(`  - Hedging language: ${analysis?.hasHedging ? "detected" : "missing"}`);
  lines.push("");
  lines.push(
    "Why this matters: AI assistants prefer sources they can confidently summarize in one pass. If a model cannot infer your category and offering cold, it is unlikely to recommend or cite you."
  );
  lines.push("");
  if (analysis) {
    const playbook = buildColdFixPlaybook(analysis, { mode, existingSignals });
    const recommended = playbook.filter((item) => item.status === "recommend");
    const alreadyPresent = playbook.filter((item) => item.status === "already_present");
    if (recommended.length > 0) {
      lines.push("**Cold Playbook (Recommended)**");
      recommended.forEach((item) => {
        lines.push(`- ${item.title}: ${item.example}`);
      });
      lines.push("");
    }
    if (alreadyPresent.length > 0) {
      lines.push("**Already present**");
      alreadyPresent.forEach((item) => lines.push(`- ${item.title}`));
      lines.push("");
    }
  }
  lines.push("**Verbatim response:**");
  lines.push("```");
  lines.push(output);
  lines.push("```");
  lines.push("");
}

function applyReportV2Options(
  report: ReportV2,
  options: Required<ReportV2Options>
): ReportV2 {
  const aiProof = options.includeSimulatedAiProof ? report.aiProof : [];
  const implementationExamples = options.includeImplementationExamples
    ? report.implementationExamples
    : { faqs: [], schemaSnippetJson: {}, pricingClarity: { before: "", after: "" } };
  const quoteReady = options.includeQuoteReady ? report.quoteReady : [];
  const citationReadiness = options.includeCitationReadiness
    ? report.citationReadiness
    : { citableSentences: [], whyCitable: [] };

  return {
    ...report,
    aiProof,
    reasoning: {
      steps: report.reasoning.steps.slice(0, 5),
      confidenceBreakdown: report.reasoning.confidenceBreakdown.slice(0, 2),
    },
    retrieveVsInfer: {
      ...report.retrieveVsInfer,
      retrievable: report.retrieveVsInfer.retrievable.slice(0, options.maxBullets),
      inferred: report.retrieveVsInfer.inferred.slice(0, options.maxBullets),
    },
    promptRadar: {
      winnableNow: report.promptRadar.winnableNow.slice(0, options.promptCountPerBucket),
      oneFixAway: report.promptRadar.oneFixAway.slice(0, options.promptCountPerBucket),
      blocked: report.promptRadar.blocked.slice(0, options.promptCountPerBucket),
    },
    implementationExamples,
    quoteReady,
    coverage: report.coverage,
    rightNow: {
      recommended: report.rightNow.recommended.slice(0, 2),
      skipped: report.rightNow.skipped.slice(0, 2),
      reason: report.rightNow.reason,
    },
    sharePack: report.sharePack,
    citationReadiness: {
      citableSentences: citationReadiness.citableSentences.slice(0, 2),
      whyCitable: citationReadiness.whyCitable.slice(0, 3),
    },
  };
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

