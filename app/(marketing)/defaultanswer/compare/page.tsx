import type { Metadata } from "next";
import CompareClient from "./compare-client";

const siteUrl = "https://www.defaultanswer.com";

export const metadata: Metadata = {
  title: "Compare Websites | DefaultAnswer",
  description: "Compare AI recommendation readiness across multiple websites. Side-by-side analysis of how different sites perform in AI assistant recommendations.",
  alternates: {
    canonical: `${siteUrl}/defaultanswer/compare`,
  },
  openGraph: {
    title: "Compare Websites | DefaultAnswer",
    description: "Compare AI recommendation readiness across multiple websites side-by-side.",
    type: "website",
    images: ["/og.png"],
    url: `${siteUrl}/defaultanswer/compare`,
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function ComparePage() {
  return <CompareClient />;
}

