import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

const siteUrl = "https://www.defaultanswer.com";

export const metadata: Metadata = {
  title: "Analyze Your Website | DefaultAnswer",
  description: "Check if your website is ready to be recommended by AI assistants like ChatGPT, Claude, and Perplexity. Free AI recommendation readiness analysis.",
  alternates: {
    canonical: `${siteUrl}/defaultanswer`,
  },
  openGraph: {
    title: "Analyze Your Website | DefaultAnswer",
    description: "Check if your website is ready to be recommended by AI assistants. Free AI recommendation readiness analysis.",
    type: "website",
    images: ["/og.png"],
    url: `${siteUrl}/defaultanswer`,
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function DefaultAnswerPage() {
  return <LandingPage mode="analyze" />;
}
