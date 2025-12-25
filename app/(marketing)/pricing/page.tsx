import type { Metadata } from "next";
import Link from "next/link";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { Card } from "@/app/(landing)/ui/Card";
import { SectionTitle } from "@/app/(landing)/ui/SectionTitle";

export const metadata: Metadata = {
  title: "DefaultAnswer Pricing",
  description: "Pricing is not published yet. Contact us for access to monitoring.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <LandingLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle
          title="Pricing"
          subtitle="Pricing is not published yet. Monitoring is available by request."
        />
        <div className="mt-6 max-w-3xl">
          <Card>
            <p>
              If you want access to monitoring, reach out and we will share the current plan details.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:hover:bg-stone-900"
            >
              Contact us
            </Link>
          </Card>
        </div>
      </section>
    </LandingLayout>
  );
}
