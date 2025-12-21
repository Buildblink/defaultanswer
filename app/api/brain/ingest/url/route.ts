import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'URL ingestion pipeline is not available yet. Coming soon.',
    },
    { status: 501 }
  )
}

