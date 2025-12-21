import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

let serverClient: SupabaseClient | null = null
let brainServerClient: SupabaseClient | null = null

function requireServiceRoleKey(): string {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for brain server client')
  }
  return supabaseServiceRoleKey
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClient) {
    serverClient = createClient(resolvedSupabaseUrl, resolvedAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return serverClient
}

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(resolvedSupabaseUrl, requireServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Returns a server-side Supabase client scoped for Brain operations.
 * Uses the service role key to bypass RLS while keeping the anon key for client code unchanged.
 */
export function getBrainServerClient(): SupabaseClient {
  if (brainServerClient) {
    return brainServerClient
  }

  brainServerClient = createClient(resolvedSupabaseUrl, requireServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'brain-server',
      },
    },
  })

  return brainServerClient
}
