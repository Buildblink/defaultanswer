import { NextResponse } from 'next/server'
import { createProject } from '@/lib/brain/db'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  let body: { name?: string; description?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Project name is required' },
      { status: 400 }
    )
  }

  try {
    const project = await createProject(auth.userId, {
      name: body.name.trim(),
      description: body.description ?? null,
    })
    return NextResponse.json({ ok: true, project })
  } catch (error) {
    console.error('[brain/projects/create] Error', error)
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Unable to create project',
      },
      { status: 500 }
    )
  }
}

