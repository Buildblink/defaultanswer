import type { SupabaseClient } from '@supabase/supabase-js'
import { getBrainServerClient } from '@/lib/supabase/server'

const BRAIN_BUCKET = 'brain'

type UploadResult = {
  path: string
  bucket: string
}

type DownloadResult = {
  buffer: Buffer
  path: string
}

export async function uploadBrainFile(
  client: SupabaseClient,
  file: Blob | Buffer | ArrayBuffer,
  objectPath: string
): Promise<UploadResult> {
  const { data, error } = await client.storage
    .from(BRAIN_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error || !data) {
    throw new Error(`Failed to upload to storage: ${error?.message || 'upload error'}`)
  }

  return { path: data.path, bucket: BRAIN_BUCKET }
}

export async function downloadBrainFile(filePath: string): Promise<DownloadResult> {
  const client = getBrainServerClient()
  const { data, error } = await client.storage.from(BRAIN_BUCKET).download(filePath)
  if (error || !data) {
    throw new Error(error?.message || 'Unable to download file from storage')
  }

  const arrayBuffer = await data.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    path: filePath,
  }
}

