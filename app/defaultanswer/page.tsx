"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeUrl, isValidUrl } from "@/lib/defaultanswer/url-utils";

type Status = "idle" | "submitting";

export default function DefaultAnswerPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isValidUrl(url)) {
      setErrorMessage("Please enter a valid URL (e.g., example.com)");
      return;
    }

    const normalized = normalizeUrl(url);
    setStatus("submitting");

    // Generate unique report ID client-side
    const reportId = crypto.randomUUID();

    // POST to lead capture API (fire-and-forget, don't block redirect)
    fetch("/api/leads/defaultanswer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized, source: "landing", reportId }),
    }).catch(() => {
      console.log("[defaultanswer] Lead capture failed, continuing anyway");
    });

    // Call analyze API to get real scoring
    try {
      const analyzeRes = await fetch("/api/defaultanswer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });

      const data = await analyzeRes.json();
      
      if (data.analysis) {
        // Encode analysis as base64 for query string
        const analysisB64 = btoa(encodeURIComponent(JSON.stringify(data.analysis)));
        router.push(`/defaultanswer/report/${reportId}?url=${encodeURIComponent(normalized)}&data=${analysisB64}`);
      } else {
        // No analysis available, redirect without data (will use fallback)
        router.push(`/defaultanswer/report/${reportId}?url=${encodeURIComponent(normalized)}`);
      }
    } catch {
      // Analysis failed, redirect without data (graceful degradation)
      console.log("[defaultanswer] Analysis failed, redirecting with fallback");
      router.push(`/defaultanswer/report/${reportId}?url=${encodeURIComponent(normalized)}`);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Is AI Recommending You?
          </h1>
          <p className="mt-6 text-lg text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
            Enter your URL → get a scored report showing if ChatGPT, Claude, and
            Perplexity consider you the default answer — plus fixes to improve.
          </p>

          {/* URL Input Form */}
          <form onSubmit={handleSubmit} className="mt-10 max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yoursite.com"
                className="flex-1 px-4 py-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={status === "submitting"}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                {status === "submitting" ? "Analyzing..." : "Run Your Default Score"}
              </button>
            </div>
            {errorMessage && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}
            <div className="mt-4 text-sm text-stone-600 dark:text-stone-400">
              Want to compare vs a competitor?{" "}
              <a href="/defaultanswer/compare" className="text-amber-700 dark:text-amber-300 underline">
                Try Compare Mode
              </a>
            </div>
          </form>

          {/* 3 Benefits */}
          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6 text-sm text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">✓</span>
              <span>See if AI recommends you</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-600">✓</span>
              <span>See who it recommends instead</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-600">✓</span>
              <span>Get a 14-day fix list</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Report Preview */}
      <section className="py-16 px-6 bg-stone-100 dark:bg-stone-900">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Sample Report Preview
          </h2>
          <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide">
                  DefaultAnswer Report
                </p>
                <p className="font-semibold mt-1">acme-widgets.com</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-amber-600">68</p>
                <p className="text-xs text-stone-400">/ 100</p>
              </div>
            </div>
            <div className="border-t border-stone-200 dark:border-stone-700 pt-4 mt-4">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                <strong>Summary:</strong> AI assistants mention Acme Widgets
                in 4/10 relevant queries but prefer CompetitorX for pricing
                questions...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                step: "1",
                title: "Enter your URL",
                desc: "Paste your homepage or key landing page.",
              },
              {
                step: "2",
                title: "We query the LLMs",
                desc: "We ask ChatGPT, Claude, Perplexity, and Gemini about your category.",
              },
              {
                step: "3",
                title: "Get your scored report",
                desc: "See your Default Answer Score™ and who AI recommends instead.",
              },
              {
                step: "4",
                title: "Execute the fixes",
                desc: "Follow prioritized recommendations to become the default answer.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 p-4 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 px-6 bg-stone-100 dark:bg-stone-900">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Who It's For</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
              <p className="font-semibold">Founders</p>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
                Know if AI is sending customers to you — or your competitors.
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
              <p className="font-semibold">Marketers</p>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
                Optimize content for the new discovery channel: LLM
                recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">FAQ</h2>
          <div className="space-y-6">
            <div>
              <p className="font-semibold">
                What is the Default Answer Score™?
              </p>
              <p className="text-stone-600 dark:text-stone-400 mt-2">
                A 0–100 score measuring how often major AI assistants recommend
                your brand as the answer to relevant queries in your category.
              </p>
            </div>
            <div>
              <p className="font-semibold">How long does analysis take?</p>
              <p className="text-stone-600 dark:text-stone-400 mt-2">
                Initial snapshots are instant. Full reports with competitor
                analysis typically take 2–5 minutes.
              </p>
            </div>
            <div>
              <p className="font-semibold">Which LLMs do you check?</p>
              <p className="text-stone-600 dark:text-stone-400 mt-2">
                We query ChatGPT (GPT-4), Claude, Perplexity, and Google Gemini
                to give you comprehensive coverage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-amber-50 dark:bg-amber-950">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold">
            Ready to see your Default Score?
          </h2>
          <p className="mt-4 text-stone-600 dark:text-stone-400">
            Enter your URL and find out if AI recommends you.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yoursite.com"
                className="flex-1 px-4 py-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={status === "submitting"}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                {status === "submitting" ? "Analyzing..." : "Run Your Default Score"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-stone-200 dark:border-stone-800">
        <div className="max-w-2xl mx-auto text-center text-sm text-stone-500 dark:text-stone-400">
          <p>DefaultAnswer — LLM Recommendation Intelligence</p>
        </div>
      </footer>
    </div>
  );
}
