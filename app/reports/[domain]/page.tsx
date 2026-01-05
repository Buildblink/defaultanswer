import { notFound, redirect } from "next/navigation";
import { fetchReportByDomain } from "@/lib/report/history";
import type { AnalysisResult } from "@/lib/defaultanswer/scoring";
import type { Metadata } from "next";

// Import the existing report page component
// We'll reuse the rendering logic from the existing route
import ReportPageContent from "@/app/(reports)/defaultanswer/report/[reportId]/page";

type Props = {
  params: Promise<{ domain: string }>;
};

// Curated example reports that should be indexed
const INDEXED_REPORTS = [
  'defaultanswer.com',
  // Add more curated examples here:
  // 'otterly.ai',
  // 'hubspot.com',
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  const storedReport = await fetchReportByDomain(domain, null);

  if (!storedReport) {
    return {};
  }

  const analysis = storedReport.analysis_data as AnalysisResult;
  const score = analysis?.score || 0;
  const isIndexed = INDEXED_REPORTS.includes(domain);

  const baseMetadata: Metadata = {
    title: `${domain} - AI Recommendation Readiness Report | DefaultAnswer`,
    description: `Comprehensive analysis of ${domain}'s AI recommendation readiness. Score: ${score}/100.`,
  };

  // Only indexed (curated) reports get indexed by search engines
  if (!isIndexed) {
    baseMetadata.robots = {
      index: false,
      follow: false,
    };
  } else {
    baseMetadata.alternates = {
      canonical: `https://www.defaultanswer.com/reports/${domain}`,
    };
    baseMetadata.openGraph = {
      title: `${domain} - AI Recommendation Readiness Report`,
      description: `Comprehensive analysis of ${domain}'s AI recommendation readiness. Score: ${score}/100.`,
      type: "article",
      images: ["/og.png"],
      url: `https://www.defaultanswer.com/reports/${domain}`,
    };
    baseMetadata.twitter = {
      card: "summary_large_image",
      images: ["/og.png"],
    };
  }

  return baseMetadata;
}

export default async function CleanReportPage({ params }: Props) {
  const { domain } = await params;

  // Fetch the stored report
  const storedReport = await fetchReportByDomain(domain, null);

  if (!storedReport) {
    // No report found for this domain
    notFound();
  }

  // Extract analysis data
  const analysis = storedReport.analysis_data as AnalysisResult;

  // Encode the analysis data for the existing report page
  const encodedData = Buffer.from(JSON.stringify(analysis)).toString("base64");

  // Redirect to the existing report page with the data
  // This maintains backwards compatibility with the existing rendering logic
  redirect(
    `/defaultanswer/report/${storedReport.report_id}?url=${encodeURIComponent(
      storedReport.url
    )}&data=${encodeURIComponent(encodedData)}`
  );
}
