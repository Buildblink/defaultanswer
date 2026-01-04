import { notFound, redirect } from "next/navigation";
import { fetchReportByDomain } from "@/lib/report/history";
import type { AnalysisResult } from "@/lib/defaultanswer/scoring";

// Import the existing report page component
// We'll reuse the rendering logic from the existing route
import ReportPageContent from "@/app/(reports)/defaultanswer/report/[reportId]/page";

type Props = {
  params: Promise<{ domain: string }>;
};

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
