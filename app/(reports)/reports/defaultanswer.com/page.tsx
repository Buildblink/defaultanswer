import type { Metadata } from "next";
import ReportPage from "@/app/(reports)/defaultanswer/report/[reportId]/page";
import type { AnalysisResult, BreakdownItem, FixPlanItem, ReasoningBullet } from "@/lib/defaultanswer/scoring";
import report from "@/app/reports/data/defaultanswer.json";
import { exampleReportContext, type ExampleReportData } from "@/app/reports/example-report-context";

const exampleReport = report as ExampleReportData;

export const metadata: Metadata = {
  title: "DefaultAnswer Report — defaultanswer.com",
  alternates: {
    canonical: "/reports/defaultanswer.com",
  },
};
export const dynamic = "force-static";

function mapScoreBreakdownToItems(data: ExampleReportData): BreakdownItem[] {
  const categories: Array<[keyof ExampleReportData["scoreBreakdown"], string]> = [
    ["entityClarity", "Entity Clarity"],
    ["structuralComprehension", "Structural Comprehension"],
    ["answerabilitySignals", "Answerability Signals"],
    ["trustAndLegitimacy", "Trust & Legitimacy"],
    ["commercialClarity", "Commercial Clarity"],
  ];

  const items: BreakdownItem[] = [];
  for (const [key, label] of categories) {
    const group = data.scoreBreakdown[key];
    for (const check of group.checks) {
      items.push({
        label: check.label,
        points: check.score,
        max: check.max,
        reason: check.evidence,
        category: label,
      });
    }
  }
  return items;
}

function mapInterpretationToReasoning(data: ExampleReportData): ReasoningBullet[] {
  return data.aiInterpretation.map((item) => ({
    signal: item.category,
    interpretation: item.statement,
    impact: item.type === "strength" ? "positive" : item.type === "weakness" ? "negative" : "neutral",
  }));
}

function mapFixPlan(data: ExampleReportData): FixPlanItem[] {
  return data.fixPlan14Day.map((fix) => ({
    priority: fix.priority.toLowerCase() as FixPlanItem["priority"],
    action: fix.action,
  }));
}

function buildAnalysis(data: ExampleReportData): AnalysisResult {
  const breakdown = mapScoreBreakdownToItems(data);
  const reasoning = mapInterpretationToReasoning(data);
  const weaknesses = data.aiInterpretation
    .filter((item) => item.type === "weakness")
    .map((item) => item.statement);

  const schemaTypes = data.evidence.schemaTypes || [];
  const hasAbout = data.scoreBreakdown.trustAndLegitimacy.checks.some(
    (check) => check.label === "About page linked" && check.score > 0
  );
  const hasContact = data.scoreBreakdown.trustAndLegitimacy.checks.some(
    (check) => check.label === "Contact info present" && check.score > 0
  );
  const hasPricing = data.scoreBreakdown.commercialClarity.checks.some(
    (check) => check.label === "Pricing/plans visible" && check.score > 0
  );

  return {
    score: data.summary.score,
    breakdown,
    weaknesses,
    fixPlan: mapFixPlan(data),
    analysisStatus: "ok",
    reasoning,
    snapshotQuality: data.snapshotDiagnostics.snapshotQuality as AnalysisResult["snapshotQuality"],
    fetchDiagnostics: {
      requestedUrl: data.summary.url,
      status: data.snapshotDiagnostics.httpStatus,
      ok: data.snapshotDiagnostics.httpStatus >= 200 && data.snapshotDiagnostics.httpStatus < 400,
      contentType: data.snapshotDiagnostics.contentType,
      bytes: data.snapshotDiagnostics.bytesReceived,
    },
    extracted: {
      title: data.evidence.title,
      metaDescription: undefined,
      h1s: data.evidence.h1 ? [data.evidence.h1] : [],
      h2s: data.evidence.h2sFirstFive || [],
      h3s: [],
      hasFAQ: data.evidence.faqSignals.explicit,
      hasIndirectFAQ: data.evidence.faqSignals.indirectLinks > 0,
      hasDirectAnswerBlock: data.evidence.faqSignals.directAnswerSnippets > 0,
      hasSchema: schemaTypes.length > 0,
      hasSchemaJsonLd: schemaTypes.length > 0,
      schemaTypes,
      hasPricing,
      hasAbout,
      hasContact,
      hasContactSignals: hasContact,
      contactEvidence: data.evidence.contactEvidence ? [data.evidence.contactEvidence] : [],
      domain: data.metadata.domain,
      brandGuess: data.metadata.brandGuessed,
      evaluatedPage: data.metadata.pageEvaluated,
      evaluatedUrl: data.metadata.evaluatedUrl,
      fetchedAt: data.metadata.fetchTimestamp,
      evidence: {
        titleText: data.evidence.title,
        h1Text: data.evidence.h1,
        h2Texts: data.evidence.h2sFirstFive,
        schemaTypes,
        contactEvidence: data.evidence.contactEvidence ? [data.evidence.contactEvidence] : [],
        faqEvidence: {
          explicitFaqDetected: data.evidence.faqSignals.explicit,
          indirectFaqLinks: [],
          directAnswerSnippets: [],
        },
      },
    },
  };
}

export default async function ExampleReportPage() {
  const analysis = buildAnalysis(exampleReport);
  const reportId = exampleReport.metadata.reportId;
  const url = exampleReport.summary.url;
  const encodedData = Buffer.from(encodeURIComponent(JSON.stringify(analysis)), "utf8").toString("base64");

  return (
    <ReportPage
      params={Promise.resolve({ reportId })}
      searchParams={Promise.resolve({ url, data: encodedData })}
      exampleContext={exampleReportContext}
      exampleReport={exampleReport}
    />
  );
}
