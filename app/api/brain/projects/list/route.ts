import { NextResponse } from 'next/server'
import { getProjectsForUser } from '@/lib/brain/db'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function GET(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  try {
    const projects = await getProjectsForUser(auth.userId)
    return NextResponse.json({ ok: true, projects })
  } catch (error) {
    console.error('[brain/projects/list] Error', error)
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Unable to fetch projects',
      },
      { status: 500 }
    )
  }
}

