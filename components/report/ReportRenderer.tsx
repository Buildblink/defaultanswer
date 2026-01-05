import type { ReactNode } from "react";
import type { AnalysisResult } from "@/lib/defaultanswer/scoring";
import type { ReportData } from "@/lib/defaultanswer/report-to-markdown";
import { buildReportV2, type ReportV2 } from "@/lib/report/report-v2";
import { Card } from "@/app/(landing)/ui/Card";
import { Pill } from "@/app/(landing)/ui/Pill";
import { CopyButton } from "@/app/(reports)/defaultanswer/report/[reportId]/copy-button";
import { LiveProofPanel } from "@/components/report/LiveProofPanel";
import { MentionCheckPanel } from "@/components/report/MentionCheckPanel";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { ColdSummarySection } from "@/components/report/ColdSummarySection";
import type { ColdSummaryExistingSignals, ColdSummarySnapshot } from "@/lib/defaultanswer/cold-summary";

type ReportRendererProps = {
  reportData: ReportData;
  analysis?: AnalysisResult;
  entitlements?: { isPro: boolean };
  contextFlags?: { isExample?: boolean; hideCTA?: boolean; hideHistory?: boolean };
  disclosure?: { title: string; text: string };
  children: (args: { reportV2?: ReportV2 }) => ReactNode;
};

export function ReportRenderer({ reportData, analysis, children }: ReportRendererProps) {
  const reportV2 =
    reportData.reportV2 ??
    (analysis
      ? buildReportV2(analysis, {
          maxBullets: 6,
          promptCountPerBucket: 3,
          includeSimulatedAiProof: true,
          includeCitationReadiness: true,
          includeImplementationExamples: true,
          includeQuoteReady: true,
        })
      : undefined);
  return <>{children({ reportV2 })}</>;
}

export function ReportRightNowSection({ reportV2 }: { reportV2?: ReportV2 }) {
  if (!reportV2) return null;
  return (
    <CollapsibleSection id="right-now" title="Right now" defaultOpen>
      <Card>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              You would be recommended for
            </div>
            <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
              {reportV2.rightNow.recommended.length > 0 ? (
                reportV2.rightNow.recommended.map((prompt) => <li key={prompt}>{prompt}</li>)
              ) : (
                <li>No prompts confidently recommend you yet.</li>
              )}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              You would be skipped for
            </div>
            <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
              {reportV2.rightNow.skipped.length > 0 ? (
                reportV2.rightNow.skipped.map((prompt) => <li key={prompt}>{prompt}</li>)
              ) : (
                <li>No prompts confidently skip you yet.</li>
              )}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
          {reportV2.rightNow.reason}
        </p>
      </Card>
    </CollapsibleSection>
  );
}

