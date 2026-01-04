"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SWEEP_PROMPTS } from "@/lib/sweep/prompt-set";

type LearningExtract = {
  refusal_type: "none" | "partial" | "full";
  category_label: string | null;
  winner: string | null;
  mentioned_domains: string[];
  mentioned_brands: string[];
  confidence_language: "hedged" | "assertive" | "mixed";
};

type LearningTag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
};

type ResultTag = {
  id: string;
  notes: string | null;
  tag: {
    id: string;
    key: string;
    label: string;
  } | null;
};

type LearningResultRow = {
  id: string;
  sweep_id: string;
  created_at: string;
  provider: string;
  model: string;
  prompt_key: string;
  prompt: string;
  prompt_text: string | null;
  response_text: string | null;
  response_json: unknown | null;
  error_text: string | null;
  winner: string | null;
  mention_rank: number | null;
  has_domain_mention: boolean;
  has_brand_mention: boolean;
  evaluation_notes: unknown | null;
  learning_signal: string | null;
  learning_extract: LearningExtract | null;
  learning_result_tags: ResultTag[];
};

type ResultsResponse = {
  results: LearningResultRow[];
  tags: LearningTag[];
};

type SummaryResponse = {
  mention_rate: number;
  refusal_rate: number;
  top_winners: Array<{ value: string; count: number }>;
  top_categories: Array<{ value: string; count: number }>;
  top_tags: Array<{ value: string; count: number }>;
  top_incumbents: Array<{ value: string; count: number }>;
  total: number;
};

const TOKEN_KEY = "defaultanswer_admin_token";
const GROUPS = Array.from(new Set(SWEEP_PROMPTS.map((prompt) => prompt.intent)));
const PROMPT_GROUPS = SWEEP_PROMPTS.reduce<Record<string, string>>((acc, prompt) => {
  acc[prompt.key] = prompt.intent;
  return acc;
}, {});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildQuery(params: Record<string, string | number | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

function extractPromptVars(promptText: string) {
  const text = promptText || "";
  const domainMatch = text.match(/\b[a-z0-9][a-z0-9.-]+\.[a-z]{2,}\b/i);
  const quoted = text.match(/"([^"]{2,60})"/);
  const likeMatch = text.match(/(?:like|about)\s+([A-Z][A-Za-z0-9\s-]{2,40})/);
  const brand = (quoted?.[1] || likeMatch?.[1] || "").trim();
  return {
    domain: domainMatch?.[0]?.toLowerCase() || "",
    brand,
  };
}

function topList(items: Array<{ value: string; count: number }>, limit = 3) {
  return items.slice(0, limit).map((item) => `${item.value} (${item.count})`).join(", ");
}

