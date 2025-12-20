"use client";

import { useState } from "react";

export type CalibrationRow = {
  url: string;
  score: number | null;
  readiness: string;
  topFix: string;
  biggestGap: string;
  status: "OK" | "BLOCKED" | "SNAPSHOT_INCOMPLETE" | "FAILED";
  snapshotQuality?: string;
  bytes?: number | null;
  notes: string;
};

function rowsToMarkdown(rows: CalibrationRow[]): string {
  const lines: string[] = [];
  lines.push("# DefaultAnswer Calibration Results");
  lines.push("");
  lines.push(
    "| URL | Score | Readiness | Top Fix | Biggest Gap | Status | Snapshot Quality | Bytes | Notes |"
  );
  lines.push("| --- | ---: | --- | --- | --- | --- | --- | --- | --- |");

  for (const r of rows) {
    const score = r.score === null ? "" : String(r.score);
    lines.push(
      `| ${escapeCell(r.url)} | ${escapeCell(score)} | ${escapeCell(
        r.readiness
      )} | ${escapeCell(r.topFix)} | ${escapeCell(r.biggestGap)} | ${
        r.status
      } | ${escapeCell(r.snapshotQuality || "")} | ${
        typeof r.bytes === "number" ? r.bytes.toLocaleString() : ""
      } | ${escapeCell(r.notes)} |`
    );
  }

  return lines.join("\n");
}

function escapeCell(text: string): string {
  return (text || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function CopyResultsButton({ rows }: { rows: CalibrationRow[] }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const md = rowsToMarkdown(rows);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = md;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-semibold"
    >
      {copied ? "Copied" : "Copy results as Markdown"}
    </button>
  );
}

