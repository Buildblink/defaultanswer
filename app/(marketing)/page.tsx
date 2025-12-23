import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "DefaultAnswer - How AI decides which websites to recommend",
  description:
    "DefaultAnswer evaluates whether an AI system can clearly identify, trust, and recommend your website using retrievable, structured signals.",
  openGraph: {
    title: "DefaultAnswer - How AI decides which websites to recommend",
    description:
      "Measure AI recommendation readiness: entity clarity, answerability, commercial clarity, trust, and retrievability.",
    url: "https://defaultanswer.com",
    siteName: "DefaultAnswer",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage mode="home" />;
}
