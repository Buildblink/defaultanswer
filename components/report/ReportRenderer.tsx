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

export function ReportV2Sections({
  reportV2,
  reportId,
  isPro,
  evaluatedUrl,
  brandName,
  domain,
  defaultModel,
  categoryLabel,
  defaultLiveProofCategory,
  coldSummarySnapshot,
  coldSummaryExistingSignals,
}: {
  reportV2?: ReportV2;
  reportId: string;
  isPro: boolean;
  evaluatedUrl: string;
  brandName: string;
  domain: string;
  defaultModel: string;
  categoryLabel: string;
  defaultLiveProofCategory: string;
  coldSummarySnapshot?: ColdSummarySnapshot;
  coldSummaryExistingSignals?: ColdSummaryExistingSignals;
}) {
  if (!reportV2) return null;

  const primaryBlocker = reportV2.aiProof[0]?.primaryBlocker;
  const mentionStatus =
    reportV2.aiProof[0]?.mentionsYou === undefined
      ? "Mentioned: Unknown"
      : `Mentioned: ${reportV2.aiProof[0].mentionsYou ? "Yes" : "No"}`;

  return (
    <>
      {/* Right now */}
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
          defaultOpen
          badgeRow={<Pill>{mentionStatus}</Pill>}
        >
          <div className="mt-4">
            <MentionCheckPanel
              isPro={isPro}
              brand={brandName}
              domain={domain}
              defaultCategory={defaultLiveProofCategory || categoryLabel}
              defaultModel={defaultModel}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* 2) What AI recommends instead */}
      {reportV2.aiProof.length > 0 && (
        <CollapsibleSection
          id="ai-proof"
          title="What AI recommends instead of you (Simulated)"
          subtitle="Simulated examples based on retrievable signals in this snapshot."
          badgeRow={primaryBlocker ? <Pill>Primary blocker: {primaryBlocker}</Pill> : undefined}
        >
          <div className="mt-4">
            <LiveProofPanel isPro={isPro} evaluatedUrl={evaluatedUrl} prompts={reportV2.aiProof.map((p) => p.prompt)} />
          </div>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Simulated examples to illustrate observable behavior. For real model outputs, enable Live Proof in settings.
          </p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Model-free verdicts below approximate citation readiness without model calls.
          </p>
          <div className="mt-4 space-y-4">
            {reportV2.aiProof.map((proof, idx) => (
              <Card key={`${proof.modelLabel}-${idx}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {proof.modelLabel}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
                  <span>Prompt</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      proof.verdict === "would-mention"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                    }`}
                  >
                    {proof.verdict === "would-mention" ? "Would mention" : "Would skip"}
                  </span>
                  <span className="text-xs font-normal text-stone-500 dark:text-stone-400">
                    {proof.confidence}% confidence
                  </span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{proof.prompt}
                </pre>
                <div className="mt-3 text-sm font-semibold text-stone-800 dark:text-stone-200">Simulated response</div>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-800 dark:bg-stone-900 dark:text-stone-200">
{proof.response}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  {proof.recommended.map((label) => (
                    <Pill key={label}>{label}</Pill>
                  ))}
                </div>
                <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                  {proof.mentionsYou
                    ? "You are mentioned as a viable option in this simulated answer."
                    : `You are not mentioned. ${proof.skipReason || ""}`.trim()}
                </p>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  So what: {proof.soWhat}
                </p>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                  Primary blocker: {proof.primaryBlocker}
                </p>
              </Card>
            ))}
          </div>
        </CollapsibleSection>
      )}

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
