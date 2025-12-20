import { NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/brain/auth'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  return NextResponse.json({
    success: false,
    message: 'URL ingestion pipeline is not available yet. Coming soon.',
  })
}

