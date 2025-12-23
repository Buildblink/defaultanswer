import type { Metadata } from "next";
import Link from "next/link";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { Card } from "@/app/(landing)/ui/Card";
import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";

export const metadata: Metadata = {
  title: "DefaultAnswer Reports",
  description:
    "Explore example DefaultAnswer reports and learn what AI systems can retrieve, cite, and recommend today.",
  alternates: {
    canonical: "/reports",
  },
  openGraph: {
    title: "DefaultAnswer Reports",
    description:
      "Explore example DefaultAnswer reports and learn what AI systems can retrieve, cite, and recommend today.",
    url: "https://defaultanswer.com/reports",
    siteName: "DefaultAnswer",
    type: "website",
  },
};

const exampleReports = [
  {
    title: "DefaultAnswer Report — defaultanswer.com",
    description: "Public example report generated using the standard methodology.",
    href: "/reports/defaultanswer.com",
  },
];

const blogLinks = [
  {
    title: "Why AI recommendations fail even when you rank #1",
    href: "/blog/why-ai-recommendations-fail-even-when-you-rank-1",
  },
  {
    title: "Why AI cannot recommend what it cannot describe",
    href: "/blog/why-ai-cannot-recommend-what-it-cannot-describe",
  },
  {
    title: "Why AI skips websites that don’t answer questions directly",
    href: "/blog/why-ai-skips-websites-that-dont-answer-questions-directly",
  },
];

export default function ReportsPage() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            DefaultAnswer Reports
          </h1>
          <p className="text-base leading-relaxed text-stone-600 dark:text-stone-300">
            DefaultAnswer reports show what AI systems can retrieve and cite from a site today.
            Use these public examples to understand the signals that improve recommendation confidence.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <SectionTitle title="Example reports" />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {exampleReports.map((report) => (
            <Card key={report.href} title={report.title}>
              <p>{report.description}</p>
              <Link
                href={report.href}
                className="mt-4 inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
              >
                View report
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <SectionTitle title="What you get" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <Link href="/reports/defaultanswer.com#right-now" className="font-semibold text-stone-900 dark:text-stone-50">
              Right now block
            </Link>
            <p className="mt-2 text-stone-600 dark:text-stone-300">
              See where you win and where you disappear today.
            </p>
          </Card>
          <Card>
            <Link href="/reports/defaultanswer.com#ai-proof" className="font-semibold text-stone-900 dark:text-stone-50">
              AI proof (simulated + verdict)
            </Link>
            <p className="mt-2 text-stone-600 dark:text-stone-300">
              Simulated responses plus a model-free verdict for each prompt.
            </p>
          </Card>
          <Card>
            <Link
              href="/reports/defaultanswer.com#quote-ready-copy"
              className="font-semibold text-stone-900 dark:text-stone-50"
            >
              Quote-ready copy
            </Link>
            <p className="mt-2 text-stone-600 dark:text-stone-300">
              Pasteable sentences that increase citation safety.
            </p>
          </Card>
          <Card>
            <Link
              href="/reports/defaultanswer.com#coverage"
              className="font-semibold text-stone-900 dark:text-stone-50"
            >
              Coverage
            </Link>
            <p className="mt-2 text-stone-600 dark:text-stone-300">
              A clear view of what AI can actually use.
            </p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <SectionTitle title="Read next" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {blogLinks.map((post) => (
            <Card key={post.href}>
              <Link href={post.href} className="font-semibold text-stone-900 dark:text-stone-50">
                {post.title}
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                Run a report on your site
              </div>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                See exactly which signals help or block AI recommendations.
              </p>
            </div>
            <Link
              href="/defaultanswer"
              className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              Analyze a website
            </Link>
          </div>
        </Card>
      </section>
    </LandingLayout>
  );
}
