import { NextResponse } from 'next/server'
import { semanticSearchProject } from '@/lib/brain/search'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let body: { projectId?: string; query?: string; topK?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.projectId || !body.query) {
    return NextResponse.json(
      { error: 'projectId and query are required' },
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

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[brain/search] Error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}

