"use client";

import type {
  ColdSummaryMode,
  ColdSummaryMultiRun,
  ColdSummaryResult,
} from "@/lib/defaultanswer/cold-summary";

const STORAGE_SUFFIX = "cold-summary";

export type ColdSummaryStored = {
  byMode?: Partial<Record<ColdSummaryMode, ColdSummaryStoredMode>>;
  singleRun?: ColdSummaryResult;
  multiRun?: ColdSummaryMultiRun;
};

export type ColdSummaryStoredMode = {
  singleRun?: ColdSummaryResult;
  multiRun?: ColdSummaryMultiRun;
};

export function getColdSummaryStorageKey(reportId: string) {
  return `${reportId}-${STORAGE_SUFFIX}`;
}

export function readColdSummaryFromStorage(reportId: string): ColdSummaryStored | null {
  if (typeof window === "undefined" || !reportId) return null;
  try {
    const raw = window.localStorage.getItem(getColdSummaryStorageKey(reportId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.byMode || parsed.singleRun || parsed.multiRun)) {
      if (parsed.byMode) {
        return parsed as ColdSummaryStored;
      }
      const legacy = parsed as ColdSummaryStored;
      return {
        byMode: {
          url_only: {
            singleRun: legacy.singleRun,
            multiRun: legacy.multiRun,
          },
        },
        singleRun: legacy.singleRun,
        multiRun: legacy.multiRun,
      };
    }
    if (parsed && parsed.promptVersion && parsed.analysis) {
      return {
        byMode: { url_only: { singleRun: parsed as ColdSummaryResult } },
        singleRun: parsed as ColdSummaryResult,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeColdSummarySingle(reportId: string, mode: ColdSummaryMode, result: ColdSummaryResult) {
  if (typeof window === "undefined" || !reportId) return;
  try {
    const existing = readColdSummaryFromStorage(reportId);
    const nextByMode = {
      ...(existing?.byMode || {}),
      [mode]: {
        ...(existing?.byMode?.[mode] || {}),
        singleRun: result,
      },
    };
    const next: ColdSummaryStored = {
      byMode: nextByMode,
      singleRun: mode === "url_only" ? result : existing?.singleRun,
      multiRun: existing?.multiRun,
    };
    window.localStorage.setItem(getColdSummaryStorageKey(reportId), JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function writeColdSummaryMulti(reportId: string, mode: ColdSummaryMode, multiRun: ColdSummaryMultiRun) {
  if (typeof window === "undefined" || !reportId) return;
  try {
    const existing = readColdSummaryFromStorage(reportId);
    const nextByMode = {
      ...(existing?.byMode || {}),
      [mode]: {
        ...(existing?.byMode?.[mode] || {}),
        multiRun,
      },
    };
    const next: ColdSummaryStored = {
      byMode: nextByMode,
      singleRun: existing?.singleRun,
      multiRun: mode === "url_only" ? multiRun : existing?.multiRun,
    };
    window.localStorage.setItem(getColdSummaryStorageKey(reportId), JSON.stringify(next));
  } catch {
    // ignore
  }
}
