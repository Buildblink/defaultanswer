import Link from "next/link";
import { getPromptPack, PROMPT_PACK_VERSION } from "@/lib/defaultanswer/prompt-pack";
import { CopyButton } from "./copy-button";
import { CopyMarkdownButton } from "./copy-markdown-button";
import { CopyDebugJsonButton } from "./copy-debug-json-button";
import { HowToUseThisReport } from "./how-to-use";
import { ReportClientTools } from "./report-client-tools";
import { BeliefHistory } from "./belief-history";
import type {
  AnalysisResult,
  AnalysisStatus,
  BreakdownItem,
  FixPlanItem,
  SnapshotQuality,
} from "@/lib/defaultanswer/scoring";
import type { ReportData } from "@/lib/defaultanswer/report-to-markdown";
import { DEFAULTANSWER_VERSION } from "@/lib/defaultanswer/version";
import { decideWhatToFixFirst } from "@/lib/defaultanswer/recommendations";
import type { ReadinessState } from "@/lib/defaultanswer/belief-state";
import { dedupeFixPlanByIntent } from "@/lib/defaultanswer/recommendations";
import {
  beliefPrimaryUncertainty,
  beliefSupportingSignals,
  beliefSummaryText,
  buildCompetitiveDeltaBullets,
  compactSentence,
  generateConfidenceDebateBullets,
  getAnalysisStatus,
  getReadinessClassification,
  groupByCategory,
  safeHostname,
  uniq,
  biggestGapCategoryFromBreakdown,
} from "@/lib/report/report-helpers";
import { SimulationPanel } from "./simulation-panel";
import { LiveRecommendationCheck } from "./live-recommendation-check";
import { diffScans, fetchLatestScans, isHistoryConfigured, type ScanDiff } from "@/lib/defaultanswer/history";
import type { FetchDiagnostics } from "@/lib/defaultanswer/scoring";
import { ExportButtons } from "./export-buttons";
import type { ExampleReportContext, ExampleReportData } from "@/app/reports/example-report-context";
import { ReportRenderer, ReportV2Sections } from "@/components/report/ReportRenderer";
import { Card } from "@/app/(landing)/ui/Card";
import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { buildReportV2 } from "@/lib/report/report-v2";
import { resolveLiveProofCategory } from "@/lib/report/liveproof-prompts";
import {
  fetchLastScan,
  fetchRecentScans,
  insertScanSummary,
  normalizeUrl,
  type ReportScanSummary,
} from "@/lib/report/history";
import { getEntitlements } from "@/lib/auth/entitlements";
import { ReportShell } from "@/components/report/ReportShell";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { ExpandCollapseAll } from "@/components/report/ExpandCollapseAll";

type Props = {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ url?: string; data?: string }>;
  exampleContext?: ExampleReportContext;
  exampleReport?: ExampleReportData;
};

// Placeholder data for fallback
const PLACEHOLDER_ANALYSIS: AnalysisResult = {
  score: -1,
  breakdown: [],
  weaknesses: [
    "Unable to analyze — submit a URL to get real scoring.",
  ],
  fixPlan: [],
  analysisStatus: "error",
  extracted: {
    title: undefined,
    metaDescription: undefined,
    h1s: [],
    h2s: [],
    h3s: [],
    visibleTextExcerpt: undefined,
    hasFAQ: false,
    hasIndirectFAQ: false,
    hasDirectAnswerBlock: false,
    hasSchema: false,
    hasSchemaJsonLd: false,
    schemaTypes: [],
    hasPricing: false,
    hasAbout: false,
    hasContact: false,
    hasContactSignals: false,
    contactEvidence: [],
    domain: "",
    brandGuess: "",
    canonicalUrl: undefined,
    evaluatedPage: "Homepage HTML snapshot",
    evaluatedUrl: "",
    fetchedAt: "",
    evidence: undefined,
  },
  reasoning: [],
  snapshotQuality: undefined,
  fetchDiagnostics: undefined,
};

