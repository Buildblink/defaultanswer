import { NextResponse } from 'next/server'
import { semanticSearchProject } from '@/lib/brain/search'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  let body: { projectId?: string; query?: string; topK?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.projectId || !body.query) {
    return NextResponse.json(
      { ok: false, error: 'projectId and query are required' },
      { status: 400 }
    )
  }

  try {
    const results = await semanticSearchProject(
      auth.userId,
      body.projectId,
      body.query,
      body.topK || 8
    )

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error('[brain/search] Error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}

