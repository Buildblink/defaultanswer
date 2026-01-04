"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeUrl, isValidUrl } from "@/lib/defaultanswer/url-utils";

type Status = "idle" | "submitting";

type HeroFormProps = {
  ctaLabel: string;
  ctaLoadingLabel?: string;
  helperText?: string;
  showCompareLink?: boolean;
  eyebrowLabel?: string;
};

export function HeroForm({
  ctaLabel,
  ctaLoadingLabel = "Analyzing...",
  helperText,
  showCompareLink = false,
  eyebrowLabel,
}: HeroFormProps) {
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

    const reportId = crypto.randomUUID();

    fetch("/api/leads/defaultanswer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized, source: "landing", reportId }),
    }).catch(() => {
      console.log("[defaultanswer] Lead capture failed, continuing anyway");
    });

    try {
      const analyzeRes = await fetch("/api/defaultanswer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });

      const data = await analyzeRes.json();

      console.log('[HeroForm] API response:', {
        reportUrl: data.reportUrl,
        hasAnalysis: !!data.analysis,
        reportId: data.reportId
      });

      // Prefer clean URL if available, fallback to old format
      if (data.reportUrl) {
        console.log('[HeroForm] Using clean URL:', data.reportUrl);
        router.push(data.reportUrl);
      } else if (data.analysis) {
        console.log('[HeroForm] No clean URL, using legacy format');
        const analysisB64 = btoa(encodeURIComponent(JSON.stringify(data.analysis)));
        router.push(`/defaultanswer/report/${reportId}?url=${encodeURIComponent(normalized)}&data=${analysisB64}`);
      } else {
        router.push(`/defaultanswer/report/${reportId}?url=${encodeURIComponent(normalized)}`);
      }
    } catch {
      console.log("[defaultanswer] Analysis failed, redirecting with fallback");
      router.push(`/defaultanswer/report/${reportId}?url=${encodeURIComponent(normalized)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      {eyebrowLabel ? (
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {eyebrowLabel}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yoursite.com"
          className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-stone-50"
          disabled={status === "submitting"}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
        >
          {status === "submitting" ? ctaLoadingLabel : ctaLabel}
        </button>
      </div>
      {errorMessage && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
      {helperText ? (
        <div className="mt-4 text-sm text-stone-600 dark:text-stone-300">
          {helperText}{" "}
          {showCompareLink ? (
            <Link
              href="/defaultanswer/compare"
              className="text-stone-900 underline underline-offset-2 dark:text-stone-50"
            >
              Try Compare Mode
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
