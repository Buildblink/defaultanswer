"use client";

import { useState } from "react";
import type { ReportData } from "@/lib/defaultanswer/report-to-markdown";

type Props = {
  reportData: ReportData;
};

export function ExportButtons({ reportData }: Props) {
  const [loading, setLoading] = useState<"md" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = async () => {
    setLoading("md");
    setError(null);
    try {
      const res = await fetch("/api/defaultanswer/report/export/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: reportData }),
      });
      const data = await res.json();
      if (!data.ok || !data.markdown) {
        setError(data.error || "Export failed.");
        return;
      }
      const blob = new Blob([data.markdown], { type: "text/markdown" });
      downloadBlob(blob, "defaultanswer-report.md");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setLoading(null);
    }
  };

  const exportPdf = async () => {
    setLoading("pdf");
    setError(null);
    try {
      const res = await fetch("/api/defaultanswer/report/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: reportData }),
      });
      if (!res.ok) {
        let msg = `PDF export failed (${res.status})`;
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {
          // ignore parse
        }
        setError(msg);
        return;
      }
      const blob = await res.blob();
      downloadBlob(blob, "defaultanswer-report.pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={exportMarkdown}
        disabled={loading !== null}
        className="px-3 py-1.5 rounded bg-stone-900 text-white text-xs font-semibold disabled:opacity-60"
      >
        {loading === "md" ? "Exporting..." : "Export Markdown"}
      </button>
      <button
        type="button"
        onClick={exportPdf}
        disabled={loading !== null}
        className="px-3 py-1.5 rounded bg-stone-700 text-white text-xs font-semibold disabled:opacity-60"
      >
        {loading === "pdf" ? "Exporting..." : "Export PDF"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