export function ReportV2Sections({
  reportV2,
  reportId,
  evaluatedUrl,
  brandName,
  domain,
  defaultModel,
  categoryLabel,
  defaultLiveProofCategory,
  coldSummarySnapshot,
  coldSummaryExistingSignals,
  aiEnabled,
}: {
  reportV2?: ReportV2;
  reportId: string;
  evaluatedUrl: string;
  brandName: string;
  domain: string;
  defaultModel: string;
  categoryLabel: string;
  defaultLiveProofCategory: string;
  coldSummarySnapshot?: ColdSummarySnapshot;
  coldSummaryExistingSignals?: ColdSummaryExistingSignals;
  aiEnabled: boolean;
}) {
  if (!reportV2) return null;

  const primaryBlocker = reportV2.aiProof[0]?.primaryBlocker;
  const mentionStatus =
    reportV2.aiProof[0]?.mentionsYou === undefined
      ? "Mentioned: Unknown"
      : `Mentioned: ${reportV2.aiProof[0].mentionsYou ? "Yes" : "No"}`;

  return (
    <>
      {/* Cold AI understanding */}
      <CollapsibleSection
        id="cold-ai-summary"
        title="Cold AI understanding (zero-context test)"
        subtitle="How a model describes your site with no memory, no browsing, and no hints."
      >
        <ColdSummarySection
          reportId={reportId}
          evaluatedUrl={evaluatedUrl}
          model={defaultModel}
          snapshot={coldSummarySnapshot}
          existingSignals={coldSummaryExistingSignals}
          aiEnabled={aiEnabled}
        />
      </CollapsibleSection>

      {/* Share-ready summary */}
      <CollapsibleSection title="Share-ready summary">
        <Card>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Executive summary
                </div>
                <CopyButton text={reportV2.sharePack.execSummary} />
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{reportV2.sharePack.execSummary}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Quote pack
                </div>
                <CopyButton text={reportV2.sharePack.quotePack} />
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{reportV2.sharePack.quotePack}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Fix checklist
                </div>
                <CopyButton text={reportV2.sharePack.fixChecklist} />
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{reportV2.sharePack.fixChecklist}
              </pre>
            </div>
          </div>
        </Card>
      </CollapsibleSection>

      {/* 1) Live proof mention check */}
      {reportV2.aiProof.length > 0 && (
        <CollapsibleSection
          id="live-proof"
          title="Live Proof (Mention Check)"
          subtitle="Run real-model prompts and detect whether the brand is actually mentioned."
          badgeRow={<Pill>{mentionStatus}</Pill>}
        >
          <div className="mt-4">
            <MentionCheckPanel
              brand={brandName}
              domain={domain}
              defaultCategory={defaultLiveProofCategory || categoryLabel}
              defaultModel={defaultModel}
              aiEnabled={aiEnabled}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* 2) Visibility Analysis - replaces "What AI recommends instead" */}
      <section id="visibility-gaps" className="mb-10 scroll-mt-28">
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
          <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
            Why monitoring tools show low visibility
          </h3>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Based on actual gaps detected in your current snapshot
          </p>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Primary blocker:
            </span>
            <Pill>{reportV2.visibilityAnalysis.primaryBlocker}</Pill>
          </div>

          {/* Signal detection summary */}
          <div className="mt-6 rounded-lg bg-stone-50 p-4 dark:bg-stone-900/40">
            <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Signal Detection Summary
            </h4>
            <div className="mt-3 space-y-2 text-xs text-stone-600 dark:text-stone-400">
              <SignalDetectionStatus
                signal="Pricing"
                found={reportV2.analysis.extracted.hasPricing}
                evidence={reportV2.analysis.extracted.evidence?.pricingEvidence}
              />
              <SignalDetectionStatus
                signal="FAQ"
                found={reportV2.analysis.extracted.hasFAQ}
                evidence={reportV2.analysis.extracted.evidence?.faqEvidence?.indirectFaqLinks}
              />
              <SignalDetectionStatus
                signal="Contact"
                found={reportV2.analysis.extracted.hasContactSignals}
                evidence={reportV2.analysis.extracted.evidence?.contactEvidence}
              />
              <SignalDetectionStatus
                signal="About"
                found={reportV2.analysis.extracted.hasAbout}
                evidence={reportV2.analysis.extracted.evidence?.aboutEvidence}
              />
              <SignalDetectionStatus
                signal="Schema"
                found={reportV2.analysis.extracted.hasSchemaJsonLd}
                evidence={reportV2.analysis.extracted.evidence?.schemaTypes}
              />
            </div>
          </div>

          {reportV2.visibilityAnalysis.gaps.length > 0 && (
            <div className="mt-6 space-y-4">
              {reportV2.visibilityAnalysis.gaps.map((gap) => (
                <Card key={gap.category}>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                      {gap.category}
                    </h4>
                    <SeverityBadge level={gap.severity} />
                  </div>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                    <span className="font-medium">Missing:</span> {gap.signal}
                  </p>
                  <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
                    {gap.impact}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {reportV2.visibilityAnalysis.competitors.length > 0 && (
            <div className="mt-6">
              <Card>
                <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Who appears in monitoring tools instead
                </h4>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {reportV2.visibilityAnalysis.competitors.map((comp) => (
                    <li key={comp}>{comp}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-900/20">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Next step to improve visibility
            </h4>
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
              {reportV2.visibilityAnalysis.fixRecommendation}
            </p>
          </div>
        </div>
      </section>

      {/* 2) Reasoning simulation */}
      {reportV2.reasoning.steps.length > 0 && (
        <CollapsibleSection id="reasoning" title="How AI reasoned through this decision">
          <Card>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Reasoning steps</div>
                <ol className="mt-3 list-decimal list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {reportV2.reasoning.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Confidence breaks down because
                </div>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {reportV2.reasoning.confidenceBreakdown.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </CollapsibleSection>
      )}

      {/* 3) Retrieve vs infer */}
      {(reportV2.retrieveVsInfer.retrievable.length > 0 || reportV2.retrieveVsInfer.inferred.length > 0) && (
        <CollapsibleSection id="retrieve-vs-guess" title="What AI can retrieve vs what it has to guess">
          <Card>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {reportV2.retrieveVsInfer.explanation}
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Retrievable</div>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {reportV2.retrieveVsInfer.retrievable.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Inferred</div>
                <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  {reportV2.retrieveVsInfer.inferred.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </CollapsibleSection>
      )}

      {/* 4) Evidence coverage */}
      <CollapsibleSection
        id="coverage"
        title="Evidence coverage (how much AI can actually use)"
        badgeRow={<Pill>Coverage: {reportV2.coverage.overall}</Pill>}
      >
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Coverage</div>
              <div className="mt-1 text-3xl font-semibold text-stone-900 dark:text-stone-100">
                {reportV2.coverage.overall}
              </div>
            </div>
            <div className="text-sm text-stone-500 dark:text-stone-400">out of 100</div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-2 rounded-full bg-amber-500"
              style={{ width: `${reportV2.coverage.overall}%` }}
            />
          </div>
          <div className="mt-4 space-y-2 text-sm text-stone-700 dark:text-stone-300">
            <div className="flex items-center justify-between">
              <span>Structure coverage</span>
              <span className="font-semibold">{reportV2.coverage.structure}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Answer coverage</span>
              <span className="font-semibold">{reportV2.coverage.answer}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Entity coverage</span>
              <span className="font-semibold">{reportV2.coverage.entity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Commercial coverage</span>
              <span className="font-semibold">{reportV2.coverage.commercial}</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
            {reportV2.coverage.nextMove}
          </p>
        </Card>
      </CollapsibleSection>

      {/* 5) Competitive snapshot */}
      {reportV2.competitiveSnapshot.rows.length > 0 && (
        <CollapsibleSection id="competitive" title="Competitive positioning snapshot">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800">
                    <th className="py-2 pr-4">Option</th>
                    <th className="py-2 pr-4">Answer clarity</th>
                    <th className="py-2 pr-4">Commercial clarity</th>
                    <th className="py-2 pr-4">Justification ease</th>
                    <th className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {reportV2.competitiveSnapshot.rows.map((row) => (
                    <tr key={row.label} className="border-b border-stone-100 dark:border-stone-900">
                      <td className="py-3 pr-4 font-semibold">{row.label}</td>
                      <td className="py-3 pr-4"><StatusPill level={row.answerClarity} /></td>
                      <td className="py-3 pr-4"><StatusPill level={row.commercialClarity} /></td>
                      <td className="py-3 pr-4"><StatusPill level={row.justificationEase} /></td>
                      <td className="py-3 text-stone-600 dark:text-stone-400">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </CollapsibleSection>
      )}

      {/* 6) Prompt radar */}
      {(reportV2.promptRadar.winnableNow.length > 0 ||
        reportV2.promptRadar.oneFixAway.length > 0 ||
        reportV2.promptRadar.blocked.length > 0) && (
        <CollapsibleSection id="win-queries" title="Questions you can win, and where you're blocked">
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Winnable now</div>
              <ul className="mt-3 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                {reportV2.promptRadar.winnableNow.map((item) => (
                  <li key={item.prompt}>
                    <p className="font-semibold">{item.prompt}</p>
                    <p className="text-stone-500 dark:text-stone-400">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">One fix away</div>
              <ul className="mt-3 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                {reportV2.promptRadar.oneFixAway.map((item) => (
                  <li key={item.prompt}>
                    <p className="font-semibold">{item.prompt}</p>
                    <p className="text-stone-500 dark:text-stone-400">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Blocked</div>
              <ul className="mt-3 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                {reportV2.promptRadar.blocked.map((item) => (
                  <li key={item.prompt}>
                    <p className="font-semibold">{item.prompt}</p>
                    <p className="text-stone-500 dark:text-stone-400">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </CollapsibleSection>
      )}

      {/* 7) Implementation examples */}
      <CollapsibleSection id="examples" title={'What "good" looks like (copy/paste examples)'}>
        <div className="mt-4 space-y-4">
          <Card>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">FAQ examples</div>
            <div className="mt-3 space-y-3 text-sm text-stone-700 dark:text-stone-300">
              {reportV2.implementationExamples.faqs.map((faq) => (
                <div key={faq.q}>
                  <p className="font-semibold">{faq.q}</p>
                  <p className="text-stone-600 dark:text-stone-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Schema snippet</div>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{JSON.stringify(reportV2.implementationExamples.schemaSnippetJson, null, 2)}
            </pre>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Pricing clarity</div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Before</div>
                <p className="mt-2">{reportV2.implementationExamples.pricingClarity.before}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">After</div>
                <p className="mt-2">{reportV2.implementationExamples.pricingClarity.after}</p>
              </div>
            </div>
          </Card>
        </div>
      </CollapsibleSection>

      {/* 8) Quote-ready copy */}
      {reportV2.quoteReady.length > 0 && (
        <CollapsibleSection id="quote-ready" title="Quote-ready copy you can paste today">
          <div className="mt-4 space-y-4">
            {reportV2.quoteReady.map((item) => (
              <Card key={item.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{item.copy}</p>
                  </div>
                  <CopyButton text={item.copy} />
                </div>
                <div className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                  Placement: {item.placement}
                </div>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{item.why}</p>
              </Card>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* 9) Citation readiness */}
      <CollapsibleSection id="citation" title="Citation readiness">
        <Card>
          <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Citable sentences</div>
          <ul className="mt-3 space-y-2 text-sm text-stone-700 dark:text-stone-300">
            {reportV2.citationReadiness.citableSentences.map((sentence) => (
              <li key={sentence} className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-900">
                {sentence}
              </li>
            ))}
          </ul>
          <div className="mt-4 text-sm font-semibold text-stone-800 dark:text-stone-200">Why these are citable</div>
          <ul className="mt-3 list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
            {reportV2.citationReadiness.whyCitable.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </CollapsibleSection>
    </>
  );
}

function StatusPill({ level }: { level: "Low" | "Medium" | "High" }) {
  const className =
    level === "High"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : level === "Medium"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
  return <span className={`inline-flex rounded-xl px-2 py-0.5 text-xs font-semibold ${className}`}>{level}</span>;
}

function SeverityBadge({ level }: { level: "critical" | "high" | "medium" | "low" }) {
  const className =
    level === "critical"
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
      : level === "high"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200"
      : level === "medium"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-stone-100 text-stone-700 dark:bg-stone-800/40 dark:text-stone-300";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {level}
    </span>
  );
}

function SignalDetectionStatus({
  signal,
  found,
  evidence
}: {
  signal: string;
  found: boolean;
  evidence?: string[]
}) {
  // Extract location from evidence
  let location = "Not detected on any scanned pages";

  if (found) {
    // If signal was found, try to extract location from evidence
    if (evidence && evidence.length > 0) {
      for (const item of evidence) {
        const match = item.match(/Found on: (.+)/i) || item.match(/FAQ found on: (.+)/i);
        if (match) {
          location = `Detected on: ${match[1]}`;
          break;
        }
      }
    }
    // If found but no location extracted from evidence, assume homepage
    if (location === "Not detected on any scanned pages") {
      location = "Detected on: Homepage";
    }
  }

  const icon = found ? "✓" : "✗";
  const iconColor = found ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-start gap-2">
      <span className={`${iconColor} font-bold`}>{icon}</span>
      <div className="flex-1">
        <span className="font-medium">{signal}:</span>{" "}
        <span className={found ? "text-stone-700 dark:text-stone-300" : "text-stone-500 dark:text-stone-500"}>
          {location}
        </span>
      </div>
    </div>
  );
}