export default function AdminLearningPage() {
  const [token, setToken] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    model: "",
    provider: "",
    group: "",
    q: "",
    limit: 50,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LearningResultRow[]>([]);
  const [tags, setTags] = useState<LearningTag[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [selectedRow, setSelectedRow] = useState<LearningResultRow | null>(null);
  const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadData(appliedFilters);
  }, [token, appliedFilters]);

  useEffect(() => {
    if (!selectedRow) return;
    const rowTags = selectedRow.learning_result_tags || [];
    setSelectedTagKeys(rowTags.map((tag) => tag.tag?.key).filter(Boolean) as string[]);
    setNotes(rowTags.find((tag) => tag.notes)?.notes || "");
  }, [selectedRow]);

  async function loadData(currentFilters: typeof filters) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery({
        from: currentFilters.from,
        to: currentFilters.to,
        model: currentFilters.model,
        provider: currentFilters.provider,
        group: currentFilters.group,
        q: currentFilters.q,
        limit: currentFilters.limit,
        offset: 0,
      });
      const [resultsRes, summaryRes] = await Promise.all([
        fetch(`/api/admin/learning/results?${query}`, {
          headers: { "x-admin-token": token },
        }),
        fetch(`/api/admin/learning/summary?${query}`, {
          headers: { "x-admin-token": token },
        }),
      ]);
      const resultsJson = (await resultsRes.json()) as ResultsResponse | { error: string };
      if (!resultsRes.ok) {
        throw new Error("error" in resultsJson ? resultsJson.error : "Failed to load results.");
      }
      const summaryJson = (await summaryRes.json()) as SummaryResponse | { error: string };
      if (!summaryRes.ok) {
        throw new Error("error" in summaryJson ? summaryJson.error : "Failed to load summary.");
      }
      setResults((resultsJson as ResultsResponse).results || []);
      setTags((resultsJson as ResultsResponse).tags || []);
      setSummary(summaryJson as SummaryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load learning data.");
    } finally {
      setLoading(false);
    }
  }

  async function saveTags() {
    if (!selectedRow) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/learning/results/${selectedRow.id}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ tag_keys: selectedTagKeys, notes }),
      });
      const json = (await res.json()) as { error?: string; tags?: ResultTag[] };
      if (!res.ok) {
        throw new Error(json.error || "Failed to save tags.");
      }
      const updatedTags = json.tags || [];
      setResults((prev) =>
        prev.map((row) => (row.id === selectedRow.id ? { ...row, learning_result_tags: updatedTags } : row))
      );
      setSelectedRow((prev) => (prev ? { ...prev, learning_result_tags: updatedTags } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tags.");
    } finally {
      setSaving(false);
    }
  }

  async function exportJson() {
    if (!token) return;
    setExporting(true);
    setError(null);
    try {
      const query = buildQuery({
        from: appliedFilters.from,
        to: appliedFilters.to,
        model: appliedFilters.model,
        provider: appliedFilters.provider,
        group: appliedFilters.group,
        q: appliedFilters.q,
      });
      const res = await fetch(`/api/admin/learning/export?${query}`, {
        headers: { "x-admin-token": token },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      link.href = url;
      link.download = match?.[1] || "learning-export.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const rows = useMemo(() => results || [], [results]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Learning Dashboard v1</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Admin token</label>
              <Input
                value={token}
                onChange={(event) => {
                  const value = event.target.value;
                  setToken(value);
                  window.localStorage.setItem(TOKEN_KEY, value);
                }}
                placeholder="Paste admin token"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">From</label>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">To</label>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Provider</label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={filters.provider}
                  onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))}
                >
                  <option value="">All</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Model</label>
                <Input
                  value={filters.model}
                  onChange={(event) => setFilters((prev) => ({ ...prev, model: event.target.value }))}
                  placeholder="gpt-4o-mini"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Prompt group</label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={filters.group}
                  onChange={(event) => setFilters((prev) => ({ ...prev, group: event.target.value }))}
                >
                  <option value="">All</option>
                  {GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Limit</label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={filters.limit}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setFilters((prev) => ({
                      ...prev,
                      limit: Number.isFinite(next) && next > 0 ? next : 50,
                    }));
                  }}
                />
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                placeholder="domain, brand, prompt_key"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Button
              onClick={() => setAppliedFilters(filters)}
              disabled={!token || loading}
            >
              {loading ? "Loading..." : "Apply filters"}
            </Button>
            <Button
              variant="outline"
              onClick={exportJson}
              disabled={!token || loading || exporting}
            >
              {exporting ? "Exporting..." : "Export JSON"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const reset = { from: "", to: "", model: "", provider: "", group: "", q: "", limit: 50 };
                setFilters(reset);
                setAppliedFilters(reset);
              }}
              disabled={loading}
            >
              Clear
            </Button>
            {error && <span className="text-red-500">{error}</span>}
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Total results</div>
              <div className="text-lg font-semibold">{summary.total}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Mention rate</div>
              <div className="text-lg font-semibold">{formatPercent(summary.mention_rate)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Refusal rate</div>
              <div className="text-lg font-semibold">{formatPercent(summary.refusal_rate)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Top winners</div>
              <div>{topList(summary.top_winners) || "None"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Top categories</div>
              <div>{topList(summary.top_categories) || "None"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Top tags</div>
              <div>{topList(summary.top_tags) || "None"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">Top incumbents</div>
              <div>{topList(summary.top_incumbents) || "None"}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Created</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Prompt</th>
                  <th className="py-2">Group</th>
                  <th className="py-2">Domain/Brand</th>
                  <th className="py-2">Winner</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Refusal</th>
                  <th className="py-2">Mentioned</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const promptText = row.prompt_text || row.prompt || "";
                  const { domain, brand } = extractPromptVars(promptText);
                  const learning = row.learning_extract;
                  const mentions = learning?.mentioned_domains?.slice(0, 3).join(", ") || "-";
                  return (
                    <tr key={row.id} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{formatDate(row.created_at)}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.model}</div>
                        <div className="text-xs text-muted-foreground">{row.provider}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.prompt_key}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{promptText}</div>
                      </td>
                      <td className="py-2 pr-3 text-xs">{PROMPT_GROUPS[row.prompt_key] || "-"}</td>
                      <td className="py-2 pr-3 text-xs">
                        <div>{domain || "-"}</div>
                        <div className="text-muted-foreground">{brand || "-"}</div>
                      </td>
                      <td className="py-2 pr-3">{learning?.winner || row.winner || "-"}</td>
                      <td className="py-2 pr-3">{learning?.category_label || "-"}</td>
                      <td className="py-2 pr-3">{learning?.refusal_type || "-"}</td>
                      <td className="py-2 pr-3 text-xs">{mentions}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRow(row)}>
                            View / Tag
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td className="py-6 text-center text-sm text-muted-foreground" colSpan={10}>
                      No results match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4">
          <div className="w-full max-w-4xl rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Result detail</h3>
                <p className="mt-1 text-sm text-stone-600">{selectedRow.prompt_key}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedRow(null)}>
                Close
              </Button>
            </div>

            {selectedRow.error_text && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {selectedRow.error_text}
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-stone-500">Prompt</div>
                <Textarea
                  readOnly
                  className="mt-2 h-40 font-mono text-sm"
                  value={selectedRow.prompt_text || selectedRow.prompt || ""}
                />
              </div>
              <div>
                <div className="text-xs uppercase text-stone-500">Response</div>
                <Textarea
                  readOnly
                  className="mt-2 h-40 font-mono text-sm"
                  value={selectedRow.response_text || ""}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-stone-500">Extracted (JSON)</div>
                <Textarea
                  readOnly
                  className="mt-2 h-40 font-mono text-xs"
                  value={JSON.stringify(selectedRow.learning_extract || {}, null, 2)}
                />
              </div>
              <div>
                <div className="text-xs uppercase text-stone-500">Tagging</div>
                <div className="mt-2 grid gap-2">
                  {tags.map((tag) => (
                    <label key={tag.key} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTagKeys.includes(tag.key)}
                        onChange={() => {
                          setSelectedTagKeys((prev) =>
                            prev.includes(tag.key) ? prev.filter((key) => key !== tag.key) : [...prev, tag.key]
                          );
                        }}
                      />
                      <span>
                        <span className="font-medium">{tag.label}</span>
                        {tag.description && (
                          <span className="block text-xs text-muted-foreground">{tag.description}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  <label className="text-xs uppercase text-stone-500">Notes</label>
                  <Textarea
                    className="mt-1 h-20 text-sm"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Freeform notes"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button onClick={saveTags} disabled={saving}>
                    {saving ? "Saving..." : "Save tags"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
