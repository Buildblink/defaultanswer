import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = "https://www.defaultanswer.com";

export const metadata: Metadata = {
  title: "Scan History | DefaultAnswer",
  description: "View historical analysis data for websites. Track changes in AI recommendation readiness over time with detailed scan history.",
  alternates: {
    canonical: `${siteUrl}/defaultanswer/history`,
  },
  openGraph: {
    title: "Scan History | DefaultAnswer",
    description: "View historical analysis data and track changes in AI recommendation readiness over time.",
    type: "website",
    images: ["/og.png"],
    url: `${siteUrl}/defaultanswer/history`,
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

async function fetchHistory(url: string, limit = 20) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(`${base}/api/defaultanswer/history/list?url=${encodeURIComponent(url)}&limit=${limit}`, {
    cache: "no-store",
  });
  return res.json();
}

export default async function HistoryPage({ searchParams }: { searchParams?: { url?: string } }) {
  const url = searchParams?.url || "";
  if (!url) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Scan History</h1>
          <p className="text-stone-600 dark:text-stone-400">Provide a URL via ?url= to view history.</p>
        </div>
      </div>
    );
  }

  const data = await fetchHistory(url);

  if (!data.ok) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Scan History</h1>
          <p className="text-red-600 dark:text-red-400 text-sm">{data.error || "History unavailable."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Scan History</h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm">URL: {url}</p>
        </div>

        <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 dark:bg-stone-800 text-left text-stone-600 dark:text-stone-300">
              <tr>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Readiness</th>
                <th className="px-4 py-2">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {(data.scans || []).map((scan: any) => (
                <tr key={scan.id}>
                  <td className="px-4 py-2">{scan.created_at}</td>
                  <td className="px-4 py-2">{scan.score}</td>
                  <td className="px-4 py-2">{scan.readiness}</td>
                  <td className="px-4 py-2 text-xs">{scan.hash?.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <Link href={`/defaultanswer?url=${encodeURIComponent(url)}`} className="text-amber-700 dark:text-amber-300 underline text-sm">
            Run a new scan
          </Link>
        </div>
      </div>
    </div>
  );
}