export default async function ReportPage({ params, searchParams, exampleContext, exampleReport }: Props) {
  const isExampleReport = Boolean(exampleContext?.isExample);
  const { isPro } = await getEntitlements();
  const userId: string | null = null;
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY);
  const { reportId } = await params;
  const { url = "", data: encodedData } = await searchParams;

  // Decode analysis data if present
  let analysis: AnalysisResult = PLACEHOLDER_ANALYSIS;
  let isAnalysisMissing = true;

  if (encodedData) {
    try {
      const decoded = decodeURIComponent(atob(encodedData));
      analysis = JSON.parse(decoded) as AnalysisResult;
      isAnalysisMissing = false;
    } catch {
      console.log("[report] Failed to decode analysis data");
    }
  }
  const isAnalysisReady = !isAnalysisMissing;

  const ex = analysis.extracted;
  const evaluatedUrl = ex.evaluatedUrl || "";
  const displayDomain = ex.domain || (evaluatedUrl ? safeHostname(evaluatedUrl) : "");
  const displayBrand = ex.brandGuess || displayDomain || "your site";
  const coldSummarySnapshot = {
    title: ex.title,
    metaDescription: ex.metaDescription,
    h1: ex.h1s?.[0],
    excerpt: ex.visibleTextExcerpt,
  };
  const titleBreakdown = analysis.breakdown.find((item) => item.label === "Title includes brand/entity");
  const h1Breakdown = analysis.breakdown.find((item) => item.label === "H1 describes product/category");
  const hasEntityClarity =
    Boolean(titleBreakdown && titleBreakdown.points >= 7 && h1Breakdown && h1Breakdown.points >= 7) ||
    Boolean(ex.title && ex.h1s.length > 0);
  const existingSignals = {
    hasFaq: Boolean(ex.hasFAQ),
    hasSchema: Boolean(ex.hasSchemaJsonLd || ex.hasSchema || (ex.schemaTypes || []).length > 0),
    hasPricing: Boolean(ex.hasPricing),
    hasAbout: Boolean(ex.hasAbout),
    hasContact: Boolean(ex.hasContactSignals),
    hasEntityClarity,
    visibleTextExcerptPresent: Boolean(ex.visibleTextExcerpt && ex.visibleTextExcerpt.trim()),
  };

  // Get prompt pack for this brand
  const prompts = getPromptPack({ brand: displayBrand, domain: displayDomain, category: "solution" });

  // Determine score label and status
  const scoreLabel = getScoreLabel(analysis.score);
  const generatedAt = exampleReport?.metadata.generatedAt || new Date().toISOString();
  const analysisStatus = getAnalysisStatus(analysis);
  const hasAnalysis = !isAnalysisMissing;
  const isRealAnalysis = hasAnalysis;

  // Compute readiness for markdown export
  const readiness = getReadinessClassification(
    analysis,
    hasAnalysis,
    analysisStatus
  );
  const readinessExplanation = exampleReport?.summary.verdict || readiness.explanation;
  const promptPackVersion = exampleReport?.metadata.promptPack || PROMPT_PACK_VERSION;
  const defaultAnswerVersion = exampleReport?.metadata.defaultAnswerVersion || DEFAULTANSWER_VERSION;
  const fetchStatus = analysis.fetchDiagnostics?.status;
  const isAccessRestricted =
    analysis.snapshotQuality === "access_restricted" ||
    fetchStatus === 401 ||
    fetchStatus === 403 ||
    fetchStatus === 429;

  const primaryUncertainty = beliefPrimaryUncertainty(analysis, analysisStatus);
  const supportingSignals = beliefSupportingSignals(analysis);
  const competitiveDelta =
    analysisStatus === "ok"
      ? buildCompetitiveDeltaBullets(analysis, displayBrand || displayDomain || "")
      : [];

  let historyDiff: ScanDiff | null = null;
  let historyMessage: string | null = null;
  if (!isExampleReport && isHistoryConfigured() && url) {
    try {
      const latestRes = await fetchLatestScans(url);
      if (latestRes.ok && latestRes.latest) {
        if (latestRes.previous) {
          historyDiff = diffScans(latestRes.previous as any, latestRes.latest as any);
        } else {
          historyMessage = "This is your first scan.";
        }
      }
    } catch (err) {
      historyMessage = "History unavailable.";
      console.warn("[report history] failed", err);
    }
  }

  const whatToFixDecision = decideWhatToFixFirst({
    fixPlan: dedupeFixPlanByIntent(analysis.fixPlan || []),
    score: analysis.score,
    readinessLabel: readiness.label,
    extracted: {
      hasFAQ: analysis.extracted.hasFAQ,
      hasSchema: analysis.extracted.hasSchema,
      hasSchemaJsonLd: analysis.extracted.hasSchemaJsonLd,
      hasIndirectFAQ: analysis.extracted.hasIndirectFAQ,
      hasDirectAnswerBlock: analysis.extracted.hasDirectAnswerBlock,
      hasAbout: analysis.extracted.hasAbout,
      hasContactSignals: analysis.extracted.hasContactSignals,
      h2s: analysis.extracted.h2s,
      h3s: analysis.extracted.h3s,
    },
  });
  const isRetrievalOptimization = (whatToFixDecision as { retrievalOptimization?: boolean }).retrievalOptimization === true;

  const dominantFixItem =
    whatToFixDecision.kind === "noCriticalFixes"
      ? null
      : selectDominantFixItem({
          fixPlan: dedupeFixPlanByIntent(analysis.fixPlan || []),
          breakdown: analysis.breakdown || [],
          reasoning: analysis.reasoning || [],
        });

  const topFixGuidance = dominantFixItem
    ? getActionGuidance(dominantFixItem.action, displayBrand)
    : null;
  const topFix =
    dominantFixItem && topFixGuidance
      ? {
          action: dominantFixItem.action,
          why: topFixGuidance.why,
          steps: topFixGuidance.steps,
        }
      : undefined;
  const oneChangeTitle = isRetrievalOptimization
    ? "The one change that would most increase my citation frequency"
    : "The one change that would most increase my confidence";

  // Prepare report data for markdown export
  const reportData: ReportData = {
    url,
    score: analysis.score,
    readiness: {
      label: readiness.label,
      explanation: readinessExplanation,
    },
    summaryNote:
      whatToFixDecision.kind === "noCriticalFixes"
        ? "No critical fixes detected — remaining improvements are marginal."
        : undefined,
    breakdown: analysis.breakdown,
    reasoning: analysis.reasoning,
    fixPlan: dedupeFixPlanByIntent(analysis.fixPlan || []),
    topFix,
    competitiveDelta,
    snapshotQuality: analysis.snapshotQuality,
    fetchDiagnostics: analysis.fetchDiagnostics,
    historyDiff: historyDiff
      ? {
          scoreDelta: historyDiff.scoreDelta,
          readinessChanged: historyDiff.readinessChanged,
          signalChanges: {
            gained: historyDiff.signalChanges.gained,
            lost: historyDiff.signalChanges.lost,
          },
          breakdownChanges: historyDiff.breakdownChanges.map((b) => ({
            label: b.label,
            category: b.category,
            delta: b.delta,
          })),
        }
      : undefined,
    evidence: analysis.extracted.evidence
      ? {
          titleText: analysis.extracted.evidence.titleText,
          h1Text: analysis.extracted.evidence.h1Text,
          h2Texts: analysis.extracted.evidence.h2Texts,
          schemaTypes: analysis.extracted.evidence.schemaTypes,
          contactEvidence: analysis.extracted.evidence.contactEvidence,
          faqEvidence: analysis.extracted.evidence.faqEvidence
            ? {
                explicitFaqDetected: analysis.extracted.evidence.faqEvidence.explicitFaqDetected,
                indirectFaqLinks: analysis.extracted.evidence.faqEvidence.indirectFaqLinks || [],
                directAnswerSnippets: analysis.extracted.evidence.faqEvidence.directAnswerSnippets || [],
              }
            : undefined,
        }
      : undefined,
    metadata: {
      reportId,
      domain: displayDomain,
      brand: displayBrand,
      timestamp: generatedAt,
      version: defaultAnswerVersion,
      pageEvaluated: analysis.extracted.evaluatedPage || "Homepage HTML snapshot",
      evaluatedUrl: analysis.extracted.evaluatedUrl || url,
      canonicalUrl: analysis.extracted.canonicalUrl,
      fetchTimestamp: analysis.extracted.fetchedAt,
    },
    proHistory: {
      isPro,
      access: isPro,
      current: undefined,
      previous: null,
      recent: [],
      message: isPro ? "First scan saved." : "History is not saved yet.",
    },
    existingSignals,
  };

  const reportV2Snapshot = buildReportV2(analysis, {
    maxBullets: 6,
    promptCountPerBucket: 3,
    includeSimulatedAiProof: true,
    includeCitationReadiness: true,
    includeImplementationExamples: true,
    includeQuoteReady: true,
  });
  const liveProofCategory = resolveLiveProofCategory(analysis);
  const baseCategory =
    liveProofCategory.label?.trim() || "AI recommendation audit tool";
  let defaultLiveProofCategory = `${baseCategory} software`;
  if (!analysis.extracted.hasPricing) {
    defaultLiveProofCategory = `pricing for ${baseCategory} tools`;
  } else if (!analysis.extracted.hasFAQ) {
    defaultLiveProofCategory = `best ${baseCategory} software`;
  } else {
    defaultLiveProofCategory = `best ${baseCategory} tools`;
  }

  const normalizedUrl = normalizeUrl(evaluatedUrl || url);
  const currentScan: ReportScanSummary = {
    user_id: userId,
    normalized_url: normalizedUrl,
    report_id: reportId,
    score: analysis.score,
    readiness: readiness.label,
    coverage_overall: reportV2Snapshot.coverage.overall,
    has_faq: analysis.extracted.hasFAQ,
    has_schema: analysis.extracted.hasSchemaJsonLd || analysis.extracted.hasSchema,
    has_pricing: analysis.extracted.hasPricing,
    primary_blocker:
      reportV2Snapshot.aiProof[0]?.primaryBlocker || reportV2Snapshot.coverage.nextMove,
  };

  let previousScan: ReportScanSummary | null = null;
  let recentScans: ReportScanSummary[] = [];
  let proHistoryMessage = reportData.proHistory?.message || null;
  if (isPro && normalizedUrl) {
    previousScan = await fetchLastScan(normalizedUrl, userId);
    recentScans = await fetchRecentScans(normalizedUrl, userId, 10);
    await insertScanSummary({
      userId,
      normalizedUrl,
      reportId,
      score: currentScan.score,
      readiness: currentScan.readiness,
      coverageOverall: currentScan.coverage_overall,
      hasFaq: currentScan.has_faq,
      hasSchema: currentScan.has_schema,
      hasPricing: currentScan.has_pricing,
      primaryBlocker: currentScan.primary_blocker,
    });
    proHistoryMessage = previousScan ? null : "First scan saved.";
  }

  reportData.proHistory = {
    isPro,
    access: Boolean(isPro && userId),
    current: currentScan,
    previous: previousScan,
    recent: recentScans,
    message: proHistoryMessage || undefined,
  };

  return (
    <ReportRenderer
      reportData={reportData}
      analysis={analysis}
      entitlements={{ isPro }}
      contextFlags={{ isExample: isExampleReport }}
    >
      {({ reportV2 }) => {
        const reportSummary = reportV2 || reportV2Snapshot;
        const primaryBlockerSummary =
          reportSummary?.aiProof?.[0]?.primaryBlocker ||
          reportSummary?.coverage?.nextMove ||
          "Primary blocker unavailable";
        const blockerKey = resolveBlockerKey(primaryBlockerSummary, analysis);
        const primaryBlockerLabel = BLOCKER_LABELS[blockerKey];
        const verdictSentence = buildVerdictSentence(blockerKey, readiness.label);
        const doNext = buildDoNextAction(blockerKey, displayBrand);
        const navItems = isAnalysisReady
          ? [
              { id: "overview", label: "Overview", visible: true },
              { id: "do-next", label: "Do this next", visible: true },
              { id: "visibility-gaps", label: "Why monitoring tools show low visibility", visible: Boolean(reportV2) },
              { id: "score-breakdown", label: "Score breakdown", visible: analysis.breakdown.length > 0 },
              { id: "evidence", label: "Evidence", visible: true },
              { id: "metadata", label: "Metadata", visible: true },
              { id: "history", label: "History", visible: !isExampleReport && isHistoryConfigured() },
            ]
          : [{ id: "overview", label: "Overview", visible: true }];
        const navGroups = isAnalysisReady
          ? [
              {
                label: "Core report",
                items: navItems.filter((item) =>
                  ["overview", "do-next", "visibility-gaps", "score-breakdown", "evidence", "metadata"].includes(item.id)
                ),
              },
              {
                label: "History (optional)",
                items: navItems.filter((item) =>
                  ["history"].includes(item.id)
                ),
              },
            ]
          : [{ label: "Start here", items: navItems }];
        return (
          <ReportShell
            summary={{
              domain: {
                label: "Evaluated domain",
                value: displayDomain || "Unknown Domain",
                title: displayDomain || "Unknown Domain",
              },
              score: {
                label: scoreLabel,
                value: analysis.score >= 0 ? `${analysis.score}/100` : "Pending",
              },
              readiness: {
                label: "Readiness",
                value: readiness.label,
              },
              blocker: {
                label: "Primary blocker",
                value: isAnalysisReady ? primaryBlockerLabel : "Analysis pending",
                title: isAnalysisReady ? primaryBlockerLabel : "Analysis pending",
              },
            }}
            actions={
              <>
                {isAnalysisReady ? (
                  <>
                    <a
                      href="#do-next"
                      className="inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
                      title={doNext.description}
                    >
                      Next action: {doNext.ctaLabel}
                    </a>
                    <ExportButtons reportData={reportData} />
                    <CopyMarkdownButton reportData={reportData} reportId={reportId} compact />
                    {!isExampleReport ? (
                      <ReportClientTools reportId={reportId} url={url} encodedData={encodedData} className="mt-0" />
                    ) : null}
                  </>
                ) : (
                  <a
                    href="/defaultanswer"
                    className="inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
                  >
                    Run analysis
                  </a>
                )}
              </>
            }
            navItems={navItems}
            navGroups={navGroups}
          >
            <div>
              <section id="overview" className="mb-8 scroll-mt-28">
                <Card>
                  {isExampleReport && exampleContext ? (
                    <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
                      <p className="font-semibold text-stone-900 dark:text-stone-100">
                        {exampleContext.disclosureTitle}
                      </p>
                      <p className="mt-1 text-stone-600 dark:text-stone-400">
                        {exampleContext.disclosureText}
                      </p>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="mt-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        DefaultAnswer Report
                      </p>
                      <h1 className="text-3xl font-bold tracking-tight">
                        DefaultAnswer Report: {displayDomain || "Unknown Domain"}
                      </h1>
                      <p className="text-base leading-relaxed text-stone-600 dark:text-stone-300">
                        AI Recommendation Analysis for{" "}
                        <code className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-sm">
                          {url || "N/A"}
                        </code>
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <Link
                        href="/defaultanswer"
                        className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
                      >
                        Back to DefaultAnswer
                      </Link>
                    </div>
                  </div>

                  {isAnalysisReady ? (
                    <>
                      <div className="mt-6 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-950">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Default Answer Score
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
                            {analysis.score >= 0 ? `${analysis.score}/100` : "Pending"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-950">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Status
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
                            {readiness.label}
                          </div>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-950">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Primary blocker
                          </div>
                          <div className="mt-2 text-lg font-semibold text-stone-900 dark:text-stone-100">
                            {primaryBlockerLabel}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-base font-semibold text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
                        {verdictSentence}
                      </div>
                      <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
                        This does not measure SEO or traffic - only whether AI would recommend you.
                      </p>

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        {!isExampleReport ? (
                          <CopyDebugJsonButton reportId={reportId} url={url} analysis={analysis} />
                        ) : null}
                      </div>

                      {!isExampleReport ? <HowToUseThisReport /> : null}
                    </>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 dark:border-stone-800 dark:bg-stone-900">
                      <div className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                        Analysis isn't ready yet.
                      </div>
                      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                        Run analysis to generate your report.
                      </p>
                      <div className="mt-4">
                        <Link
                          href="/defaultanswer"
                          className="inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
                        >
                          Run analysis
                        </Link>
                      </div>
                    </div>
                  )}
                </Card>
              </section>

        {isAnalysisReady ? (
        <>
        <section id="do-next" className="mb-10 scroll-mt-28">
          <Card>
            <SectionTitle title="Do this next (15-30 minutes)" />
            <div className="mt-4 space-y-4 text-stone-700 dark:text-stone-300">
              <div>
                <div className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  {doNext.action}
                </div>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                  {doNext.why}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Snippet
                  </div>
                  <CopyButton text={doNext.snippet} />
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-xs text-stone-800 dark:bg-stone-950 dark:text-stone-200">
{doNext.snippet}
                </pre>
              </div>
            </div>
          </Card>
        </section>

        <ReportRightNowSection reportV2={reportV2} />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Why this is true (optional)
          </div>
          <ExpandCollapseAll targetId="report-disclosure" />
        </div>
        </>
        ) : null}
        <div id="report-disclosure" className="space-y-6">

        <CollapsibleSection title="My current belief about your site">
          <Card>
            <div className="flex flex-col gap-3">
              <ReadinessClassification
                analysis={analysis}
                hasAnalysis={hasAnalysis}
                explanationOverride={readinessExplanation}
                status={analysisStatus}
              />

              <p className="text-stone-800 dark:text-stone-200 leading-relaxed">
                {beliefSummaryText({
                  brand: displayBrand || displayDomain || "your site",
                  readinessLabel: readiness.label,
                  confidenceScore: analysis.score,
                  supporting: supportingSignals.slice(0, 2),
                  primaryUncertainty,
                  status: analysisStatus,
                })}
              </p>

              <p className="text-sm text-stone-600 dark:text-stone-400">
                This does not measure SEO or traffic - only whether AI would recommend you.
              </p>
            </div>
          </Card>
        </CollapsibleSection>

        {!isExampleReport && (
          <CollapsibleSection title="Belief history">
            <BeliefHistory
              domain={displayDomain || "unknown"}
              reportId={reportId}
              timestamp={generatedAt}
              readiness_state={readiness.label as ReadinessState}
              confidence_score={analysis.score}
              blocking_factors={beliefBlockingFactors(analysis, analysisStatus)}
              supporting_signals={supportingSignals}
              primary_uncertainty={primaryUncertainty}
            />
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Why I'm not confident recommending you yet">
          <ul className="list-disc list-inside space-y-2 text-stone-700 dark:text-stone-300">
            {generateConfidenceDebateBullets(analysis, displayBrand, analysisStatus).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="mt-4 text-stone-700 dark:text-stone-300">
            To recommend you without hesitation, I need direct answers that I can retrieve, not infer.
          </p>
        </CollapsibleSection>

        <ReportV2Sections reportV2={reportV2} />

        {/* Competitive Delta */}
        {analysisStatus === "ok" && competitiveDelta.length >= 2 && (
          <CollapsibleSection
            title="Where AI Might Recommend Alternatives Instead"
            subtitle="Based on gaps in this snapshot, here is where competitors gain citation preference."
          >
            <ul className="mt-4 space-y-3">
              {competitiveDelta.map((b, idx) => (
                <li key={idx}>
                  <Card>
                  <p className="text-stone-800 dark:text-stone-200">
                    <span className="font-semibold">When users ask:</span> “{b.query}”
                  </p>
                  <p className="text-stone-700 dark:text-stone-300 mt-1">
                    <span className="font-semibold">AI is more likely to cite sites that:</span> {b.competitorAdvantage}
                  </p>
                  <p className="text-stone-700 dark:text-stone-300 mt-1">
                    <span className="font-semibold">Why you lose here:</span> {b.whyLose}
                  </p>
                  </Card>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Section: How AI Interprets Your Brand (V1.2 renamed in V1.3) */}
        {isRealAnalysis && analysis.reasoning && analysis.reasoning.length > 0 && (
          <CollapsibleSection
            title="How AI Interprets Your Brand"
            subtitle={`Based on detected signals, here's how an LLM interprets ${displayBrand}'s page:`}
          >
            <div className="space-y-4">
              {analysis.reasoning.map((bullet, idx) => (
                <Card key={idx}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      bullet.impact === "positive"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : bullet.impact === "negative"
                        ? "text-red-700 dark:text-red-300"
                        : "text-stone-600 dark:text-stone-400"
                    }`}>
                      {bullet.signal}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      bullet.impact === "positive"
                        ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200"
                        : bullet.impact === "negative"
                        ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                    }`}>
                      {bullet.impact === "positive" ? "Strength" : bullet.impact === "negative" ? "Weakness" : "Neutral"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300 italic">
                    "{bullet.interpretation}"
                  </p>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-stone-600 dark:text-stone-400 text-sm">
              These interpretations directly influence whether AI selects your brand as a default answer.
            </p>
          </CollapsibleSection>
        )}

        {/* Section: History Diff */}
        {!isExampleReport && isHistoryConfigured() && (
          <CollapsibleSection id="history" title="What changed since last scan">
            <div className="mt-4">
              <Card>
                {historyDiff ? (
                  <div className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
                    <p>Score change: {historyDiff.scoreDelta >= 0 ? "+" : ""}{historyDiff.scoreDelta}</p>
                    {historyDiff.readinessChanged && <p>Readiness changed.</p>}
                    {(historyDiff.signalChanges.gained.length > 0 || historyDiff.signalChanges.lost.length > 0) && (
                      <div>
                        {historyDiff.signalChanges.gained.length > 0 && <p>Gained: {historyDiff.signalChanges.gained.join(", ")}</p>}
                        {historyDiff.signalChanges.lost.length > 0 && <p>Lost: {historyDiff.signalChanges.lost.join(", ")}</p>}
                      </div>
                    )}
                    {historyDiff.breakdownChanges.length > 0 && (
                      <div>
                        Top movers:
                        <ul className="list-disc list-inside">
                          {historyDiff.breakdownChanges.map((b, idx) => (
                            <li key={idx}>{b.category}: {b.label} ({b.delta >= 0 ? "+" : ""}{b.delta})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone-600 dark:text-stone-400">{historyMessage || "This is your first scan."}</p>
                )}
                <div className="mt-3">
                  <Link href={`/defaultanswer/history?url=${encodeURIComponent(url)}`} className="text-amber-700 dark:text-amber-300 text-sm underline">
                    View scan history
                  </Link>
                </div>
              </Card>
            </div>
          </CollapsibleSection>
        )}

        {/* Section: Score Breakdown */}
        {analysis.breakdown.length > 0 && (
          <CollapsibleSection
            id="score-breakdown"
            title="Score Breakdown"
            subtitle={`Your score is calculated from ${analysis.breakdown.length} signals that influence LLM recommendations:`}
          >
            <div className="space-y-4">
              {groupByCategory(analysis.breakdown).map(([category, items]) => (
                <Card key={category}>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                    <span>
                      {category} ({items.reduce((sum, i) => sum + i.points, 0)}/{items.reduce((sum, i) => sum + i.max, 0)} pts)
                    </span>
                  </div>
                  <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
                    {items.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={item.points === item.max ? "text-emerald-600" : item.points > 0 ? "text-amber-600" : "text-red-500"}>
                              {item.points === item.max ? "✓" : item.points > 0 ? "△" : "✗"}
                            </span>
                            <span className="font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
                          </div>
                          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                            {item.reason}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`font-mono text-sm ${item.points === item.max ? "text-emerald-600" : item.points > 0 ? "text-amber-600" : "text-red-500"}`}>
                            {item.points}/{item.max}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {category === "Error" && isAccessRestricted && (
                    <div className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                      Many modern websites intentionally restrict automated access. While this can be appropriate for security, it reduces the likelihood of being recommended by AI systems that rely on verifiable, retrievable sources.
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Evidence (What I saw) */}
        <CollapsibleSection id="evidence" title="Evidence (What I saw)">
          {analysisStatus === "blocked" ? (
            <div className="mt-4">
              <Card>
                <p className="text-stone-600 dark:text-stone-400">No evidence available (fetch blocked).</p>
              </Card>
            </div>
          ) : analysisStatus === "snapshot_incomplete" ? (
            <div className="mt-4">
              <Card>
                <p className="text-stone-600 dark:text-stone-400">
                  Evidence limited - HTML snapshot incomplete.
                </p>
              </Card>
            </div>
          ) : analysis.score < 0 || !analysis.extracted.evidence ? (
            <div className="mt-4">
              <Card>
                <p className="text-stone-600 dark:text-stone-400">No evidence available (fetch blocked).</p>
              </Card>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <Card>
                <details className="group">
                  <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">
                  Page text signals
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  <p><span className="font-semibold">Title:</span> {analysis.extracted.evidence.titleText || "—"}</p>
                  <p><span className="font-semibold">Meta description:</span> {analysis.extracted.evidence.metaDescription || "—"}</p>
                  <p><span className="font-semibold">H1:</span> {analysis.extracted.evidence.h1Text || "—"}</p>
                  <div>
                    <p className="font-semibold">H2s (first 8):</p>
                    {analysis.extracted.evidence.h2Texts?.length ? (
                      <ul className="list-disc list-inside">
                        {analysis.extracted.evidence.h2Texts.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-stone-500">—</p>
                    )}
                  </div>
                </div>
                </details>
              </Card>

              <Card>
                <details className="group">
                  <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">
                  Schema / structured data
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  <p><span className="font-semibold">Schema types:</span> {analysis.extracted.evidence.schemaTypes?.length ? `[${analysis.extracted.evidence.schemaTypes.join(", ")}]` : "—"}</p>
                  <p><span className="font-semibold">JSON-LD sample:</span> {analysis.extracted.evidence.schemaRawSample || "—"}</p>
                </div>
                </details>
              </Card>

              <Card>
                <details className="group">
                  <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">
                  About / Contact / Answerability / Pricing
                  </summary>
                <div className="mt-3 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                  <div>
                    <p className="font-semibold">About evidence:</p>
                    {analysis.extracted.evidence.aboutEvidence?.length ? (
                      <ul className="list-disc list-inside">
                        {analysis.extracted.evidence.aboutEvidence.slice(0, 3).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-stone-500">—</p>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">Contact evidence:</p>
                    {analysis.extracted.evidence.contactEvidence?.length ? (
                      <ul className="list-disc list-inside">
                        {analysis.extracted.evidence.contactEvidence.slice(0, 3).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-stone-500">—</p>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">FAQ / Answerability:</p>
                    <ul className="list-disc list-inside">
                      <li>Explicit FAQ detected: {analysis.extracted.evidence.faqEvidence?.explicitFaqDetected ? "yes" : "no"}</li>
                      <li>Indirect FAQ links: {analysis.extracted.evidence.faqEvidence?.indirectFaqLinks?.length ? analysis.extracted.evidence.faqEvidence.indirectFaqLinks.slice(0, 5).join(", ") : "—"}</li>
                      <li>Direct-answer snippets: {analysis.extracted.evidence.faqEvidence?.directAnswerSnippets?.length ? analysis.extracted.evidence.faqEvidence.directAnswerSnippets.slice(0, 3).join(" / ") : "—"}</li>
                    </ul>
                    {isExampleReport && exampleReport?.evidence?.faqSignals ? (
                      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        FAQ signals: explicit={String(exampleReport.evidence.faqSignals.explicit)}, indirectLinks={exampleReport.evidence.faqSignals.indirectLinks}, directAnswerSnippets={exampleReport.evidence.faqSignals.directAnswerSnippets}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-semibold">Pricing evidence:</p>
                    {analysis.extracted.evidence.pricingEvidence?.length ? (
                      <ul className="list-disc list-inside">
                        {analysis.extracted.evidence.pricingEvidence.slice(0, 3).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-stone-500">—</p>
                    )}
                  </div>
                </div>
                </details>
              </Card>
            </div>
          )}
        </CollapsibleSection>

        {/* Section: What AI Recommends Instead */}
        <CollapsibleSection
          title="What AI Recommends Instead"
          subtitle={
            isRealAnalysis
              ? "Based on your score, here's how you likely compare to competitors in LLM recommendations:"
              : "When asked about this category, LLMs typically mention these types of competitors:"
          }
        >
          <div className="mt-4">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700">
                  <th className="py-2 pr-4 font-semibold">Competitor Type</th>
                  <th className="py-2 pr-4 font-semibold">Mention Likelihood</th>
                  <th className="py-2 font-semibold">Why They Win</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-stone-100 dark:border-stone-800">
                  <td className="py-3 pr-4">Sites with FAQ sections</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                      analysis.extracted.hasFAQ
                        ? "bg-stone-100 text-stone-600"
                        : analysis.extracted.hasIndirectFAQ
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}>
                      {analysis.extracted.hasFAQ
                        ? "You have this"
                        : analysis.extracted.hasIndirectFAQ
                        ? "Indirect"
                        : "High"}
                    </span>
                  </td>
                  <td className="py-3 text-stone-600 dark:text-stone-400">Q&A format matches how users query LLMs</td>
                </tr>
                <tr className="border-b border-stone-100 dark:border-stone-800">
                  <td className="py-3 pr-4">Sites with Schema markup</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${analysis.extracted.hasSchemaJsonLd ? "bg-stone-100 text-stone-600" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
                      {analysis.extracted.hasSchemaJsonLd ? "You have this" : "Medium"}
                    </span>
                  </td>
                  <td className="py-3 text-stone-600 dark:text-stone-400">Structured data helps AI categorize entities</td>
                </tr>
                <tr className="border-b border-stone-100 dark:border-stone-800">
                  <td className="py-3 pr-4">Sites with clear pricing</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${analysis.extracted.hasPricing ? "bg-stone-100 text-stone-600" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
                      {analysis.extracted.hasPricing ? "You have this" : "Medium"}
                    </span>
                  </td>
                  <td className="py-3 text-stone-600 dark:text-stone-400">Commercial clarity signals legitimate business</td>
                </tr>
              </tbody>
                </table>
              </div>
            </Card>
          </div>
        </CollapsibleSection>

        {/* Section: Competitive Lens (V1.8) */}
        <CollapsibleSection
          title="Where AI Likely Recommends Alternatives"
          subtitle="Based on missing signals, AI tends to favor:"
        >
          <ul className="mt-4 list-disc list-inside space-y-2 text-stone-700 dark:text-stone-300">
            {getCompetitiveLensBullets(analysis, analysisStatus).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* LLM Recommendation Simulation */}
        <CollapsibleSection
          title="LLM Recommendation Simulation (Beta)"
          subtitle="Simulation based on your snapshot + general LLM behavior. No real-time model calls to competitors."
        >
          <SimulationPanel domain={displayDomain || ""} url={url} analysis={analysis} hideHeader compact />
        </CollapsibleSection>

        {/* Live AI Recommendation Check */}
        <CollapsibleSection
          title="Live AI Recommendation Check"
          subtitle="Paste a real AI answer to see how your brand was positioned. No model calls are made."
        >
          <LiveRecommendationCheck
            reportId={reportId}
            brand={displayBrand}
            domain={displayDomain}
            analysis={analysis}
            hideHeader
            compact
          />
        </CollapsibleSection>

        <CollapsibleSection title="Why Competitors Win">
          <p className="mt-4 text-stone-700 dark:text-stone-300">
            When users ask open-ended questions, AI models favor sites that expose
            direct answers, structured sections, and explicit entity definitions.
            Sites missing those signals are often skipped — even when their
            underlying content quality is strong.
          </p>
        </CollapsibleSection>

        {/* Section: Why You're Not the Default */}
        <CollapsibleSection title="Why You're Not the Default">
          <p className="mt-4 text-stone-600 dark:text-stone-400">
            LLMs select default answers based on authority signals, content structure, and entity recognition. 
            {isRealAnalysis ? " The following gaps were identified:" : ""}
          </p>
          {analysis.weaknesses.length > 0 ? (
            <ol className="mt-4 list-decimal list-inside space-y-2">
              {analysis.weaknesses.map((weakness, i) => (
                <li key={i} className="text-stone-700 dark:text-stone-300">
                  {weakness}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-emerald-600">No major weaknesses identified — your site has strong LLM signals!</p>
          )}
        </CollapsibleSection>

        {/* Section: Metadata */}
        <CollapsibleSection id="metadata" title="Metadata">
          <div className="mt-4">
            <Card>
              <div className="font-mono text-sm">
              <dl className="space-y-2">
              <div className="flex">
                <dt className="w-40 text-stone-500">Report ID</dt>
                <dd>{reportId}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">URL Analyzed</dt>
                <dd className="break-all">{url || "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Domain</dt>
                <dd>{displayDomain || "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Brand</dt>
                <dd>{displayBrand || "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Page evaluated</dt>
                <dd>{analysis.extracted.evaluatedPage || "Homepage HTML snapshot"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Evaluated URL</dt>
                <dd className="break-all">
                  {analysis.extracted.canonicalUrl || analysis.extracted.evaluatedUrl || url || "N/A"}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">HTTP status</dt>
                <dd>{analysis.fetchDiagnostics?.status ?? "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Content type</dt>
                <dd>{analysis.fetchDiagnostics?.contentType || "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Bytes</dt>
                <dd>
                  {typeof analysis.fetchDiagnostics?.bytes === "number"
                    ? analysis.fetchDiagnostics.bytes.toLocaleString()
                    : "N/A"}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Snapshot quality</dt>
                <dd>{analysis.snapshotQuality || "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Fetch timestamp</dt>
                <dd>{analysis.extracted.fetchedAt || "N/A"}</dd>
              </div>

              {/* Page Scan Metadata */}
              {analysis.extracted.pageScanMetadata && (
                <>
                  <div className="flex">
                    <dt className="w-40 text-stone-500">Scan depth</dt>
                    <dd className="capitalize">
                      {analysis.extracted.pageScanMetadata.scanDepth.replace("-", " ")}
                      {analysis.extracted.pageScanMetadata.scanDepth === "multi-page" &&
                        ` (${analysis.extracted.pageScanMetadata.totalScanned} total)`}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-40 text-stone-500">Pages scanned</dt>
                    <dd>
                      <div className="space-y-1 text-xs">
                        {analysis.extracted.pageScanMetadata.scannedPages.map((page, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className={page.status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                              {page.status === "success" ? "✓" : "✗"}
                            </span>
                            <div className="flex-1">
                              <div className="break-all">
                                {page.path === "/" ? `${page.url} (homepage)` : page.url}
                              </div>
                              {page.error && (
                                <div className="text-stone-500 dark:text-stone-500 italic">
                                  {page.error}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        {analysis.extracted.pageScanMetadata.successCount} successful, {analysis.extracted.pageScanMetadata.errorCount} failed
                      </div>
                    </dd>
                  </div>
                </>
              )}

              <div className="flex">
                <dt className="w-40 text-stone-500">Generated At</dt>
                <dd>{generatedAt}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Prompt Pack</dt>
                <dd>{promptPackVersion}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">DefaultAnswer Version</dt>
                <dd>{defaultAnswerVersion}</dd>
              </div>
              {isExampleReport && exampleReport?.metadata.scoringEngine ? (
                <div className="flex">
                  <dt className="w-40 text-stone-500">Scoring Engine</dt>
                  <dd>{exampleReport.metadata.scoringEngine}</dd>
                </div>
              ) : null}
              <div className="flex">
                <dt className="w-40 text-stone-500">Score</dt>
                <dd>{analysis.score >= 0 ? `${analysis.score}/100` : "Pending"}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Analysis Type</dt>
                <dd>
                  {hasAnalysis
                    ? analysisStatus === "ok"
                      ? "Real (V1.11)"
                      : analysisStatus === "snapshot_incomplete"
                      ? "Snapshot incomplete"
                      : analysisStatus === "blocked"
                      ? "Fetch blocked"
                      : "Fallback"
                    : "Placeholder"}
                </dd>
              </div>
              </dl>
              </div>
            </Card>
          </div>
          {!hasAnalysis && (
            <p className="mt-4 text-xs text-stone-400 italic">
              * This report shows placeholder data. Submit a URL to get real analysis.
            </p>
          )}
        </CollapsibleSection>

        {isExampleReport && (
          <CollapsibleSection title="Learn more about how this works">
            <ul className="mt-4 list-disc list-inside space-y-2 text-stone-700 dark:text-stone-300">
              <li>
                <Link href="/methodology" className="underline hover:text-stone-900 dark:hover:text-stone-100">
                  Methodology
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/why-ai-recommendations-fail-even-when-you-rank-1"
                  className="underline hover:text-stone-900 dark:hover:text-stone-100"
                >
                  Why AI recommendations fail even when you rank #1
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/why-ai-skips-websites-that-dont-answer-questions-directly"
                  className="underline hover:text-stone-900 dark:hover:text-stone-100"
                >
                  Why AI skips websites that don’t answer questions directly
                </Link>
              </li>
            </ul>
          </CollapsibleSection>
        )}

        </div>

        {/* CTA */}
        {!isExampleReport ? (
          <div className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-800 text-center print:hidden">
            <Link
              href="/defaultanswer"
              className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              Analyze Another URL
            </Link>
          </div>
        ) : (
          <p className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-800 text-center text-sm text-stone-500 dark:text-stone-400">
            {exampleContext?.footerOverride || exampleReport?.footer}
          </p>
        )}
            </div>
          </ReportShell>
        );
      }}
    </ReportRenderer>
  );
}

function beliefBlockingFactors(analysis: AnalysisResult, status: AnalysisStatus): string[] {
  const bullets: string[] = [];
  const ex = analysis.extracted;
  const brandName = analysis.extracted.brandGuess || analysis.extracted.domain || "your site";

  if (status === "blocked") {
    return bullets;
  }

  if (status === "snapshot_incomplete") {
    bullets.push(
      "The HTML snapshot looks incomplete — key identity and FAQ answers likely require JavaScript, so I would have to infer instead of retrieve."
    );
    bullets.push(
      "Until core answers are visible in the initial HTML, I cannot cite your site as a default source."
    );
    return bullets;
  }

  // Strength vs constraint patterns
  const hasEntity = Boolean(ex.title) && (ex.h1s || []).length > 0;
  const hasStructure = (ex.h2s || []).length >= 3;

  if (hasEntity && (!ex.hasFAQ && !ex.hasIndirectFAQ)) {
    bullets.push(`You are identifiable as an entity, but I cannot retrieve direct Q&A answers. That forces me to infer intent instead of citing ${brandName}.`);
  }
  if (hasStructure && !ex.hasSchema) {
    bullets.push("Your structure is readable, but without Schema.org markup I have to infer entity type instead of retrieving a machine-readable definition.");
  }
  if ((ex.hasAbout || ex.hasContact) && (!ex.hasAbout || !ex.hasContact)) {
    bullets.push("You show some legitimacy, but missing trust signals reduce how confidently I can recommend you by default.");
  }
  if (ex.hasSchema && (!ex.hasFAQ && !ex.hasIndirectFAQ)) {
    bullets.push("You provide structured entity data, but you do not expose direct answers to common questions on the homepage.");
  }

  // Fall back to existing negative reasoning interpretations, compacted
  if (bullets.length < 3) {
    const neg = (analysis.reasoning || []).filter((r) => r.impact === "negative").map((r) => compactSentence(r.interpretation));
    for (const n of neg) bullets.push(n);
  }

  return uniq(bullets).slice(0, 5);
}

function selectDominantFixItem(args: {
  fixPlan: FixPlanItem[];
  breakdown: BreakdownItem[];
  reasoning: { impact: string; signal: string }[];
}): FixPlanItem | null {
  const { fixPlan, breakdown, reasoning } = args;
  if (!fixPlan || fixPlan.length === 0) return null;

  // If analysis is blocked (fetch failed / 403 / 429), only recommend accessibility.
  // We cannot verify any other content-level fixes deterministically.
  const access = fixPlan.find(
    (f) =>
      (f.action || "").trim() ===
      "Ensure your site is publicly accessible and not blocking automated requests."
  );
  const looksBlocked = (breakdown || []).some((b) =>
    b.category === "Error" &&
    /(HTTP\s*403|HTTP\s*429|forbidden|too\s+many\s+requests|fetch failed)/i.test(b.reason || "")
  );
  if (looksBlocked) {
    return access || null;
  }

  // Identify largest uncertainty: lowest % category, weighted by negative reasoning
  const gap = biggestGapCategoryFromBreakdown(breakdown);
  const weightedCategory = weightGapWithNegativeReasoning(gap, reasoning);

  const high = fixPlan.filter((f) => f.priority === "high");
  const medium = fixPlan.filter((f) => f.priority === "medium");
  const low = fixPlan.filter((f) => f.priority === "low");

  const pickByCategory = (list: FixPlanItem[]) =>
    list.find((f) => mapFixToCategory(f.action) === weightedCategory) || null;

  return (
    pickByCategory(high) ||
    high[0] ||
    pickByCategory(medium) ||
    medium[0] ||
    pickByCategory(low) ||
    low[0] ||
    fixPlan[0] ||
    null
  );
}

function mapFixToCategory(action: string): string {
  const a = (action || "").toLowerCase();
  if (a.includes("faq") || a.includes("schema")) return "Answerability Signals";
  if (a.includes("title") || a.includes("meta description") || a.includes("h1")) return "Entity Clarity";
  if (a.includes("h2") || a.includes("headings")) return "Structural Comprehension";
  if (a.includes("about") || a.includes("contact")) return "Trust & Legitimacy";
  if (a.includes("pricing") || a.includes("plans")) return "Commercial Clarity";
  return "Other";
}

function weightGapWithNegativeReasoning(gap: string, reasoning: { impact: string; signal: string }[]): string {
  if (!gap) return "Other";
  const negSignals = new Set(
    (reasoning || [])
      .filter((r) => r.impact === "negative")
      .map((r) => mapReasoningSignalToCategory(r.signal))
  );
  // If the current gap is also referenced in negative reasoning, keep it;
  // otherwise, prefer the first negative category (it is a confidence constraint).
  if (negSignals.has(gap)) return gap;
  for (const s of negSignals) {
    if (s && s !== "Other") return s;
  }
  return gap;
}

function mapReasoningSignalToCategory(signal: string): string {
  const s = (signal || "").toLowerCase();
  if (s.includes("entity")) return "Entity Clarity";
  if (s.includes("structure")) return "Structural Comprehension";
  if (s.includes("answer")) return "Answerability Signals";
  if (s.includes("structured data")) return "Answerability Signals";
  if (s.includes("trust")) return "Trust & Legitimacy";
  if (s.includes("commercial")) return "Commercial Clarity";
  return "Other";
}

type BlockerKey = "commercial_clarity" | "audience_clarity" | "trust" | "answerability";

const BLOCKER_LABELS: Record<BlockerKey, string> = {
  commercial_clarity: "Pricing / offer clarity",
  audience_clarity: "Who it's for",
  trust: "Trust + legitimacy",
  answerability: "FAQ / direct answers",
};

const BLOCKER_REASONS: Record<BlockerKey, string> = {
  commercial_clarity: "pricing is unclear",
  audience_clarity: "who it's for isn't clear",
  trust: "trust details are missing",
  answerability: "FAQ answers are missing",
};

type DoNextAction = {
  action: string;
  why: string;
  snippet: string;
  ctaLabel: string;
  description: string;
};

function resolveBlockerKey(primaryBlocker: string, analysis: AnalysisResult): BlockerKey {
  const blocker = (primaryBlocker || "").toLowerCase();
  if (blocker.includes("pricing") || blocker.includes("plan") || blocker.includes("offer")) {
    return "commercial_clarity";
  }
  if (blocker.includes("audience") || blocker.includes("position") || blocker.includes("category") || blocker.includes("entity")) {
    return "audience_clarity";
  }
  if (blocker.includes("trust") || blocker.includes("contact") || blocker.includes("about")) {
    return "trust";
  }
  if (blocker.includes("faq") || blocker.includes("answer")) {
    return "answerability";
  }
  if (!analysis.extracted.hasPricing) return "commercial_clarity";
  if (!analysis.extracted.hasFAQ) return "answerability";
  if (!analysis.extracted.hasAbout && !analysis.extracted.hasContactSignals) return "trust";
  return "audience_clarity";
}

function buildVerdictSentence(blockerKey: BlockerKey, readinessLabel: string) {
  const wouldRecommend = /strong|ready/i.test(readinessLabel || "");
  const reason = BLOCKER_REASONS[blockerKey];
  const lead = wouldRecommend ? "AI would recommend you" : "AI wouldn't recommend you yet";
  return `${lead}, because ${reason}.`;
}

function buildDoNextAction(blockerKey: BlockerKey, brandName: string): DoNextAction {
  const brand = brandName || "Your brand";

  if (blockerKey === "answerability") {
    return {
      action: "Add an FAQ block to your homepage",
      why: "FAQs give AI exact answers it can repeat without guessing.",
      snippet: buildFaqSnippet(brand),
      ctaLabel: "Add FAQ block",
      description: `Copy a ready-to-paste FAQ template for ${brand}.`,
    };
  }

  if (blockerKey === "commercial_clarity") {
    return {
      action: "Add a clear pricing section",
      why: "Pricing tells AI you sell something and who it is for.",
      snippet: buildPricingSnippet(),
      ctaLabel: "Add pricing section",
      description: `Copy a pricing section template for ${brand}.`,
    };
  }

  if (blockerKey === "audience_clarity") {
    return {
      action: "Add a \"Who this is for\" section",
      why: "AI needs a clear audience to know when to recommend you.",
      snippet: buildAudienceSnippet(brand),
      ctaLabel: "Clarify your audience",
      description: `Copy a short audience positioning block for ${brand}.`,
    };
  }

  if (blockerKey === "trust") {
    return {
      action: "Add About + Contact info",
      why: "Trust details help AI recommend you with confidence.",
      snippet: buildAboutContactSnippet(brand),
      ctaLabel: "Add About + Contact",
      description: `Copy About and Contact boilerplate for ${brand}.`,
    };
  }

  return {
    action: "Add an FAQ block to your homepage",
    why: "FAQs give AI exact answers it can repeat without guessing.",
    snippet: buildFaqSnippet(brand),
    ctaLabel: "Add FAQ block",
    description: `Copy a ready-to-paste FAQ template for ${brand}.`,
  };
}

function buildFaqSnippet(brand: string) {
  return [
    "FAQ",
    "",
    `Q: What is ${brand}?`,
    `A: ${brand} is a [category] that helps [audience] [primary outcome].`,
    "",
    "Q: Who is it for?",
    "A: Built for [audience] who need [job-to-be-done].",
    "",
    "Q: How does it work?",
    "A: [Step one], [step two], [step three].",
    "",
    "Q: What makes it different?",
    "A: [Differentiator 1], [differentiator 2], [differentiator 3].",
    "",
    "Q: How do I get started?",
    "A: [Trial/signup], [setup time], [first result].",
  ].join("\n");
}

function buildPricingSnippet() {
  return [
    "Pricing",
    "",
    "Starter - $X/mo",
    "- Best for [audience]",
    "- Includes [core feature]",
    "",
    "Growth - $Y/mo",
    "- Best for [team size/use case]",
    "- Includes [advanced feature]",
    "",
    "Enterprise - Contact us",
    "",
    "Mini table:",
    "| Plan | Price | Best for |",
    "| --- | --- | --- |",
    "| Starter | $X/mo | [audience] |",
    "| Growth | $Y/mo | [team/use case] |",
  ].join("\n");
}

function buildAudienceSnippet(brand: string) {
  return [
    "Who this is for",
    "",
    `- Ideal for: [audience] who want [outcome].`,
    `- Not for: [audience] who need [constraint].`,
    `- Best when: [context or workflow].`,
    "",
    `In one line: ${brand} helps [audience] [outcome].`,
  ].join("\n");
}

function buildAboutContactSnippet(brand: string) {
  return [
    `About ${brand}`,
    "",
    `${brand} helps [audience] achieve [outcome] by [how it works].`,
    "Founded in [year]. Based in [location].",
    "",
    "Contact",
    "",
    "Email: [support@company.com]",
    "Phone: [+1 (000) 000-0000]",
    "Address: [Street], [City], [State], [ZIP]",
  ].join("\n");
}

function getSnippetForFix(action: string, brandName: string): string | null {
  const a = (action || "").toLowerCase();
  const brand = brandName || "Your brand";

  if (a.includes("faq")) {
    return buildFaqSnippet(brand);
  }

  if (a.includes("pricing") || a.includes("plan")) {
    return buildPricingSnippet();
  }

  if (a.includes("contact") || a.includes("about") || a.includes("trust")) {
    return buildAboutContactSnippet(brand);
  }

  return null;
}

function getScoreLabel(_score: number): string {
  return "Default Answer Score";
}

// ===== Components =====

function AnalysisStatusBadge({ status, snapshotQuality }: { status: AnalysisStatus; snapshotQuality?: SnapshotQuality }) {
  const label =
    status === "snapshot_incomplete"
      ? "Snapshot incomplete"
      : status === "blocked"
      ? "Blocked"
      : status === "error"
      ? "Error"
      : "OK";
  const color =
    status === "snapshot_incomplete"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
      : status === "blocked"
      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
      : status === "error"
      ? "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200";

  const detail = status === "snapshot_incomplete" && snapshotQuality ? ` (${snapshotQuality})` : "";

  return (
    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${color}`}>
      {label}
      {detail}
    </span>
  );
}

function ReadinessClassification({
  analysis,
  hasAnalysis,
  status,
  explanationOverride,
}: {
  analysis: AnalysisResult;
  hasAnalysis: boolean;
  status: AnalysisStatus;
  explanationOverride?: string;
}) {
  const { level, label, explanation } = getReadinessClassification(analysis, hasAnalysis, status);

  const levelStyles = {
    strong: {
      bg: "bg-emerald-50 dark:bg-emerald-950",
      border: "border-emerald-200 dark:border-emerald-800",
      label: "text-emerald-800 dark:text-emerald-200",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    emerging: {
      bg: "bg-amber-50 dark:bg-amber-950",
      border: "border-amber-200 dark:border-amber-800",
      label: "text-amber-800 dark:text-amber-200",
      text: "text-amber-700 dark:text-amber-300",
    },
    "not-candidate": {
      bg: "bg-red-50 dark:bg-red-950",
      border: "border-red-200 dark:border-red-800",
      label: "text-red-800 dark:text-red-200",
      text: "text-red-700 dark:text-red-300",
    },
  };

  const styles = levelStyles[level];

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-5`}>
      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
        Default Answer Readiness
      </p>
      <p className={`text-xl font-bold ${styles.label}`}>
        {label}
      </p>
      <p className={`mt-2 text-sm ${styles.text}`}>
        {explanationOverride || explanation}
      </p>
    </div>
  );
}

// V1.4: Action guidance mappings
type ActionGuidance = {
  why: string;
  steps: [string, string];
};

const ACTION_GUIDANCE: Record<string, ActionGuidance> = {
  // Title/Brand fixes
  "Update your title tag": {
    why: "AI uses the title tag as a primary signal to understand what your brand is and does. Without a clear title, AI cannot confidently categorize or recommend you.",
    steps: [
      "Edit your homepage title to follow the pattern: 'Brand - What you do | Category'",
      "Verify by viewing page source that the <title> tag contains your brand name and category",
    ],
  },
  // H1 fixes
  "Add an H1 heading": {
    why: "The H1 is the most prominent content signal on your page. AI weights it heavily when determining what your product is and whether to recommend it.",
    steps: [
      "Add a single H1 tag containing a complete sentence that defines your product (e.g., 'Acme is a category solution that helps teams achieve an outcome')",
      "Confirm there's exactly one H1 on the page using browser dev tools or an SEO checker",
    ],
  },
  "Rewrite your H1": {
    why: "A vague or generic H1 prevents AI from understanding what you offer. AI needs explicit category language to match your brand with user queries.",
    steps: [
      "Replace your H1 with a descriptive sentence that includes your product category and primary benefit",
      "Test by asking: 'Would someone reading only this heading understand exactly what we sell?'",
    ],
  },
  // Meta description
  "Add a meta description": {
    why: "Meta descriptions provide AI with a concise summary of your page's purpose. Missing this signal means AI has less context for recommendations.",
    steps: [
      "Add a meta description tag (150-160 characters) that states what you offer and who it's for",
      "Check that it appears in your page's <head> section and doesn't get truncated",
    ],
  },
  // Structure fixes
  "Add H2 sections": {
    why: "AI parses page structure through headings. Multiple H2s signal comprehensive content and help AI understand your full value proposition.",
    steps: [
      "Add H2 headings for: Features, Benefits, How It Works, Use Cases, and Pricing",
      "Ensure each H2 introduces substantial content (not just a single sentence)",
    ],
  },
  "Replace generic headings": {
    why: "Headings like 'Welcome' or 'Home' waste valuable signals. AI needs descriptive headings to understand and index your content properly.",
    steps: [
      "Audit all H1-H3 tags and replace any that don't describe specific content",
      "Use the pattern '[Action verb] + [Specific topic]' (e.g., 'Automate Your Invoicing' not 'Features')",
    ],
  },
  // FAQ fix
  "Add an FAQ section": {
    why: "AI is trained on billions of question-answer pairs. FAQ content directly matches how users query AI, making your brand more likely to be cited.",
    steps: [
      "Create an FAQ section with 5-7 questions including 'What is your product?', 'Who is it for?', 'How does it work?', and 'Why choose this brand?'",
      "Format as visible text (not collapsed accordions) so AI can read the answers directly",
    ],
  },
  // Schema fix
  "Add Schema.org JSON-LD": {
    why: "Structured data gives AI machine-readable entity information. It helps AI categorize your brand correctly and understand your relationship to competitors.",
    steps: [
      "Add a <script type='application/ld+json'> block with Organization or Product schema",
      "Validate using Google's Rich Results Test or Schema.org validator",
    ],
  },
  // Trust fixes
  "Create an About page": {
    why: "AI prefers recommending businesses with verifiable backgrounds. An About page establishes legitimacy and provides entity context.",
    steps: [
      "Create an About page with company history, team information, and mission statement",
      "Link to it prominently from your homepage navigation",
    ],
  },
  "Add a Contact page": {
    why: "Contact information signals that you're a real, reachable business. AI weights trust signals when deciding whether to recommend brands.",
    steps: [
      "Add a Contact page with email, form, or phone number",
      "Include a visible contact link in your homepage footer or header",
    ],
  },
  // Pricing fix
  "Add a Pricing section": {
    why: "Users often ask AI to compare solutions by price. Without visible pricing, AI cannot include you in price-based recommendations.",
    steps: [
      "Create a Pricing page or section with clear plan names and what's included",
      "Use actual numbers or ranges rather than 'Contact us for pricing'",
    ],
  },
};

function getActionGuidance(action: string, brandName: string): ActionGuidance | null {
  const isAccessAction =
    (action || "").trim() ===
    "Ensure your site is publicly accessible and not blocking automated requests.";

  if (isAccessAction) {
    return {
      why: "AI systems rely on retrievable content to form confident recommendations. When a site cannot be reliably accessed, it is typically excluded from default answers—even if the brand itself is strong.",
      steps: [
        "Implement the change described above on your homepage or key landing page",
        "Verify the change is visible in your page source and not hidden by JavaScript",
      ],
    };
  }

  // Find matching guidance by checking if action contains key phrases
  for (const [key, guidance] of Object.entries(ACTION_GUIDANCE)) {
    if (action.toLowerCase().includes(key.toLowerCase())) {
      // Replace any generic example brand token with the current brand for user-facing output
      const steps: [string, string] = [
        guidance.steps[0].replace(/\bAcme\b/g, brandName || "Your brand"),
        guidance.steps[1].replace(/\bAcme\b/g, brandName || "Your brand"),
      ];
      return {
        why: guidance.why,
        steps,
      };
    }
  }
  
  // Default guidance if no specific match
  return {
    why: "This improvement strengthens signals that AI uses to understand and recommend your brand.",
    steps: [
      "Implement the change described above on your homepage or key landing page",
      "Verify the change is visible in your page source and not hidden by JavaScript",
    ],
  };
}

function OneChangeThatIncreasesConfidence(props: {
  fix: FixPlanItem | null;
  guidance: ActionGuidance | null;
  brandName: string;
}) {
  const { fix, guidance } = props;
  if (!fix || !guidance) return null;

  const snippet = getSnippetForFix(fix.action, props.brandName);
  const category = mapFixToCategory(fix.action);
  const change = whatChangesIfFixed(category, props.brandName);
  const remains = whatRemainsIfNotFixed(category, props.brandName);

  return (
    <Card>
      <p className="font-semibold text-stone-900 dark:text-stone-100">
        {fix.action}
      </p>

      <div className="mt-4 space-y-4 text-stone-700 dark:text-stone-300">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
            Why this matters to the model
          </p>
          <p className="text-sm">{guidance.why}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
            What will change if it’s fixed
          </p>
          <p className="text-sm">{change}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
            What will remain unchanged if it’s not
          </p>
          <p className="text-sm">{remains}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
            How to validate
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>{guidance.steps[0]}</li>
            <li>{guidance.steps[1]}</li>
          </ol>
        </div>
      </div>

      {snippet ? (
        <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Copy snippet
            </div>
            <CopyButton text={snippet} />
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-xs text-stone-800 dark:bg-stone-950 dark:text-stone-200">
{snippet}
          </pre>
        </div>
      ) : null}
    </Card>
  );
}

function whatChangesIfFixed(category: string, brandName: string): string {
  switch (category) {
    case "Answerability Signals":
      return `I will be able to retrieve direct answers about ${brandName} instead of inferring them, which increases default-recommendation confidence.`;
    case "Entity Clarity":
      return `I will be able to identify exactly what ${brandName} is from first principles, rather than guessing from context.`;
    case "Structural Comprehension":
      return `I will be able to compress your offering into retrievable sections (features, use cases, how it works), which makes you easier to cite.`;
    case "Trust & Legitimacy":
      return `I will be able to retrieve legitimacy signals (who you are, how to contact you), reducing hesitation to recommend you by default.`;
    case "Commercial Clarity":
      return `I will be able to retrieve clear commercial terms, making it easier to include ${brandName} in recommendation comparisons.`;
    default:
      return "I will be able to retrieve stronger, verifiable signals instead of inferring intent.";
  }
}

function whatRemainsIfNotFixed(category: string, brandName: string): string {
  switch (category) {
    case "Answerability Signals":
      return `I will continue to favor sources where answers are directly retrievable, and I will hesitate to recommend ${brandName} as the default.`;
    case "Entity Clarity":
      return `I will continue to treat ${brandName} as less certain than competitors with explicit definitions, and default recommendations will remain inconsistent.`;
    case "Structural Comprehension":
      return `I will continue to rely on partial structure, which makes ${brandName} harder to retrieve and cite in default answers.`;
    case "Trust & Legitimacy":
      return `I will continue to treat ${brandName} as less verifiable than sources with explicit trust signals.`;
    case "Commercial Clarity":
      return `I will continue to exclude ${brandName} from price/plan comparisons where commercial terms are not retrievable.`;
    default:
      return `I will continue to infer key details about ${brandName}, which reduces recommendation confidence.`;
  }
}

function NoCriticalFixesDetected({ note }: { note?: string }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-2">
        No Critical Fixes Detected
      </h3>
      <p className="text-sm text-stone-700 dark:text-stone-300">
        {note ||
          "Your site already provides strong default-answer signals. Remaining improvements are marginal and unlikely to materially change AI recommendations."}
      </p>
    </Card>
  );
}

function PromptCategory({ 
  title, 
  description, 
  prompts 
}: { 
  title: string; 
  description: string; 
  prompts: { id: string; template: string; description: string }[] 
}) {
  return (
    <div>
      <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-1">{title}</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">{description}</p>
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <Card key={prompt.id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <code className="text-sm text-stone-800 dark:text-stone-200 break-words">
                  {prompt.template}
                </code>
                <CopyButton text={prompt.template} />
              </div>
              <p className="text-xs text-stone-500">{prompt.description}</p>
              <div className="border-t border-stone-200 dark:border-stone-800 pt-3">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">LLM Output</p>
                <p className="text-sm text-stone-500 dark:text-stone-400 italic">
                  [Copy prompt above and paste into ChatGPT/Claude to see results]
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function getCompetitiveLensBullets(analysis: AnalysisResult, status: AnalysisStatus): string[] {
  const bullets: string[] = [];
  const ex = analysis.extracted;

  if (status === "blocked") {
    bullets.push("Sites that allow homepage HTML to be fetched without bot blocks or authentication");
    bullets.push("Sources with retrievable content that AI can cite directly");
    return bullets.slice(0, 2);
  }

  if (status === "snapshot_incomplete") {
    bullets.push("Sites whose core identity and FAQs are visible without JavaScript");
    bullets.push("Pages with server-rendered titles, meta, and schema that AI can parse directly");
    return bullets.slice(0, 2);
  }

  // Answerability
  if (!ex.hasFAQ) {
    bullets.push("Sites with visible FAQ-style answers to common questions");
  }
  if (!ex.hasSchema) {
    bullets.push("Sites with Schema.org markup that clearly defines the entity type");
  }
  if (!hasHowItWorks(ex.h2s, ex.h3s)) {
    bullets.push("Sites with clear 'How it works' sections explaining the workflow");
  }

  // Structure & comprehension
  if ((ex.h2s || []).length < 3) {
    bullets.push("Sites with deeper section structure (features, use cases, pricing, FAQs)");
  }

  // Trust
  if (!ex.hasAbout || !ex.hasContact) {
    bullets.push("Sites with stronger trust signals (About + verifiable contact information)");
  }

  // Commercial clarity
  if (!ex.hasPricing) {
    bullets.push("Sites with explicit pricing or plans visible on the homepage");
  }

  // Fallback: if nothing missing, still show a sensible competitive lens
  if (bullets.length === 0) {
    bullets.push("Sites with dense, well-structured product explanations and trust signals");
  }

  // Limit to a clean 3–5 bullets
  return bullets.slice(0, 5);
}

function hasHowItWorks(h2s: string[], h3s: string[]): boolean {
  const re = /how\s+it\s+works?/i;
  return [...(h2s || []), ...(h3s || [])].some((h) => re.test(h));
}

function isAccessRestrictionFallback(analysis: AnalysisResult): boolean {
  return getAnalysisStatus(analysis) === "blocked";
}
