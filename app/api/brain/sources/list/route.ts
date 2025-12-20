import { NextResponse } from 'next/server'
import { getSourcesForProject } from '@/lib/brain/db'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function GET(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    )
  }

  try {
    const sources = await getSourcesForProject(auth.userId, projectId)
    return NextResponse.json({ sources })
  } catch (error) {
    console.error('[brain/sources/list] Error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    )
  }
}
