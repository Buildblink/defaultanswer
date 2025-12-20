import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/supabase/client'
import { isValidUrl, normalizeUrl } from '@/lib/defaultanswer/url-utils'

type LeadPayload = {
  url?: string
  email?: string
  source?: string
  reportId?: string
}

export async function POST(req: Request) {
  let body: LeadPayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true }) // Graceful: don't fail on bad JSON
  }

  const { url, email, source, reportId } = body

  // Validate URL if provided
  if (url && !isValidUrl(url)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid URL format' },
      { status: 400 }
    )
  }

  const normalizedUrl = url ? normalizeUrl(url) : null
  const leadData = {
    url: normalizedUrl,
    email: email || null,
    source: source || 'defaultanswer',
    report_id: reportId || null,
    created_at: new Date().toISOString(),
  }

  // Try to persist to Supabase
  let insertedId: string | undefined

  try {
    // Try inserting into 'leads' table (generic)
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select('id')
      .single()

    if (error) {
      // Table might not exist or insert failed - log and continue
      console.log('[leads/defaultanswer] Supabase insert failed:', error.message)
      console.log('[leads/defaultanswer] Lead captured (logged):', leadData)
    } else if (data?.id) {
      insertedId = data.id
    }
  } catch (err) {
    // Supabase client might not be configured - log and continue
    console.log('[leads/defaultanswer] Supabase error:', err instanceof Error ? err.message : err)
    console.log('[leads/defaultanswer] Lead captured (logged):', leadData)
  }

  // Always return success per DEFAULTANSWER_RULES.md (graceful degradation)
  return NextResponse.json({ ok: true, id: insertedId })
}

