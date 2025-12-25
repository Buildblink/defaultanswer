import { LandingLayout } from "./LandingLayout";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { SampleReportPreview } from "./SampleReportPreview";
import { BuiltFor } from "./BuiltFor";
import { WhoItsFor } from "./WhoItsFor";
import { FAQ } from "./FAQ";
import { ProofSection } from "./ProofSection";
import { BottomCta } from "./BottomCta";
import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";
import { Card } from "@/app/(landing)/ui/Card";

type LandingMode = "home" | "analyze";

type LandingPageProps = {
  mode?: LandingMode;
};

type HeroContent = {
  intro: {
    label?: string;
    description: string;
    note?: string;
  };
  title: string;
  lead?: string;
  subtitle: string;
  ctaLabel: string;
  ctaLoadingLabel?: string;
  showCompareLink?: boolean;
  helperText?: string;
  secondaryLabel?: string;
  formEyebrow?: string;
};

export function LandingPage({ mode = "home" }: LandingPageProps) {
  const definition =
    "DefaultAnswer is a diagnostic tool that evaluates whether an AI assistant could confidently recommend a website as the default answer to a user question. It uses observable, retrievable on-page signals to produce a structured assessment.";

  const structuredData =
    mode === "home"
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "DefaultAnswer",
              url: "https://www.defaultanswer.com",
              description: definition,
            },
            {
              "@type": "Service",
              name: "DefaultAnswer",
              url: "https://www.defaultanswer.com",
              description: definition,
              provider: {
                "@type": "Organization",
                name: "DefaultAnswer",
                url: "https://www.defaultanswer.com",
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is DefaultAnswer?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: definition,
                  },
                },
                {
                  "@type": "Question",
                  name: "Who is DefaultAnswer for?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer is for SaaS founders, product teams, and agencies who need to understand why AI systems hesitate to cite a site. It is also for sites that rank but are not recommended by AI assistants.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How does DefaultAnswer work?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer captures a snapshot of visible on-page content and evaluates it with deterministic checks. It maps findings to specific signals so recommendations are auditable and repeatable.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What does DefaultAnswer measure?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer measures entity clarity, answerability, commercial clarity, trust and legitimacy, and accessibility and retrievability. These categories reflect whether an AI system can describe, quote, and justify a site as a source.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What does DefaultAnswer not measure?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer does not measure rankings, traffic, or backlinks. It does not use probabilistic scoring or proprietary model internals, and it does not claim performance outcomes.",
                  },
                },
              ],
            },
          ],
        }
      : undefined;

  const heroContent: HeroContent =
    mode === "home"
      ? {
          intro: {
            label: "WHAT DEFAULTANSWER IS",
            description:
              "DefaultAnswer analyzes whether AI systems can confidently recommend your website as the default answer to user questions.",
            note: "This is not SEO. It does not measure rankings, traffic, or backlinks.",
          },
          title: "How AI decides which websites to recommend",
          lead: "Run a fast audit to see whether an AI assistant could confidently cite your site ƒ?\" and what to fix first.",
          subtitle:
            "DefaultAnswer evaluates whether an AI system can identify, trust, and recommend your website by checking that on-page signals are retrievable, unambiguous, and usable inside an answer.",
          ctaLabel: "Analyze a website",
          helperText:
            "DefaultAnswer is a diagnostic tool that measures AI recommendation readiness using retrievable, on-page signals.",
          secondaryLabel: "Read methodology",
        }
      : {
          intro: {
            label: undefined,
            description:
              "Enter your URL to see whether AI systems can confidently recommend your website.",
          },
          title: "Is AI Recommending You?",
          subtitle:
            "Enter your URL - get a scored report showing if ChatGPT, Claude, and Perplexity consider you the default answer - plus fixes to improve.",
          ctaLabel: "Run Your Default Score",
          ctaLoadingLabel: "Analyzing...",
          helperText: "Want to compare vs a competitor?",
          showCompareLink: true,
          formEyebrow: "DefaultAnswer Analysis",
        };

  const bottomCtaContent =
    mode === "home"
      ? {
          eyebrow: "Ready to run a scan?",
          title: "Run your DefaultAnswer report",
          body: "Enter a URL and see the full diagnostic report in minutes.",
          linkLabel: "Start a report",
          linkUrl: "/defaultanswer",
        }
      : {
          eyebrow: "Ready to run a scan?",
          title: "Run your DefaultAnswer report",
          body: "Enter a URL and see the full diagnostic report in minutes.",
          linkLabel: "Start a report",
          linkUrl: "#top",
        };

  return (
    <LandingLayout structuredData={structuredData}>
      <Hero
        mode={mode}
        title={heroContent.title}
        lead={heroContent.lead}
        subtitle={heroContent.subtitle}
        intro={heroContent.intro}
        ctaLabel={heroContent.ctaLabel}
        ctaLoadingLabel={heroContent.ctaLoadingLabel}
        showCompareLink={heroContent.showCompareLink}
        helperText={heroContent.helperText}
        secondaryLabel={heroContent.secondaryLabel}
        formEyebrow={heroContent.formEyebrow}
      />

      <HowItWorks
        title="Why AI systems hesitate to recommend websites"
        subtitle="These are the most common confidence gaps we see when AI systems decide whether to cite a website."
        items={[
          {
            title: "Identify",
            description:
              "AI cannot confidently describe what you are, who you are for, or how to categorize you.",
            pills: ["Entity definition", "Category clarity", "Page titles"],
          },
          {
            title: "Answer",
            description:
              "AI finds your site but cannot extract direct answers to common questions.",
            pills: ["FAQ blocks", "Pricing clarity", "Answerable text"],
          },
          {
            title: "Trust",
            description:
              "AI cannot justify citing you due to missing legitimacy or access signals.",
            pills: ["Schema.org", "Contact signals", "Access errors (403/429)"],
          },
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <SectionTitle
          eyebrow="Why this exists"
          title="AI recommendations are not search rankings"
          subtitle="Being crawled does not guarantee being mentioned. If your website is unclear, hard to retrieve, or hard to quote, an AI assistant will choose another source."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card title="AI chooses answers">
            When users ask an AI assistant a question, it responds with one or a few answers. Your site must be usable
            as a source, not just discoverable.
          </Card>
          <Card title="Clarity beats crawling">
            Many sites are accessible but still not recommended because their entity, offering, or answers are
            ambiguous.
          </Card>
          <Card title="Evidence-first evaluation">
            DefaultAnswer uses retrievable on-page signals to explain what is missing and what to fix first without
            black-box metrics.
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <SectionTitle
          eyebrow="Signals"
          title="What determines whether AI will recommend your site"
          subtitle="These categories map to whether an AI system can confidently use your site as a source."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Entity clarity">
            Can an AI determine what you are, who you are for, and what you offer from titles, headings, and
            definitions?
          </Card>
          <Card title="Answerability signals">
            Are there direct, extractable answers to common questions through definitions, explanations, or FAQ-style
            content?
          </Card>
          <Card title="Commercial clarity">
            If you sell something, can an AI see the offering and the plan or pricing context without guessing?
          </Card>
          <Card title="Trust and legitimacy">
            Are there accountability signals such as About or Company context and contact routes that increase
            recommendation confidence?
          </Card>
          <Card title="Accessibility and retrievability">
            Can the page be fetched and read reliably, with stable status codes and visible content for citation?
          </Card>
        </div>
      </section>

      <SampleReportPreview
        title="What an AI recommendation audit actually shows"
        subtitle="A structured excerpt from the deterministic report."
        report={{
          scoreLabel: "Default Answer Score (TM)",
          score: "67/100",
          readinessLabel: "Readiness",
          readinessValue: "Emerging Option",
          gaps: [
            "No FAQ-style answer blocks for common questions",
            "Unclear pricing or plan visibility",
            "Weak definition of who it is for on page",
          ],
          quickWins: [
            "Add 5-7 Q&A blocks on the homepage or /faq",
            "Add JSON-LD schema for Organization and Product or Service",
            "Add a short \"What we do\" definition above the fold",
          ],
          changeNote: "What changed since last scan: +6 points (schema markup detected)",
        }}
        sideCards={[
          {
            title: "Deterministic and repeatable",
            body: "The same input snapshot produces the same outputs, keeping reports consistent and comparable over time.",
          },
          {
            title: "Designed to be cite-able",
            body: "Reports use stable vocabulary and explicit structure so AI systems can reference them directly.",
          },
          {
            title: "Built for comparison and monitoring",
            body: "Compare two sites side by side. Track what changed across scans. Focus on the signals that limit confidence.",
          },
        ]}
      />

      <BuiltFor
        eyebrow="Cite-able"
        title="Built so AI can safely cite you"
        subtitle="Stable vocabulary, deterministic outputs, and structured evidence keep recommendations auditable."
        cards={[
          {
            title: "Consistent vocabulary",
            body: "Terms and labels stay stable so the same concepts are referenced the same way across scans.",
          },
          {
            title: "Deterministic outputs",
            body: "The process uses repeatable checks, keeping changes attributable to page updates, not random drift.",
          },
          {
            title: "Structured evidence",
            body: "Findings map to retrievable on-page signals, making citations straightforward for humans and AI.",
          },
        ]}
        note="This consistency allows AI systems to reference DefaultAnswer findings without reinterpretation."
      />

      <WhoItsFor
        title="Who DefaultAnswer is for"
        leftTitle="For"
        leftItems={[
          "SaaS founders and product teams",
          "Agencies advising on AI visibility",
          "Sites that rank but are not recommended by AI",
        ]}
        rightTitle="Not for"
        rightItems={[
          "Keyword ranking optimization",
          "Backlink analysis",
          "Traffic growth tactics",
        ]}
      />

      <FAQ
        title="FAQ"
        items={[
          { question: "What is DefaultAnswer?", answer: [definition] },
          {
            question: "Who is DefaultAnswer for?",
            answer: [
              "DefaultAnswer is for SaaS founders, product teams, and agencies who need to understand why AI systems hesitate to cite a site.",
              "It is also for sites that rank but are not recommended by AI assistants.",
            ],
          },
          {
            question: "How does DefaultAnswer work?",
            answer: [
              "DefaultAnswer captures a snapshot of visible on-page content and evaluates it with deterministic checks.",
              "It maps findings to specific signals so recommendations are auditable and repeatable.",
            ],
          },
          {
            question: "What does DefaultAnswer measure?",
            answer: [
              "DefaultAnswer measures entity clarity, answerability, commercial clarity, trust and legitimacy, and accessibility and retrievability.",
              "These categories reflect whether an AI system can describe, quote, and justify a site as a source.",
            ],
          },
          {
            question: "What does DefaultAnswer not measure?",
            answer: [
              "DefaultAnswer does not measure rankings, traffic, or backlinks.",
              "It does not use probabilistic scoring or proprietary model internals, and it does not claim performance outcomes.",
            ],
          },
        ]}
      />

      {mode === "home" ? (
        <ProofSection
          title="We ran DefaultAnswer on DefaultAnswer"
          body="We applied the same diagnostic checks to our own site. The report reflects the signals AI systems can currently retrieve."
          bullets={[
            "Strong Default Candidate (85/100)",
            "Clear entity and answerability signals",
            "No critical fixes detected",
          ]}
          linkLabel="View the report"
          linkUrl="/reports/defaultanswer.com"
        />
      ) : null}

      <BottomCta
        eyebrow={bottomCtaContent.eyebrow}
        title={bottomCtaContent.title}
        body={bottomCtaContent.body}
        linkLabel={bottomCtaContent.linkLabel}
        linkUrl={bottomCtaContent.linkUrl}
      />
    </LandingLayout>
  );
}
