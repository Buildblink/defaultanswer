"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "defaultanswer:how_to_use_seen";

export function HowToUseThisReport() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY) === "1";
      if (seen) {
        setOpen(false);
      } else {
        setOpen(true);
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {
      // If storage is unavailable, default to open (graceful).
      setOpen(true);
    }
  }, []);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="mt-6 border border-stone-200 dark:border-stone-800 rounded-lg bg-stone-50 dark:bg-stone-900 px-4 py-3"
    >
      <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">
        How to Use This Report
      </summary>
      <div className="mt-3 text-sm text-stone-700 dark:text-stone-300 space-y-2">
        <p>Step 1: Copy the report as Markdown</p>
        <p>Step 2: Paste it into ChatGPT / Claude</p>
        <p>
          Step 3: Ask:{" "}
          <span className="font-mono bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded px-2 py-1 inline-block">
            Based on this report, what should I fix first to become the default
            recommendation?
          </span>
        </p>
      </div>
    </details>
  );
}


