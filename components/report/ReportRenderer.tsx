import type { ReactNode } from "react";
import type { AnalysisResult } from "@/lib/defaultanswer/scoring";
import type { ReportData } from "@/lib/defaultanswer/report-to-markdown";
import { buildReportV2, type ReportV2 } from "@/lib/report/report-v2";
import { Card } from "@/app/(landing)/ui/Card";
import { Pill } from "@/app/(landing)/ui/Pill";

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
}: {
  reportV2?: ReportV2;
}) {
  if (!reportV2) return null;

  return (
    <>
      {/* Visibility Analysis - Why monitoring tools show low visibility */}
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
