import { NextResponse } from 'next/server'
import { createFileSource } from '@/lib/brain/db'
import { getUserIdFromRequest } from '@/lib/brain/auth'
import { uploadBrainFile } from '@/lib/brain/storage'
import { getBrainServerClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await getUserIdFromRequest(req)
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const formData = await req.formData()
  const projectId = formData.get('projectId') as string | null
  const file = formData.get('file') as File | null

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    )
  }

  if (!file) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop() || 'bin'
    const objectPath = `${auth.userId}/${projectId}/${Date.now()}.${ext}`

    const storageClient = getBrainServerClient()
    const uploadResult = await uploadBrainFile(storageClient, buffer, objectPath)

    const source = await createFileSource(auth.userId, projectId, {
      title: file.name,
      storagePath: uploadResult.path,
      originalFileName: file.name,
    })

    return NextResponse.json({
      source,
      storage: uploadResult,
    })
  } catch (error) {
    console.error('[brain/sources/upload] Error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
