import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/brain/auth'
import { getProjectById } from '@/lib/brain/db'
import { analyzeProjectForDefaultAnswer } from '@/lib/brain/analysis/defaultanswer'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  let body: {
    projectId?: string
    brandNames?: string[]
    competitorNames?: string[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.projectId) {
    return NextResponse.json(
      { ok: false, error: 'projectId is required' },
      { status: 400 }
    )
  }

  const project = await getProjectById(auth.userId, body.projectId)
  if (!project) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 })
  }

  try {
    const analysis = await analyzeProjectForDefaultAnswer({
      userId: auth.userId,
      projectId: body.projectId,
      brandNames: body.brandNames || [],
      competitorNames: body.competitorNames || [],
    })

    return NextResponse.json({ ok: true, ...analysis })
  } catch (error) {
    console.error('[brain/analyze-defaultanswer] Error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

