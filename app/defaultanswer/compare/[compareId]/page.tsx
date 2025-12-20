import type { CompareResponseSuccess } from "@/lib/defaultanswer/compare";
import type { BreakdownItem, ExtractedData } from "@/lib/defaultanswer/scoring";

async function fetchSavedCompare(compareId: string): Promise<CompareResponseSuccess | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/defaultanswer/compare/get?compareId=${compareId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data?.ok && data.payload?.ok) {
      return data.payload as CompareResponseSuccess;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function ComparePermalinkPage({ params }: { params: { compareId: string } }) {
  const payload = await fetchSavedCompare(params.compareId);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 px-6">
        <div className="max-w-xl text-center space-y-3">
          <h1 className="text-2xl font-bold">Compare not found</h1>
          <p className="text-stone-600 dark:text-stone-400">We could not load this compare link. It may have been removed.</p>
        </div>
      </div>
    );
  }

  const sideA = payload.a;
  const sideB = payload.b;
  const diff = payload.diff;
  const breakdownRows = buildBreakdownRows(sideA.breakdown, sideB.breakdown);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wide">DefaultAnswer</p>
          <h1 className="text-3xl font-bold">Compare Report</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {sideA.url} vs {sideB.url}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3 items-start">
          <ScoreCard title="You" score={sideA.score} readiness={sideA.readiness.label} url={sideA.url} />
          <ScoreCard title="Competitor" score={sideB.score} readiness={sideB.readiness.label} url={sideB.url} />
          <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
            <p className="text-sm text-stone-500">Score Delta</p>
            <p className="text-2xl font-semibold mt-1">
              {diff.scoreDelta > 0
                ? `You are ${diff.scoreDelta} points behind`
                : diff.scoreDelta === 0
                  ? "Tied"
                  : `You lead by ${Math.abs(diff.scoreDelta)} points`}
            </p>
            <p className="text-xs text-stone-500 mt-1">Positive means competitor ahead.</p>
          </div>
        </section>

        <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-3">Side-by-side Breakdown</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-stone-500">
              <tr>
                <th className="py-2 pr-4">Signal</th>
                <th className="py-2 pr-4">You</th>
                <th className="py-2 pr-4">Competitor</th>
                <th className="py-2 pr-4">Max</th>
                <th className="py-2 pr-4">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {breakdownRows.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-4">{row.label}</td>
                  <td className="py-2 pr-4">{row.aPoints}/{row.max}</td>
                  <td className="py-2 pr-4">{row.bPoints}/{row.max}</td>
                  <td className="py-2 pr-4">{row.max}</td>
                  <td className={`py-2 pr-4 ${row.delta > 0 ? "text-red-600" : row.delta < 0 ? "text-green-600" : "text-stone-600"}`}>
                    {row.delta > 0 ? `-${row.delta}` : row.delta < 0 ? `+${Math.abs(row.delta)}` : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card title="Biggest gaps (competitor advantage)">
            <ul className="list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
              {diff.biggestGaps.length === 0 && <li>No significant gaps detected.</li>}
              {diff.biggestGaps.map((gap, idx) => (
                <li key={idx}>
                  <span className="font-semibold">{gap.label}</span> — competitor +{gap.delta} ({gap.aPoints}/{gap.max} vs {gap.bPoints}/{gap.max})
                  {gap.suggestedAction !== "—" && <div className="text-xs text-stone-500 mt-1">Action: {gap.suggestedAction}</div>}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Quick wins for you">
            <ul className="list-disc list-inside space-y-2 text-sm text-stone-700 dark:text-stone-300">
              {diff.quickWins.length === 0 && <li>No quick wins detected.</li>}
              {diff.quickWins.map((gap, idx) => (
                <li key={idx}>
                  <span className="font-semibold">{gap.label}</span> — {gap.suggestedAction}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <EvidencePanel title="Your evidence" extracted={sideA.extracted} />
          <EvidencePanel title="Competitor evidence" extracted={sideB.extracted} />
        </section>
      </div>
    </div>
  );
}

function ScoreCard({ title, score, readiness, url }: { title: string; score: number; readiness: string; url: string }) {
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
      <p className="text-sm text-stone-500">{title}</p>
      <p className="text-xs text-stone-500">{url}</p>
      <p className="text-3xl font-semibold mt-1">{score}</p>
      <p className="text-sm text-stone-600 dark:text-stone-400">{readiness}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function buildBreakdownRows(a: BreakdownItem[], b: BreakdownItem[]) {
  const map = new Map<string, { label: string; max: number; aPoints: number; bPoints: number }>();
  const add = (items: BreakdownItem[], keySide: "aPoints" | "bPoints") => {
    for (const item of items) {
      const key = `${item.category}::${item.label}`;
      if (!map.has(key)) {
        map.set(key, { label: `${item.category}: ${item.label}`, max: item.max, aPoints: 0, bPoints: 0 });
      }
      const entry = map.get(key)!;
      entry[keySide] = item.points;
      entry.max = item.max || entry.max;
      map.set(key, entry);
    }
  };
  add(a, "aPoints");
  add(b, "bPoints");
  return Array.from(map.entries()).map(([key, value]) => ({
    key,
    ...value,
    delta: value.bPoints - value.aPoints,
  }));
}

function EvidencePanel({ title, extracted }: { title: string; extracted: ExtractedData }) {
  const evidence = extracted.evidence;
  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-3 space-y-2 text-sm text-stone-700 dark:text-stone-300">
        {extracted.title && <div><span className="font-semibold">Title:</span> {extracted.title}</div>}
        {extracted.h1s?.[0] && <div><span className="font-semibold">H1:</span> {extracted.h1s[0]}</div>}
        {evidence?.pricingEvidence?.[0] && <div><span className="font-semibold">Pricing:</span> {evidence.pricingEvidence[0]}</div>}
        {evidence?.faqEvidence && (
          <div>
            <span className="font-semibold">FAQ:</span>{" "}
            {evidence.faqEvidence.explicitFaqDetected
              ? "Explicit FAQ found"
              : evidence.faqEvidence.indirectFaqLinks.length
                ? "Indirect FAQ links"
                : "No FAQ signals"}
          </div>
        )}
        {extracted.schemaTypes?.length ? (
          <div>
            <span className="font-semibold">Schema types:</span> {extracted.schemaTypes.slice(0, 3).join(", ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
