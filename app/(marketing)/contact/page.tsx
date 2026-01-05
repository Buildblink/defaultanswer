import type { Metadata } from "next";

const siteUrl = "https://www.defaultanswer.com";

export const metadata: Metadata = {
  title: "Contact | DefaultAnswer",
  description: "Contact DefaultAnswer for questions about methodology, report interpretation, or incorrect signals. Email: contact@defaultanswer.com",
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
  openGraph: {
    title: "Contact | DefaultAnswer",
    description: "Get in touch with questions about methodology, report interpretation, or incorrect signals.",
    type: "website",
    images: ["/og.png"],
    url: `${siteUrl}/contact`,
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50">
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Contact</h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          Contact us for questions about methodology, report interpretation, or incorrect signals.
        </p>
        <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-stone-300">
          Email:{" "}
          <a
            href="mailto:contact@defaultanswer.com"
            className="underline hover:text-stone-900 dark:hover:text-stone-50"
          >
            contact@defaultanswer.com
          </a>
        </p>
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">
          For support questions, include the URL you analyzed.
        </p>
      </section>
    </div>
  );
}
