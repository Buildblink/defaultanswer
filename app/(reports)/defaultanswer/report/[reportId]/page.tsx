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
import { SimulationPanel } from "./simulation-panel";
import { LiveRecommendationCheck } from "./live-recommendation-check";
import { diffScans, fetchLatestScans, isHistoryConfigured, type ScanDiff } from "@/lib/defaultanswer/history";
import type { FetchDiagnostics } from "@/lib/defaultanswer/scoring";
import { ExportButtons } from "./export-buttons";

type Props = {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ url?: string; data?: string }>;
};

type CompetitiveDeltaBullet = {
  query: string;
  competitorAdvantage: string;
  whyLose: string;
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

export default async function ReportPage({ params, searchParams }: Props) {
  const { reportId } = await params;
  const { url = "", data: encodedData } = await searchParams;

  // Extract domain and brand from URL
  const { domain, brand } = extractBrandInfo(url);

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

  // Use extracted brand if available, otherwise use URL-derived
  const displayBrand = analysis.extracted.brandGuess || brand;
  const displayDomain = analysis.extracted.domain || domain;

  // Get prompt pack for this brand
  const prompts = getPromptPack({ brand: displayBrand, domain: displayDomain, category: "solution" });

  // Determine score label and status
  const scoreLabel = getScoreLabel(analysis.score);
  const generatedAt = new Date().toISOString();
  const analysisStatus = getAnalysisStatus(analysis);
  const hasAnalysis = !isAnalysisMissing;
  const isRealAnalysis = hasAnalysis;
  const displayStatusLabel =
    analysisStatus === "snapshot_incomplete"
      ? "Snapshot incomplete"
      : analysisStatus === "blocked"
      ? "Blocked"
      : scoreLabel;

  // Compute readiness for markdown export
  const readiness = getReadinessClassification(
    analysis,
    hasAnalysis,
    analysisStatus
  );
  const readinessExplanation = readiness.explanation;
  const fetchStatus = analysis.fetchDiagnostics?.status;
  const isAccessRestricted =
    analysis.snapshotQuality === "access_restricted" ||
    fetchStatus === 401 ||
    fetchStatus === 403 ||
    fetchStatus === 429;

  const isPlaceholder = !hasAnalysis || analysisStatus !== "ok";
  const primaryUncertainty = beliefPrimaryUncertainty(analysis, analysisStatus);
  const supportingSignals = beliefSupportingSignals(analysis);
  const competitiveDelta =
    analysisStatus === "ok"
      ? buildCompetitiveDeltaBullets(analysis, displayBrand || displayDomain || "")
      : [];

  let historyDiff: ScanDiff | null = null;
  let historyMessage: string | null = null;
  if (isHistoryConfigured() && url) {
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
      version: DEFAULTANSWER_VERSION,
      pageEvaluated: analysis.extracted.evaluatedPage || "Homepage HTML snapshot",
      evaluatedUrl: analysis.extracted.evaluatedUrl || url,
      canonicalUrl: analysis.extracted.canonicalUrl,
      fetchTimestamp: analysis.extracted.fetchedAt,
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Document Header */}
      <header className="border-b border-stone-200 dark:border-stone-800 print:border-black">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/defaultanswer"
              className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 print:hidden"
            >
              ← Back to DefaultAnswer
            </Link>
            <span className="text-xs font-mono text-stone-400 hidden sm:inline">
              DefaultAnswer Report
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Document Title Block */}
        <div className="mb-10 pb-6 border-b border-stone-200 dark:border-stone-800">
          <h1 className="text-3xl font-bold tracking-tight">
            DefaultAnswer Report: {displayDomain || "Unknown Domain"}
          </h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            LLM Recommendation Analysis for <code className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-sm">{url || "N/A"}</code>
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-stone-500">
            {hasAnalysis ? (
              <>
                <span>
                  Default Answer Score™:{" "}
                  <strong className={getScoreColor(analysis.score)}>
                    {analysis.score >= 0 ? `${analysis.score}/100` : "Pending"}
                  </strong>
                </span>
                <span>•</span>
                <span>Status: {displayStatusLabel}</span>
                <span>•</span>
                <AnalysisStatusBadge status={analysisStatus} snapshotQuality={analysis.snapshotQuality} />
                {isPlaceholder && (
                  <>
                    <span>•</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                      title="Some signals could not be evaluated. The report still reflects best-effort AI interpretation."
                    >
                      Snapshot limited
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-amber-600">Analysis pending — submit a URL to see your score</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <ExportButtons reportData={reportData} />
            </div>
          </div>

          <div className="mt-6">
            <CopyMarkdownButton reportData={reportData} reportId={reportId} />
          </div>

          <ReportClientTools reportId={reportId} url={url} encodedData={encodedData} />

          <div className="mt-3 print:hidden">
            <CopyDebugJsonButton reportId={reportId} url={url} analysis={analysis} />
          </div>

          <HowToUseThisReport />
        </div>

        {/* 1) Belief */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">My current belief about your site</h2>
          <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-5 bg-stone-50 dark:bg-stone-900">
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
                Based on what I can retrieve today. This evaluates <strong>AI recommendation readiness</strong>, not SEO rankings or traffic.
              </p>
            </div>
          </div>
        </section>

        {/* 2) Delta */}
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

        {/* 3) Debate */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Why I’m not confident recommending you yet</h2>
          <ul className="list-disc list-inside space-y-2 text-stone-700 dark:text-stone-300">
            {generateConfidenceDebateBullets(analysis, displayBrand, analysisStatus).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="mt-4 text-stone-700 dark:text-stone-300">
            To recommend you without hesitation, I need direct answers that I can retrieve, not infer.
          </p>
        </section>

        {/* 4) One causal change */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">{oneChangeTitle}</h2>
          {whatToFixDecision.kind === "noCriticalFixes" ? (
            <NoCriticalFixesDetected />
          ) : (
            <OneChangeThatIncreasesConfidence
              fix={dominantFixItem}
              guidance={topFixGuidance}
              brandName={displayBrand}
            />
          )}
        </section>

        {/* Competitive Delta */}
        {analysisStatus === "ok" && competitiveDelta.length >= 2 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Where AI Might Recommend Alternatives Instead</h2>
            <p className="text-stone-600 dark:text-stone-400 mb-3">
              Based on gaps in this snapshot, here is where competitors gain citation preference.
            </p>
            <ul className="space-y-3">
              {competitiveDelta.map((b, idx) => (
                <li
                  key={idx}
                  className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900"
                >
                  <p className="text-stone-800 dark:text-stone-200">
                    <span className="font-semibold">When users ask:</span> “{b.query}”
                  </p>
                  <p className="text-stone-700 dark:text-stone-300 mt-1">
                    <span className="font-semibold">AI is more likely to cite sites that:</span> {b.competitorAdvantage}
                  </p>
                  <p className="text-stone-700 dark:text-stone-300 mt-1">
                    <span className="font-semibold">Why you lose here:</span> {b.whyLose}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section: How AI Interprets Your Brand (V1.2 renamed in V1.3) */}
        {isRealAnalysis && analysis.reasoning && analysis.reasoning.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">How AI Interprets Your Brand</h2>
            <p className="text-stone-600 dark:text-stone-400 mb-4">
              Based on detected signals, here's how an LLM interprets {displayBrand}'s page:
            </p>
            <div className="space-y-4">
              {analysis.reasoning.map((bullet, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border-l-4 ${
                    bullet.impact === "positive" 
                      ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500" 
                      : bullet.impact === "negative"
                      ? "bg-red-50 dark:bg-red-950 border-red-500"
                      : "bg-stone-50 dark:bg-stone-900 border-stone-400"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
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
                  <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed italic">
                    "{bullet.interpretation}"
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-stone-600 dark:text-stone-400 text-sm">
              These interpretations directly influence whether AI selects your brand as a default answer.
            </p>
          </section>
        )}

        {/* Section: History Diff */}
        {isHistoryConfigured() && (
          <section className="mb-10 border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
            <h2 className="text-xl font-semibold mb-2">What changed since last scan</h2>
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
          </section>
        )}

        {/* Section: Score Breakdown */}
        {analysis.breakdown.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Score Breakdown</h2>
            <p className="text-stone-600 dark:text-stone-400 mb-4">
              Your score is calculated from {analysis.breakdown.length} signals that influence LLM recommendations:
            </p>
            <div className="space-y-4">
              {groupByCategory(analysis.breakdown).map(([category, items]) => (
                <div key={category} className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2 font-semibold text-sm">
                    {category} ({items.reduce((sum, i) => sum + i.points, 0)}/{items.reduce((sum, i) => sum + i.max, 0)} pts)
                  </div>
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {items.map((item, idx) => (
                      <div key={idx} className="px-4 py-3 flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={item.points === item.max ? "text-emerald-600" : item.points > 0 ? "text-amber-600" : "text-red-500"}>
                              {item.points === item.max ? "✓" : item.points > 0 ? "△" : "✗"}
                            </span>
                            <span className="font-medium">{item.label}</span>
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
                    <div className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                      Many modern websites intentionally restrict automated access. While this can be appropriate for security, it reduces the likelihood of being recommended by AI systems that rely on verifiable, retrievable sources.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Evidence (What I saw) */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Evidence (What I saw)</h2>
          {analysisStatus === "blocked" ? (
            <p className="text-stone-600 dark:text-stone-400">No evidence available (fetch blocked).</p>
          ) : analysisStatus === "snapshot_incomplete" ? (
            <p className="text-stone-600 dark:text-stone-400">
              Evidence limited — HTML snapshot incomplete.
            </p>
          ) : analysis.score < 0 || !analysis.extracted.evidence ? (
            <p className="text-stone-600 dark:text-stone-400">No evidence available (fetch blocked).</p>
          ) : (
            <div className="space-y-3">
              <details className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
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

              <details className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
                <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">
                  Schema / structured data
                </summary>
                <div className="mt-3 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  <p><span className="font-semibold">Schema types:</span> {analysis.extracted.evidence.schemaTypes?.length ? `[${analysis.extracted.evidence.schemaTypes.join(", ")}]` : "—"}</p>
                  <p><span className="font-semibold">JSON-LD sample:</span> {analysis.extracted.evidence.schemaRawSample || "—"}</p>
                </div>
              </details>

              <details className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
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
            </div>
          )}
        </section>

        {/* Section: What AI Recommends Instead */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">What AI Recommends Instead</h2>
          <p className="text-stone-600 dark:text-stone-400 mb-4">
            {isRealAnalysis 
              ? "Based on your score, here's how you likely compare to competitors in LLM recommendations:"
              : "When asked about this category, LLMs typically mention these types of competitors:"}
          </p>
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
        </section>

        {/* Section: Competitive Lens (V1.8) */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Where AI Likely Recommends Alternatives
          </h2>
          <p className="text-stone-600 dark:text-stone-400 mb-4">
            Based on missing signals, AI tends to favor:
          </p>
          <ul className="list-disc list-inside space-y-2 text-stone-700 dark:text-stone-300">
            {getCompetitiveLensBullets(analysis, analysisStatus).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        {/* LLM Recommendation Simulation */}
        <SimulationPanel domain={displayDomain || ""} url={url} analysis={analysis} />

        {/* Live AI Recommendation Check */}
        <LiveRecommendationCheck
          reportId={reportId}
          brand={displayBrand}
          domain={displayDomain}
          analysis={analysis}
        />

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Why Competitors Win</h2>
          <p className="text-stone-700 dark:text-stone-300">
            When users ask open-ended questions, AI models favor sites that expose
            direct answers, structured sections, and explicit entity definitions.
            Sites missing those signals are often skipped — even when their
            underlying content quality is strong.
          </p>
        </section>

        {/* Section: Why You're Not the Default */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Why You're Not the Default</h2>
          <p className="text-stone-600 dark:text-stone-400 mb-4">
            LLMs select default answers based on authority signals, content structure, and entity recognition. 
            {isRealAnalysis ? " The following gaps were identified:" : ""}
          </p>
          {analysis.weaknesses.length > 0 ? (
            <ol className="list-decimal list-inside space-y-2">
              {analysis.weaknesses.map((weakness, i) => (
                <li key={i} className="text-stone-700 dark:text-stone-300">
                  {weakness}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-emerald-600">No major weaknesses identified — your site has strong LLM signals!</p>
          )}
        </section>

        {/* Section: 14-Day Fix Plan */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">14-Day Fix Plan</h2>
          <p className="text-stone-600 dark:text-stone-400 mb-4">
            Prioritized actions to improve your Default Answer Score:
          </p>
          {analysis.fixPlan.length > 0 ? (
            <div className="space-y-3">
              {analysis.fixPlan.map((item, i) => (
                <div 
                  key={i} 
                  className="flex gap-4 p-3 bg-stone-50 dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800"
                >
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      item.priority === "high"
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : item.priority === "medium"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        : "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400"
                    }`}>
                      {item.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-stone-800 dark:text-stone-200">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500">No fixes needed — your site already shows strong, retrievable signals for AI recommendations.</p>
          )}
        </section>

        {/* Section: Evidence */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Evidence</h2>
          <p className="text-stone-600 dark:text-stone-400 mb-4">
            Prompt Pack {PROMPT_PACK_VERSION} — These prompts can be used to query LLMs about your brand. 
            Copy any prompt to verify results yourself.
          </p>

          <div className="space-y-6">
            <PromptCategory
              title="Best-in-Class Queries"
              description="Direct queries asking for the best option"
              prompts={prompts.filter(p => p.category === "best")}
            />
            <PromptCategory
              title="Alternatives Queries"
              description="Queries asking for alternatives or competitors"
              prompts={prompts.filter(p => p.category === "alternatives")}
            />
            <PromptCategory
              title="Comparison Queries"
              description="Head-to-head and category comparisons"
              prompts={prompts.filter(p => p.category === "comparison")}
            />
            <PromptCategory
              title="Use-Case Queries"
              description="Queries about fit for specific needs"
              prompts={prompts.filter(p => p.category === "use_case")}
            />
          </div>
        </section>

        {/* Section: Metadata */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Metadata</h2>
          <div className="bg-stone-50 dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800 p-4 font-mono text-sm">
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
              <div className="flex">
                <dt className="w-40 text-stone-500">Generated At</dt>
                <dd>{generatedAt}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">Prompt Pack</dt>
                <dd>{PROMPT_PACK_VERSION}</dd>
              </div>
              <div className="flex">
                <dt className="w-40 text-stone-500">DefaultAnswer Version</dt>
                <dd>{DEFAULTANSWER_VERSION}</dd>
              </div>
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
          {!hasAnalysis && (
            <p className="mt-4 text-xs text-stone-400 italic">
              * This report shows placeholder data. Submit a URL to get real analysis.
            </p>
          )}
        </section>

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-800 text-center print:hidden">
          <Link
            href="/defaultanswer"
            className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
          >
            Analyze Another URL
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-stone-200 dark:border-stone-800 mt-12">
        <div className="max-w-3xl mx-auto text-center text-sm text-stone-500 dark:text-stone-400">
          <p>DefaultAnswer — LLM Recommendation Intelligence</p>
          <p className="mt-1 text-xs">
            This document is machine-readable and LLM-quotable.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ===== Helper Functions =====

function getAnalysisStatus(analysis: AnalysisResult): AnalysisStatus {
  if (analysis.analysisStatus) return analysis.analysisStatus as AnalysisStatus;
  if (analysis.snapshotQuality && analysis.snapshotQuality !== "ok") return "snapshot_incomplete";
  if (analysis.fetchDiagnostics?.ok === false && analysis.fetchDiagnostics.errorType === "blocked") {
    return "blocked";
  }
  if (analysis.score < 0) return "error";
  return "ok";
}

function extractBrandInfo(url: string): { domain: string; brand: string } {
  if (!url) return { domain: "", brand: "" };
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, "");
    const brand = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { domain, brand };
  } catch {
    const cleaned = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const domain = cleaned.split("/")[0];
    const brand = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { domain, brand };
  }
}

function getScoreLabel(score: number): string {
  if (score < 0) return "Pending";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Poor";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getScoreSummary(score: number): string {
  if (score >= 80) return " AI assistants are likely to recommend this brand. Focus on maintaining position.";
  if (score >= 60) return " AI assistants may recommend this brand but often prefer competitors when signals are easier to retrieve.";
  if (score >= 40) return " AI assistants sometimes mention this brand but rarely as the default answer. Improvements needed.";
  return " AI assistants rarely recommend this brand. Significant improvements needed.";
}

function groupByCategory(breakdown: BreakdownItem[]): [string, BreakdownItem[]][] {
  const groups: Record<string, BreakdownItem[]> = {};
  for (const item of breakdown) {
    const cat = item.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return Object.entries(groups);
}

type ReadinessLevel = "strong" | "emerging" | "not-candidate";

function getReadinessClassification(
  analysis: AnalysisResult,
  hasAnalysis: boolean,
  status: AnalysisStatus
): { level: ReadinessLevel; label: string; explanation: string } {
  if (!hasAnalysis) {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation:
        "Analysis pending. AI confidence cannot be established until I can retrieve your homepage snapshot.",
    };
  }

  if (status === "blocked") {
    const statusCode = analysis.fetchDiagnostics?.status;
    const blockedWhy = statusCode ? `HTTP ${statusCode}` : "fetch blocked";
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation: `I could not retrieve your homepage (${blockedWhy}). When content is not retrievable, AI systems avoid recommending it by default.`,
    };
  }

  if (status === "snapshot_incomplete") {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation:
        "Analysis incomplete — the homepage content appears to require JavaScript or is too thin to evaluate reliably.",
    };
  }

  if (status === "error" || analysis.score < 0) {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation:
        "AI lacks sufficient clarity and trust signals to recommend your brand as a default option. Analysis could not be completed reliably.",
    };
  }

  const reasoning = analysis.reasoning || [];
  const score = analysis.score;
  const negativeCount = reasoning.filter((r) => r.impact === "negative").length;

  if (score >= 75 && negativeCount <= 1) {
    return {
      level: "strong",
      label: "Strong Default Candidate",
      explanation: "Your site provides clear signals that allow AI to confidently identify, trust, and recommend your brand.",
    };
  }

  if (score < 50) {
    return {
      level: "not-candidate",
      label: "Not a Default Candidate",
      explanation: "AI lacks sufficient clarity and trust signals to recommend your brand as a default option.",
    };
  }

  return {
    level: "emerging",
    label: "Emerging Option",
    explanation: "AI can understand your brand, but confidence gaps prevent it from consistently recommending you as the default.",
  };
}

function beliefSupportingSignals(analysis: AnalysisResult): string[] {
  const items = (analysis.breakdown || []).filter((b) => b.max > 0 && b.points === b.max && b.category !== "Error");
  const mapped = items.map((b) => mapSupportSignal(b.label));
  return uniq(mapped).slice(0, 3);
}

function beliefBlockingFactors(analysis: AnalysisResult, status: AnalysisStatus): string[] {
  const out: string[] = [];
  if (status === "blocked") {
    out.push("Homepage fetch was blocked, so I cannot verify evidence directly.");
  }
  if (status === "snapshot_incomplete") {
    out.push("Homepage snapshot was incomplete; likely requires JavaScript to expose core answers.");
  }
  for (const w of analysis.weaknesses || []) {
    if (w) out.push(w);
  }
  // Add compact negative reasoning constraints if weaknesses are empty or too short
  const neg = (analysis.reasoning || []).filter((r) => r.impact === "negative").map((r) => `${r.signal}: ${compactSentence(r.interpretation)}`);
  for (const n of neg) out.push(n);
  return uniq(out).slice(0, 3);
}

function beliefPrimaryUncertainty(analysis: AnalysisResult, status: AnalysisStatus): string {
  if (status === "blocked") {
    const statusCode = analysis.fetchDiagnostics?.status;
    return `I cannot retrieve your homepage${statusCode ? ` (HTTP ${statusCode})` : ""}, so I cannot verify any signals.`;
  }
  if (status === "snapshot_incomplete") {
    return "The HTML snapshot looks incomplete, so I would have to infer answers instead of retrieving them directly.";
  }
  if (analysis.score < 0) {
    return "I cannot retrieve your content reliably enough to form a verifiable recommendation.";
  }
  const gap = biggestGapCategoryFromBreakdown(analysis.breakdown || []);
  if (gap === "Answerability Signals") {
    return "I have to infer answers instead of retrieving them directly from your site.";
  }
  if (gap === "Trust & Legitimacy") {
    return "I cannot verify legitimacy signals as strongly as I can for competing sources.";
  }
  if (gap === "Entity Clarity") {
    return "I cannot identify exactly what you are without making assumptions.";
  }
  if (gap === "Structural Comprehension") {
    return "I cannot reliably compress your structure into retrievable sections and claims.";
  }
  if (gap === "Commercial Clarity") {
    return "I cannot retrieve clear commercial terms, which limits confident recommendations.";
  }
  return "There is still uncertainty in what I can retrieve versus what I have to infer.";
}

function beliefSummaryText(args: {
  brand: string;
  readinessLabel: string;
  confidenceScore: number;
  supporting: string[];
  primaryUncertainty: string;
  status: AnalysisStatus;
}): string {
  if (args.status === "blocked") {
    return "I can’t establish confidence yet because I couldn’t retrieve your homepage. AI systems avoid recommending sources they cannot fetch.";
  }
  if (args.status === "snapshot_incomplete") {
    return "Analysis incomplete — the homepage content appears to require JavaScript or is too thin to evaluate reliably.";
  }
  const scorePart = args.confidenceScore >= 0 ? `${args.confidenceScore}/100` : "—";
  const supportA = args.supporting[0] ? args.supporting[0] : "some signals are retrievable";
  const supportB = args.supporting[1] ? args.supporting[1] : "key structure is present";
  return `Based on what I can retrieve today, I consider you a ${args.readinessLabel}. My confidence is ${scorePart} because ${supportA} and ${supportB}, but ${args.primaryUncertainty}`;
}

function buildCompetitiveDeltaBullets(analysis: AnalysisResult, brand: string): CompetitiveDeltaBullet[] {
  const status = getAnalysisStatus(analysis);
  if (status !== "ok") return [];

  const ex = analysis.extracted;
  const breakdown = analysis.breakdown || [];
  const brandName = brand || ex.brandGuess || ex.domain || "this brand";
  const categoryLabel = pickCategoryLabel(ex);

  const answerabilityWeak = !ex.hasFAQ && !ex.hasDirectAnswerBlock;
  const schemaWeak = !ex.hasSchemaJsonLd;
  const h1Weak =
    !ex.h1s || ex.h1s.length === 0 || isBreakdownWeak(breakdown, "H1 describes product/category");
  const structureWeak =
    (ex.h2s || []).length < 3 ||
    isBreakdownWeak(breakdown, "Multiple H2 headings") ||
    isBreakdownWeak(breakdown, "Headings are descriptive");
  const trustWeak = !ex.hasContactSignals || !ex.hasAbout;

  const bullets: CompetitiveDeltaBullet[] = [];

  if (answerabilityWeak) {
    bullets.push({
      query: `What is ${brandName}?`,
      competitorAdvantage: "publish direct “What is X?” and “How does X work?” answers",
      whyLose: "FAQ or direct answer blocks are not visible in the snapshot, so AI must infer basics.",
    });
  }

  if (schemaWeak) {
    bullets.push({
      query: `Is ${brandName} a product or a service?`,
      competitorAdvantage: "explicitly declare their entity type via Schema.org",
      whyLose: "No Schema.org JSON-LD was detected in the HTML snapshot.",
    });
  }

  if (h1Weak) {
    bullets.push({
      query: `Which ${categoryLabel} should I choose?`,
      competitorAdvantage: "state their category in a single, literal sentence",
      whyLose: "The title/H1 does not plainly state the category in one sentence.",
    });
  }

  if (structureWeak) {
    bullets.push({
      query: `What does ${brandName} include?`,
      competitorAdvantage: "break offerings into scannable feature/use-case sections",
      whyLose: "Few descriptive H2 sections were detected, so structure is thin.",
    });
  }

  if (trustWeak) {
    bullets.push({
      query: "Is this a real company I can contact?",
      competitorAdvantage: "appear more verifiable as real businesses",
      whyLose: "About/Contact signals are limited or missing in the snapshot.",
    });
  }

  const limited = bullets.slice(0, 4);
  return limited.length >= 2 ? limited : [];
}

function pickCategoryLabel(extracted: AnalysisResult["extracted"]): string {
  if (extracted.h1s && extracted.h1s[0]) return extracted.h1s[0];
  if (extracted.h2s && extracted.h2s[0]) return extracted.h2s[0];
  if (extracted.brandGuess) return `${extracted.brandGuess} solution`;
  return "solution";
}

function isBreakdownWeak(breakdown: BreakdownItem[], label: string): boolean {
  const item = breakdown.find((b) => b.label === label);
  if (!item) return false;
  return item.points < item.max;
}

function generateConfidenceDebateBullets(
  analysis: AnalysisResult,
  brandName: string,
  status: AnalysisStatus
): string[] {
  const ex = analysis.extracted;
  const bullets: string[] = [];

  if (status === "blocked") {
    const statusCode = analysis.fetchDiagnostics?.status;
    bullets.push(
      `I could not retrieve ${brandName || "the homepage"}${
        statusCode ? ` (HTTP ${statusCode})` : ""
      }, so I cannot verify any signals to recommend you confidently.`
    );
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

function biggestGapCategoryFromBreakdown(breakdown: BreakdownItem[]): string {
  if (!breakdown || breakdown.length === 0) return "Other";
  const by: Record<string, { points: number; max: number }> = {};
  for (const item of breakdown) {
    const cat = item.category || "Other";
    if (cat === "Error") continue;
    if (!by[cat]) by[cat] = { points: 0, max: 0 };
    by[cat].points += item.points;
    by[cat].max += item.max;
  }
  const entries = Object.entries(by).filter(([, v]) => v.max > 0);
  if (entries.length === 0) return "Other";
  entries.sort((a, b) => a[1].points / a[1].max - b[1].points / b[1].max);
  return entries[0][0];
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

function mapSupportSignal(label: string): string {
  const map: Record<string, string> = {
    "Title includes brand/entity": "your title makes the entity explicit",
    "Meta description present": "your page summary is explicit",
    "H1 describes product/category": "your primary heading defines what you are",
    "H1 heading present": "a primary heading is present",
    "Multiple H2 headings": "your section structure is retrievable",
    "Headings are descriptive": "your headings are descriptive",
    "FAQ section present": "direct Q&A is retrievable",
    "Schema.org markup": "structured entity data is retrievable",
    "About page linked": "legitimacy context is retrievable",
    "Contact info present": "contact legitimacy is retrievable",
    "Pricing/plans visible": "commercial terms are retrievable",
  };
  return map[label] || label;
}

function compactSentence(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  return t.length > 180 ? `${t.slice(0, 177)}...` : t;
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const key = (v || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
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

  const category = mapFixToCategory(fix.action);
  const change = whatChangesIfFixed(category, props.brandName);
  const remains = whatRemainsIfNotFixed(category, props.brandName);

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-5 bg-white dark:bg-stone-900">
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
    </div>
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

function NoCriticalFixesDetected() {
  return (
    <div className="mt-6 border border-stone-200 dark:border-stone-800 rounded-lg p-5 bg-stone-50 dark:bg-stone-900">
      <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-2">
        No Critical Fixes Detected
      </h3>
      <p className="text-sm text-stone-700 dark:text-stone-300">
        Your site already provides strong default-answer signals. Remaining improvements are marginal and
        unlikely to materially change AI recommendations.
      </p>
    </div>
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
          <div key={prompt.id} className="border border-stone-200 dark:border-stone-700 rounded overflow-hidden">
            <div className="bg-stone-100 dark:bg-stone-800 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <code className="text-sm text-stone-800 dark:text-stone-200 break-words">
                  {prompt.template}
                </code>
                <CopyButton text={prompt.template} />
              </div>
              <p className="text-xs text-stone-500 mt-1">{prompt.description}</p>
            </div>
            <div className="bg-stone-50 dark:bg-stone-900 px-4 py-3 border-t border-stone-200 dark:border-stone-700">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">LLM Output</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 italic">
                [Copy prompt above and paste into ChatGPT/Claude to see results]
              </p>
            </div>
          </div>
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
