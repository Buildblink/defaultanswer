"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STORAGE_PREFIX = "defaultanswer:report:";

function safeDecodeAnalysisFromB64(dataB64: string): string | null {
  try {
    return decodeURIComponent(atob(dataB64));
  } catch {
    return null;
  }
}

function safeEncodeAnalysisToB64(json: string): string | null {
  try {
    return btoa(encodeURIComponent(json));
  } catch {
    return null;
  }
}

export function ReportClientTools(props: {
  reportId: string;
  url: string;
  encodedData?: string;
}) {
  const { reportId, url, encodedData } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}${reportId}`, [reportId]);

  // Persistence: store analysis when present; restore when missing
  useEffect(() => {
    if (!reportId) return;

    // If we have analysis in query, store it
    if (encodedData) {
      const json = safeDecodeAnalysisFromB64(encodedData);
      if (json) {
        try {
          window.localStorage.setItem(storageKey, json);
        } catch {
          // ignore
        }
      }
      return;
    }

    // If query data missing, attempt restore from localStorage
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const b64 = safeEncodeAnalysisToB64(saved);
      if (!b64) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("data", b64);
      // Keep url in query for report rendering
      if (url) params.set("url", url);

      router.replace(`/defaultanswer/report/${reportId}?${params.toString()}`);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, encodedData, storageKey]);

  const handleRerun = async () => {
    if (!url) return;
    setRerunError(null);
    setRerunning(true);

    const newReportId = crypto.randomUUID();
    const newKey = `${STORAGE_PREFIX}${newReportId}`;

    try {
      const res = await fetch("/api/defaultanswer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      const analysis = data?.analysis;
      if (!analysis) {
        throw new Error("No analysis returned");
      }

      const json = JSON.stringify(analysis);
      const b64 = safeEncodeAnalysisToB64(json);

      // Save new report and remove old key (overwrite behavior)
      try {
        window.localStorage.setItem(newKey, json);
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }

      const q = new URLSearchParams();
      q.set("url", url);
      if (b64) q.set("data", b64);
      router.push(`/defaultanswer/report/${newReportId}?${q.toString()}`);
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : "Re-run failed");
    } finally {
      setRerunning(false);
    }
  };

  return (
    <div className="mt-4 flex items-center gap-3 flex-wrap print:hidden">
      <button
        type="button"
        onClick={handleRerun}
        disabled={rerunning || !url}
        className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-semibold disabled:opacity-60"
      >
        {rerunning ? "Re-running..." : "Re-run Analysis"}
      </button>
      {rerunError && (
        <span className="text-sm text-stone-500 dark:text-stone-400">
          Re-run failed (best-effort): {rerunError}
        </span>
      )}
    </div>
  );
}


