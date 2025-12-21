import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const fallbackUrl = 'http://localhost:54321'
const fallbackAnonKey = 'dev-anon-key'
const isVercel = process.env.VERCEL === '1'
const shouldEnforceEnv =
  isVercel || (process.env.NODE_ENV === 'production' && Boolean(process.env.VERCEL))

if (shouldEnforceEnv && (!supabaseUrl || !supabaseAnonKey)) {
  const missing = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null,
  ]
    .filter(Boolean)
    .join(', ')
  throw new Error(`Missing Supabase environment variables: ${missing}`)
}

const resolvedSupabaseUrl = shouldEnforceEnv ? supabaseUrl || '' : supabaseUrl || fallbackUrl
const resolvedAnonKey = shouldEnforceEnv ? supabaseAnonKey || '' : supabaseAnonKey || fallbackAnonKey

if (!shouldEnforceEnv && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    'Supabase environment variables missing; using local fallbacks to keep static pages rendering.'
  )
}

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = createClient(resolvedSupabaseUrl, resolvedAnonKey)

function hostnameFromUrl(rawUrl?: string): string {
  if (!rawUrl) return 'env missing'
  try {
    return new URL(rawUrl).hostname || 'env missing'
  } catch {
    return 'env missing'
  }
}

const envMissing = !supabaseUrl || !supabaseAnonKey
const resolvedHostname = hostnameFromUrl(resolvedSupabaseUrl)

export const supabaseDebugUrl = envMissing
  ? `env missing (${resolvedHostname})`
  : resolvedHostname

