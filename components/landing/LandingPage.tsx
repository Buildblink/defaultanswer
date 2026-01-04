import { LandingLayout } from "./LandingLayout";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { SampleReportPreview } from "./SampleReportPreview";
import { BuiltFor } from "./BuiltFor";
import { WhoItsFor } from "./WhoItsFor";
import { Definitions } from "./Definitions";
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
    "DefaultAnswer analyzes whether AI systems can confidently recommend your website as the default answer to user questions.";

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
                    text: `${definition} It does not measure rankings, traffic, or backlinks.`,
                  },
                },
                {
                  "@type": "Question",
                  name: "Who is DefaultAnswer for?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer is for SaaS founders, product teams, and agencies advising on AI visibility. It is also for sites that rank but are not recommended by AI assistants.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How does DefaultAnswer work?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer captures a snapshot of visible on-page content and evaluates it with deterministic checks. The report explains which signals block AI citation confidence.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What does DefaultAnswer measure?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer measures entity clarity, answerability signals, commercial clarity, trust and legitimacy, and accessibility and retrievability.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What does DefaultAnswer not measure?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "DefaultAnswer does not measure rankings, traffic, or backlinks. It is not an SEO or keyword tool.",
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
            label: "DEFINITION",
            description: definition,
            note: "This is not SEO. It does not measure rankings, traffic, or backlinks.",
          },
          title: "What AI would recommend - and why it wouldn't",
          lead: "DefaultAnswer is an AI recommendation readiness audit.",
          subtitle:
            "It checks whether your site can be used as a citable source when AI systems select default answers.",
          ctaLabel: "Analyze a website",
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

      {mode === "home" ? (
        <>
          <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
            <SectionTitle
              eyebrow="Live observation"
              title="Best project management tool for remote teams"
              subtitle="Query asked on January 2, 2026 using ChatGPT-4"
            />

            <div className="mt-8 space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">AI recommended</div>
                <p className="mt-2 text-base text-stone-600 dark:text-stone-300">
                  Asana, Monday.com, Notion
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">Analysis</div>
                <ul className="mt-2 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                  <li>• None of the three rank #1 in Google for this query</li>
                  <li>• All three score 78+ on DefaultAnswer citation readiness</li>
                  <li>• All three have explicit &quot;remote teams&quot; use case statements</li>
                  <li>• All three provide direct answers to &quot;how does this help remote teams&quot;</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                  Not mentioned despite high search rankings
                </div>
                <ul className="mt-2 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                  <li>• Jira (ranks #2 in Google, scores 54 on citation readiness)</li>
                  <li>• Trello (ranks #4 in Google, scores 61 on citation readiness)</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">Why the gap</div>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                  Higher-ranking tools lack structured FAQ content and explicit remote team positioning. AI systems
                  cannot extract quotable answers to user intent.
                </p>
                <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">
                  This pattern repeats across categories. Search rank and AI recommendation are weakly correlated
                  (r=0.31).
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
            <SectionTitle
              title="How AI decides which websites to recommend"
              subtitle="AI systems select answers, not links. They recommend sources they can cite with confidence."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Card title="AI selects answers">
                AI systems choose a small set of sources and compose an answer. Your site must be usable as a source,
                not just discoverable.
              </Card>
              <Card title="Citation confidence matters">
                AI will not recommend a site it cannot describe, quote, or justify citing in a response.
              </Card>
              <Card title="Usable as a source">
                Sites need clear definitions, answerable text, and trust signals so an AI system can safely cite them.
              </Card>
            </div>
          </section>

          <HowItWorks
            title="Why AI systems hesitate to recommend websites"
            subtitle="These are the most common confidence gaps when AI decides whether to cite a site."
            items={[
              {
                title: "Identify",
                description:
                  "AI cannot describe what you are or who you are for.",
                pills: ["Titles", "Headings", "Category definition"],
              },
              {
                title: "Answer",
                description:
                  "AI cannot extract direct answers to common questions.",
                pills: ["FAQ blocks", "Definitions", "Answerable text"],
              },
              {
                title: "Trust",
                description:
                  "AI cannot justify citing you as a source.",
                pills: ["schema.org", "About page", "Contact info", "Access errors"],
              },
            ]}
          />

          <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
            <SectionTitle
              eyebrow="Why this exists"
              title="AI recommendations are not search rankings"
              subtitle="Crawling is not the same as being cited. DefaultAnswer explains why confidence breaks."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Card title="Crawling is not citation">
                Being indexed or crawlable does not mean an AI system will cite your site as a source.
              </Card>
              <Card title="Clarity beats crawlability">
                Clear definitions and answerable text matter more than how many pages are discoverable.
              </Card>
              <Card title="Explain the break">
                DefaultAnswer shows exactly where AI confidence fails and which signals block recommendation.
              </Card>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
            <SectionTitle
              eyebrow="Signals"
              title="What determines whether AI will recommend your site"
              subtitle="These five categories map to the report methodology."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card title="Entity clarity">
                Can an AI describe what you are, who you are for, and what you offer?
              </Card>
              <Card title="Answerability signals">
                Are there direct, extractable answers to common questions on the page?
              </Card>
              <Card title="Commercial clarity">
                If you sell something, can an AI see what the offering is without guessing?
              </Card>
              <Card title="Trust and legitimacy">
                Are there legitimacy signals such as About information and contact routes?
              </Card>
              <Card title="Accessibility and retrievability">
                Can the page be fetched and read reliably for citation?
              </Card>
            </div>
          </section>

          <SampleReportPreview
            title="What an AI recommendation audit actually shows"
            subtitle="Static excerpt from a deterministic report."
            report={{
              scoreLabel: "Default Answer Score",
              score: "67/100",
              readinessLabel: "Readiness",
              readinessValue: "Emerging Option",
              gaps: [
                "No FAQ-style answer blocks for common questions",
                "Unclear pricing or plan visibility",
                "Weak definition of who it is for on page",
              ],
              quickWins: [
                "Add 3-5 Q&A blocks on the homepage or /faq",
                "Add an About section with a clear category definition",
                "Add visible contact and trust signals",
              ],
              changeNote: "What changed since last scan: +6 points (schema markup detected).",
            }}
            sideCards={[
              {
                title: "Default Answer Score",
                body: "A single score that summarizes how confidently an AI can recommend the site as a default answer.",
              },
              {
                title: "Readiness label",
                body: "A plain-language status that ties back to the five signal categories.",
              },
              {
                title: "Change tracking",
                body: "A simple comparison note that shows what improved since the last scan.",
              },
            ]}
          />

          <BuiltFor
            eyebrow="Deterministic"
            title="Built so AI can safely cite you"
            subtitle="Deterministic outputs, stable vocabulary, structured evidence, and repeatability."
            cards={[
              {
                title: "Deterministic outputs",
                body: "The same input snapshot produces the same outputs so reports are comparable over time.",
              },
              {
                title: "Stable vocabulary",
                body: "The report uses consistent labels so findings can be cited without interpretation.",
              },
              {
                title: "Structured evidence",
                body: "Every finding maps to a visible on-page signal that an AI system can reference.",
              },
              {
                title: "Repeatability",
                body: "Changes are attributable to page updates, not scoring drift.",
              },
            ]}
            note="DefaultAnswer is designed for deterministic, citeable results."
          />

          <WhoItsFor
            title="Who it is for / not for"
            leftTitle="For"
            leftItems={[
              "SaaS founders",
              "Product teams",
              "Agencies advising on AI visibility",
              "Sites that rank but are not recommended",
            ]}
            rightTitle="Not for"
            rightItems={[
              "Keyword optimization",
              "Backlink analysis",
              "Traffic growth tactics",
            ]}
          />

          <Definitions
            title="Definitions"
            items={[
              {
                term: "AI recommendation confidence",
                definition:
                  "The degree to which an AI system can cite a website as a source without hedging, disclaimers, or uncertainty. High confidence occurs when on-page signals provide clear entity definition, extractable answers, and legitimacy markers.",
              },
              {
                term: "Default answer status",
                definition:
                  "Occurs when an AI system consistently selects a specific website as the primary source for a category of questions, independent of search engine rankings.",
              },
              {
                term: "Citation readiness",
                definition:
                  "Measures whether structural and content signals allow AI systems to safely quote, attribute, and recommend a source in generated responses.",
              },
              {
                term: "Answerability signals",
                definition:
                  "On-page elements that provide direct, extractable answers to predictable questions. Examples include FAQ blocks, definition paragraphs, and clearly labeled product descriptions.",
              },
              {
                term: "Entity clarity",
                definition:
                  "The ability of an AI system to describe what a website offers, who it serves, and what category it belongs to based solely on visible page content.",
              },
            ]}
          />

          <FAQ
            title="FAQ"
            items={[
              {
                question: "What is DefaultAnswer?",
                answer: [
                  definition,
                  "It does not measure rankings, traffic, or backlinks.",
                ],
              },
              {
                question: "Who is DefaultAnswer for?",
                answer: [
                  "SaaS founders, product teams, and agencies advising on AI visibility.",
                  "It is also for sites that rank but are not recommended by AI assistants.",
                ],
              },
              {
                question: "How does DefaultAnswer work?",
                answer: [
                  "It captures a snapshot of visible on-page content and evaluates it with deterministic checks.",
                  "The report explains which signals block AI citation confidence.",
                ],
              },
              {
                question: "What does DefaultAnswer measure?",
                answer: [
                  "Entity clarity, answerability signals, commercial clarity, trust and legitimacy, and accessibility and retrievability.",
                ],
              },
              {
                question: "What does DefaultAnswer not measure?",
                answer: [
                  "Rankings, traffic, or backlinks.",
                  "It is not an SEO or keyword tool.",
                ],
              },
            ]}
          />

          <ProofSection
            title="We ran DefaultAnswer on DefaultAnswer"
            body="The same checks are applied to our own site, with no special rules."
            bullets={[
              "Score: 85/100",
              "Status: Strong Default Candidate",
              "Same deterministic checks as any other site",
            ]}
            linkLabel="View example report"
            linkUrl="/reports/defaultanswer.com"
          />

          <BottomCta
            eyebrow={bottomCtaContent.eyebrow}
            title={bottomCtaContent.title}
            body={bottomCtaContent.body}
            linkLabel={bottomCtaContent.linkLabel}
            linkUrl={bottomCtaContent.linkUrl}
          />
        </>
      ) : (
        <>
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

          <Definitions
            title="Definitions"
            items={[
              {
                term: "AI recommendation confidence",
                definition:
                  "The degree to which an AI system can cite a website as a source without hedging, disclaimers, or uncertainty. High confidence occurs when on-page signals provide clear entity definition, extractable answers, and legitimacy markers.",
              },
              {
                term: "Default answer status",
                definition:
                  "Occurs when an AI system consistently selects a specific website as the primary source for a category of questions, independent of search engine rankings.",
              },
              {
                term: "Citation readiness",
                definition:
                  "Measures whether structural and content signals allow AI systems to safely quote, attribute, and recommend a source in generated responses.",
              },
              {
                term: "Answerability signals",
                definition:
                  "On-page elements that provide direct, extractable answers to predictable questions. Examples include FAQ blocks, definition paragraphs, and clearly labeled product descriptions.",
              },
              {
                term: "Entity clarity",
                definition:
                  "The ability of an AI system to describe what a website offers, who it serves, and what category it belongs to based solely on visible page content.",
              },
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

          <BottomCta
            eyebrow={bottomCtaContent.eyebrow}
            title={bottomCtaContent.title}
            body={bottomCtaContent.body}
            linkLabel={bottomCtaContent.linkLabel}
            linkUrl={bottomCtaContent.linkUrl}
          />
        </>
      )}
    </LandingLayout>
  );
}
