import { NextResponse } from 'next/server'
import { analyzeUrlMultiPage } from '@/lib/defaultanswer/analyze'
import { buildScanRecordFromAnalysis, diffScans, fetchLatestScans, isHistoryConfigured, saveScan } from '@/lib/defaultanswer/history'
import { saveReport, extractDomain } from '@/lib/report/history'

type RequestBody = {
  url?: string
}

export async function POST(req: Request) {
  let body: RequestBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { url } = body

  if (!url) {
    return NextResponse.json(
      { error: 'URL is required' },
      { status: 400 }
    )
  }

  const result = await analyzeUrlMultiPage(url)

  if (result.fallback) {
    return NextResponse.json(
      { ok: true, fallback: true, notes: result.notes, analysis: result.analysis },
      { status: 200 }
    )
  }

  let historyDiff = null
  let reportUrl = null
  const reportId = crypto.randomUUID()

  if (isHistoryConfigured()) {
    try {
      const record = buildScanRecordFromAnalysis(url, result.analysis)
      const savedId = await saveScan(record)
      const latestRes = await fetchLatestScans(url)
      if (latestRes.ok && latestRes.latest) {
        const latest = latestRes.latest
        const prev = latestRes.previous
        const currRecord = { ...record, id: latest.id, created_at: latest.created_at, hash: latest.hash }
        const prevRecord = prev
          ? {
              ...prev,
              signals: prev.signals,
              breakdown: prev.breakdown,
              evidence: prev.evidence,
            }
          : null
        historyDiff = diffScans(prevRecord as any, currRecord as any)
      }

      // Save full report for clean URL access
      const domain = extractDomain(url)
      const savedReport = await saveReport({
        domain,
        reportId,
        userId: null, // TODO: Add user ID when auth is implemented
        analysisData: result.analysis,
        url,
      })

      if (savedReport) {
        reportUrl = `/reports/${domain}`
      }
    } catch (err) {
      console.warn('[analyze history] failed', err)
    }
  }

  return NextResponse.json({
    ok: true,
    fallback: false,
    analysis: result.analysis,
    historyDiff,
    reportUrl, // Clean URL for sharing
    reportId,
  })
}

