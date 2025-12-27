"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SweepRow = {
  id: string;
  created_at: string;
  label: string;
  prompt_set_version: string;
  prompts_count: number;
  models: Array<{ provider: string; model: string }>;
  notes: string | null;
};

type SweepResultRow = {
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
  usage_json: unknown | null;
  error_text: string | null;
  latency_ms: number | null;
  mentioned: boolean;
  mention_rank: number | null;
  winner: string | null;
  alternatives: string[];
  confidence: number;
};

type LatestResponse = {
  sweeps: SweepRow[];
};

type ResultsResponse = {
  results: SweepResultRow[];
};

type RunSummary = {
  ok: boolean;
  debugId: string;
  sweepId: string;
  attempted: number;
  inserted: number;
  failed: number;
  errors: string[];
  first_error?: string | null;
};

const TOKEN_KEY = "defaultanswer_admin_token";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatPercent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function pickTopWinners(rows: SweepResultRow[], provider: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.provider !== provider) continue;
    const winner = (row.winner || "").trim();
    if (!winner) continue;
    counts.set(winner, (counts.get(winner) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([winner, count]) => `${winner} (${count})`);
}

export default function AdminSweepsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [label, setLabel] = useState("manual");
  const [category, setCategory] = useState("LLM recommendation readiness audit for websites/brands");
  const [brandName, setBrandName] = useState("DefaultAnswer");
  const [domain, setDomain] = useState("defaultanswer.com");
  const [useOpenAi, setUseOpenAi] = useState(true);
  const [useAnthropic, setUseAnthropic] = useState(true);
  const [limitPrompts, setLimitPrompts] = useState(15);
  const [preset, setPreset] = useState("default");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [data, setData] = useState<LatestResponse | null>(null);
  const [results, setResults] = useState<SweepResultRow[]>([]);
  const [selectedSweepId, setSelectedSweepId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<SweepResultRow | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramToken = params.get("token");
    if (paramToken) {
      setToken(paramToken);
      window.localStorage.setItem(TOKEN_KEY, paramToken);
      params.delete("token");
      const next = params.toString();
      router.replace(next ? `/admin/sweeps?${next}` : "/admin/sweeps");
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void loadLatest(token);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedSweepId) return;
    void loadResults(token, selectedSweepId);
  }, [token, selectedSweepId]);

  async function loadLatest(currentToken: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sweep/latest", {
        headers: { "x-admin-token": currentToken },
      });
      const json = (await res.json()) as LatestResponse | { error: string };
      if (!res.ok) {
        throw new Error("error" in json ? json.error : "Failed to load sweeps.");
      }
      setData(json as LatestResponse);
      const latest = (json as LatestResponse).sweeps?.[0]?.id || null;
      const activeId = selectedSweepId || latest;
      if (activeId) {
        setSelectedSweepId(activeId);
        await loadResults(currentToken, activeId);
      } else {
        setResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sweeps.");
    } finally {
      setLoading(false);
    }
  }

  async function loadResults(currentToken: string, sweepId: string) {
    try {
      const res = await fetch(`/api/admin/sweep/results?sweepId=${encodeURIComponent(sweepId)}`, {
        headers: { "x-admin-token": currentToken },
      });
      const json = (await res.json()) as ResultsResponse | { error: string };
      if (!res.ok) {
        throw new Error("error" in json ? json.error : "Failed to load results.");
      }
      setResults((json as ResultsResponse).results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results.");
      setResults([]);
    }
  }

  async function runSweep() {
    if (!token) {
      setError("Admin token required.");
      return;
    }
    setRunning(true);
    setError(null);
    setDebugInfo(null);
    try {
      const res = await fetch("/api/admin/sweep/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          label,
          category,
          brandName,
          domain,
          providers: { openai: useOpenAi, anthropic: useAnthropic },
          limitPrompts,
          preset: preset === "default" ? undefined : preset,
        }),
      });
      const json = (await res.json()) as RunSummary | Record<string, unknown>;
      if (!res.ok) {
        const errorPayload = json as {
          debugId?: string;
          stage?: string;
          error?: { message?: string } | string;
        };
        const message =
          typeof errorPayload.error === "string"
            ? errorPayload.error
            : errorPayload.error?.message || "Sweep failed.";
        setDebugInfo(errorPayload as Record<string, unknown>);
        setRunSummary(null);
        throw new Error(message);
      }
      setRunSummary(json as RunSummary);
      await loadLatest(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sweep failed.");
    } finally {
      setRunning(false);
    }
  }

  const selectedSweep = data?.sweeps?.find((sweep) => sweep.id === selectedSweepId) || null;
  const selectedResults = useMemo(() => {
    if (!selectedSweepId) return [];
    return results.filter((row) => row.sweep_id === selectedSweepId);
  }, [results, selectedSweepId]);

  const summary = useMemo(() => {
    const total = selectedResults.length;
    const mentioned = selectedResults.filter((row) => row.mentioned).length;
    const top1 = selectedResults.filter((row) => row.mention_rank === 1).length;
    return {
      total,
      mentioned,
      top1,
      mentionRate: formatPercent(mentioned, total),
      top1Rate: formatPercent(top1, total),
      winnersOpenAi: pickTopWinners(selectedResults, "openai"),
      winnersAnthropic: pickTopWinners(selectedResults, "anthropic"),
    };
  }, [selectedResults]);

  function getPromptText(row: SweepResultRow) {
    return row.prompt_text || row.prompt || "";
  }

  async function copyToClipboard(text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Copy failed. Try selecting the text manually.");
    }
  }

  function downloadSweepJson() {
    if (!selectedSweep) return;
    const payload = {
      sweep: selectedSweep,
      results: selectedResults,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sweep-${selectedSweep.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>AI Prompt Sweeps</CardTitle>
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
            <div className="space-y-1">
              <label className="text-sm font-medium">Sweep label</label>
              <Input value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <Input value={category} onChange={(event) => setCategory(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Brand name</label>
              <Input value={brandName} onChange={(event) => setBrandName(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Domain</label>
              <Input value={domain} onChange={(event) => setDomain(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Prompt limit</label>
              <Input
                type="number"
                min={1}
                max={15}
                value={limitPrompts}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setLimitPrompts(Number.isFinite(next) && next > 0 ? next : 1);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Preset</label>
              <select
                value={preset}
                onChange={(event) => setPreset(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="default">Default</option>
                <option value="learning_v1_1">Learning v1.1</option>
                <option value="learning_confidence_gate_v1">Learning: confidence gate (1 prompt)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useOpenAi} onChange={() => setUseOpenAi((v) => !v)} />
              OpenAI
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useAnthropic} onChange={() => setUseAnthropic((v) => !v)} />
              Anthropic
            </label>
            <Button onClick={runSweep} disabled={running || !token || (!useOpenAi && !useAnthropic)}>
              {running ? "Running sweep..." : "Run sweep now"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!token) return;
                void loadLatest(token);
              }}
              disabled={loading || !token}
            >
              Refresh
            </Button>
            {loading && <span className="text-muted-foreground">Loading sweeps...</span>}
            {error && (
              <div className="flex flex-wrap items-center gap-2 text-red-500">
                <span>{error}</span>
                {debugInfo && (
                  <>
                    <span className="text-xs text-red-400">
                      DebugId: {(debugInfo.debugId as string) || "unknown"}
                    </span>
                    <span className="text-xs text-red-400">
                      Stage: {(debugInfo.stage as string) || "unknown"}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(JSON.stringify(debugInfo, null, 2))}
                    >
                      Copy debug info
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          {runSummary && (
            <div className="text-sm">
              Inserted {runSummary.inserted}/{runSummary.attempted}
              {runSummary.inserted === 0 && (
                <span className="ml-2 text-red-500">
                  No results stored (check DB/RLS/service role)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Latest sweeps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.sweeps?.length ? (
              data.sweeps.map((sweep) => (
                <button
                  key={sweep.id}
                  onClick={() => setSelectedSweepId(sweep.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    selectedSweepId === sweep.id
                      ? "border-foreground/50 bg-foreground/5"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="font-medium">{sweep.label || "manual"}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(sweep.created_at)}</div>
                  <div className="text-xs text-muted-foreground">
                    {sweep.prompts_count} prompts - {sweep.prompt_set_version}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No sweeps yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSweep ? (
              <>
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Mention rate</div>
                    <div className="text-lg font-semibold">
                      {summary.mentionRate} ({summary.mentioned}/{summary.total})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Top-1 rate</div>
                    <div className="text-lg font-semibold">
                      {summary.top1Rate} ({summary.top1}/{summary.total})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Sweep</div>
                    <div className="text-sm font-medium">{selectedSweep.label}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(selectedSweep.created_at)}</div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Top winners (OpenAI)</div>
                    <div>{summary.winnersOpenAi.join(", ") || "None"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Top winners (Anthropic)</div>
                    <div>{summary.winnersAnthropic.join(", ") || "None"}</div>
                  </div>
                </div>

                <div>
                  <Button variant="outline" size="sm" onClick={downloadSweepJson}>
                    Download JSON
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2">Provider</th>
                        <th className="py-2">Model</th>
                        <th className="py-2">Prompt</th>
                        <th className="py-2">Mentioned</th>
                        <th className="py-2">Rank</th>
                        <th className="py-2">Winner</th>
                        <th className="py-2">Alternatives</th>
                        <th className="py-2">Confidence</th>
                        <th className="py-2">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResults.map((row) => (
                        <tr key={row.id} className="border-b border-border/60 align-top">
                          <td className="py-2 pr-3 font-medium">{row.provider}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{row.model}</td>
                          <td className="py-2 pr-3">
                            <div className="font-medium">{row.prompt_key}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {getPromptText(row)}
                            </div>
                          </td>
                          <td className="py-2 pr-3">{row.mentioned ? "Yes" : "No"}</td>
                          <td className="py-2 pr-3">{row.mention_rank ?? "-"}</td>
                          <td className="py-2 pr-3">{row.winner || "-"}</td>
                          <td className="py-2 pr-3">
                            {(row.alternatives || []).length ? row.alternatives.join(", ") : "-"}
                          </td>
                          <td className="py-2 pr-3">{row.confidence}</td>
                          <td className="py-2 pr-3">
                            <Button variant="outline" size="sm" onClick={() => setSelectedRow(row)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Select a sweep to view results.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Sweep result details</h3>
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
                <textarea
                  readOnly
                  className="mt-2 h-40 w-full rounded-md border border-stone-200 bg-stone-50 p-3 text-sm font-mono text-stone-800"
                  value={getPromptText(selectedRow)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(getPromptText(selectedRow))}
                >
                  Copy
                </Button>
              </div>
              <div>
                <div className="text-xs uppercase text-stone-500">Response</div>
                <textarea
                  readOnly
                  className="mt-2 h-40 w-full rounded-md border border-stone-200 bg-stone-50 p-3 text-sm font-mono text-stone-800"
                  value={selectedRow.response_text || ""}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(selectedRow.response_text || "")}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-xs uppercase text-stone-500">Extracted</div>
                <div className="mt-2 space-y-1">
                  <div>Winner: {selectedRow.winner || "-"}</div>
                  <div>Alternatives: {selectedRow.alternatives?.join(", ") || "-"}</div>
                  <div>Mentioned: {selectedRow.mentioned ? "Yes" : "No"}</div>
                  <div>Rank: {selectedRow.mention_rank ?? "-"}</div>
                  <div>Confidence: {selectedRow.confidence}</div>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-stone-500">Debug</div>
                <div className="mt-2 space-y-1">
                  <div>Provider: {selectedRow.provider}</div>
                  <div>Model: {selectedRow.model}</div>
                  <div>Latency: {selectedRow.latency_ms ?? "-"} ms</div>
                  <div>
                    Tokens:{" "}
                    {selectedRow.usage_json ? JSON.stringify(selectedRow.usage_json) : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
