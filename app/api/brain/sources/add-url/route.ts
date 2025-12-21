import { NextResponse } from 'next/server'
import { createUrlSource, setSourceStatus } from '@/lib/brain/db'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  let body: { projectId?: string; url?: string; title?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.projectId || !body.url) {
    return NextResponse.json(
      { ok: false, error: 'projectId and url are required' },
      { status: 400 }
    )
  }

  try {
    const source = await createUrlSource(auth.userId, body.projectId, {
      title: body.title ?? body.url,
      url: body.url,
    })

    // Sources are stored as ready immediately

    return NextResponse.json({ ok: true, source: { ...source, status: 'ready' } })
  } catch (error) {
    console.error('[brain/sources/add-url] Error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to add URL' },
      { status: 500 }
    )
  }
}

