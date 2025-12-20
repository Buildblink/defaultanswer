import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/supabase/client";
import type { AnalysisResult } from "./scoring";

export type ScanRecord = {
  id?: string;
  created_at?: string;
  url: string;
  domain: string;
  canonical_url?: string | null;
  score: number;
  readiness: string;
  breakdown: Array<{ label: string; points: number; max: number; category: string }>;
  signals: {
    hasFAQ: boolean;
    hasSchema: boolean;
    hasPricing: boolean;
    hasAbout: boolean;
    hasContact: boolean;
    schemaTypes: string[];
  };
  evidence: {
    titleText?: string;
    h1Text?: string;
    metaDescription?: string;
    pricingEvidence?: string | null;
    schemaTypes?: string[];
  };
  snapshot_quality: string;
  fetch_status?: number | null;
  hash: string;
};

export type ScanDiff = {
  changed: boolean;
  scoreDelta: number;
  readinessChanged: boolean;
  signalChanges: {
    gained: string[];
    lost: string[];
    schemaAdded: string[];
    schemaRemoved: string[];
  };
  breakdownChanges: Array<{ label: string; category: string; delta: number; aPoints: number; bPoints: number; max: number }>;
  contentChanges: string[];
};

export function isHistoryConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function buildScanRecordFromAnalysis(url: string, analysis: AnalysisResult): ScanRecord {
  const domain = analysis.extracted.domain || extractDomain(url);
  const breakdown = [...(analysis.breakdown || [])].sort((a, b) =>
    `${a.category}::${a.label}`.localeCompare(`${b.category}::${b.label}`)
  );
  const schemaTypes = [...(analysis.extracted.schemaTypes || [])].sort();
  const normalized = {
    score: analysis.score,
    readiness: analysis.analysisStatus === "ok" ? "ok" : analysis.analysisStatus || "ok",
    breakdown,
    signals: {
      hasFAQ: !!analysis.extracted.hasFAQ,
      hasSchema: !!analysis.extracted.hasSchemaJsonLd || !!analysis.extracted.hasSchema,
      hasPricing: !!analysis.extracted.hasPricing,
      hasAbout: !!analysis.extracted.hasAbout,
      hasContact: !!analysis.extracted.hasContactSignals,
      schemaTypes,
    },
  };

  const hash = computeScanHash(normalized);

  return {
    url,
    domain,
    canonical_url: analysis.extracted.canonicalUrl || analysis.extracted.evaluatedUrl || null,
    score: analysis.score,
    readiness: analysis.analysisStatus || "ok",
    breakdown,
    signals: normalized.signals,
    evidence: {
      titleText: analysis.extracted.title,
      h1Text: analysis.extracted.h1s?.[0],
      metaDescription: analysis.extracted.metaDescription,
      pricingEvidence: analysis.extracted.evidence?.pricingEvidence?.[0] || null,
      schemaTypes,
    },
    snapshot_quality: analysis.snapshotQuality || "ok",
    fetch_status: analysis.fetchDiagnostics?.status ?? null,
    hash,
  };
}

export function computeScanHash(input: any): string {
  const str = JSON.stringify(input);
  return crypto.createHash("sha256").update(str).digest("hex");
}

export function diffScans(prev: ScanRecord | null, curr: ScanRecord): ScanDiff {
  if (!prev) {
    return {
      changed: true,
      scoreDelta: 0,
      readinessChanged: false,
      signalChanges: { gained: [], lost: [], schemaAdded: [], schemaRemoved: [] },
      breakdownChanges: [],
      contentChanges: [],
    };
  }

  const scoreDelta = curr.score - prev.score;
  const readinessChanged = curr.readiness !== prev.readiness;

  const signals = ["hasFAQ", "hasSchema", "hasPricing", "hasAbout", "hasContact"] as const;
  const gained: string[] = [];
  const lost: string[] = [];
  for (const key of signals) {
    const prevVal = (prev.signals as any)[key];
    const currVal = (curr.signals as any)[key];
    if (prevVal !== currVal) {
      if (currVal) gained.push(key);
      else lost.push(key);
    }
  }

  const schemaPrev = new Set(prev.signals.schemaTypes || []);
  const schemaCurr = new Set(curr.signals.schemaTypes || []);
  const schemaAdded = [...schemaCurr].filter((t) => !schemaPrev.has(t));
  const schemaRemoved = [...schemaPrev].filter((t) => !schemaCurr.has(t));

  const breakdownChanges = computeBreakdownDeltas(prev.breakdown, curr.breakdown);
  const contentChanges: string[] = [];
  if ((prev.evidence.titleText || "") !== (curr.evidence.titleText || "")) contentChanges.push("Title changed");
  if ((prev.evidence.h1Text || "") !== (curr.evidence.h1Text || "")) contentChanges.push("H1 changed");
  if ((prev.evidence.metaDescription || "") !== (curr.evidence.metaDescription || "")) contentChanges.push("Meta description changed");

  return {
    changed: prev.hash !== curr.hash,
    scoreDelta,
    readinessChanged,
    signalChanges: { gained, lost, schemaAdded, schemaRemoved },
    breakdownChanges,
    contentChanges,
  };
}

function computeBreakdownDeltas(a: ScanRecord["breakdown"], b: ScanRecord["breakdown"]) {
  const mapA = toMap(a);
  const mapB = toMap(b);
  const keys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  const rows: Array<{ label: string; category: string; delta: number; aPoints: number; bPoints: number; max: number }> = [];
  keys.forEach((key) => {
    const [category, label] = key.split("::");
    const aItem = mapA[key];
    const bItem = mapB[key];
    const aPoints = aItem?.points ?? 0;
    const bPoints = bItem?.points ?? 0;
    const max = aItem?.max ?? bItem?.max ?? 0;
    const delta = bPoints - aPoints;
    if (delta !== 0) {
      rows.push({ label, category, delta, aPoints, bPoints, max });
    }
  });
  return rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 5);
}

function toMap(items: ScanRecord["breakdown"]) {
  return items.reduce<Record<string, { points: number; max: number }>>((acc, item) => {
    acc[`${item.category}::${item.label}`] = { points: item.points, max: item.max };
    return acc;
  }, {});
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

export async function saveScan(record: ScanRecord) {
  if (!isHistoryConfigured()) return null;
  try {
    const { data, error } = await supabaseAdmin.from("defaultanswer_scans").insert(record).select("id").single();
    if (error) {
      console.warn("[history] save failed", error.message);
      return null;
    }
    return data?.id;
  } catch (err) {
    console.warn("[history] save failed", err);
    return null;
  }
}

export async function fetchLatestScans(url: string) {
  if (!isHistoryConfigured()) return { ok: false as const, error: "History not configured" };
  try {
    const { data, error } = await supabaseAdmin
      .from("defaultanswer_scans")
      .select("*")
      .eq("url", url)
      .order("created_at", { ascending: false })
      .limit(2);
    if (error) return { ok: false as const, error: error.message };
    const [latest, previous] = data || [];
    return { ok: true as const, latest: latest || null, previous: previous || null };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "unknown error" };
  }
}
