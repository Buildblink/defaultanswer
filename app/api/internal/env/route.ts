import { NextResponse } from 'next/server'

function hostnameFromUrl(rawUrl?: string): string {
  if (!rawUrl) return 'localhost'
  try {
    return new URL(rawUrl).hostname || 'localhost'
  } catch {
    return 'localhost'
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const resolvedSupabaseUrl = hostnameFromUrl(supabaseUrl)

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    resolvedSupabaseUrl,
  })
}
