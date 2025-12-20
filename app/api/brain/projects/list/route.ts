import { NextResponse } from 'next/server'
import { getProjectsForUser } from '@/lib/brain/db'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function GET(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const projects = await getProjectsForUser(auth.userId)
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('[brain/projects/list] Error', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to fetch projects',
      },
      { status: 500 }
    )
  }
}
