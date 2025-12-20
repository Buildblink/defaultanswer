import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const fallbackUrl = 'http://localhost:54321'
const fallbackAnonKey = 'dev-anon-key'
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
const isServer = typeof window === 'undefined'

if (isProd && isServer && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in production.'
  )
}

const resolvedSupabaseUrl = isProd ? (supabaseUrl || '') : supabaseUrl || fallbackUrl
const resolvedAnonKey = isProd ? (supabaseAnonKey || '') : supabaseAnonKey || fallbackAnonKey

if (!isProd && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    'Supabase environment variables missing; using local fallbacks to keep static pages rendering.'
  )
}

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = createClient(resolvedSupabaseUrl, resolvedAnonKey)

// Server-side Supabase client (uses service role key, bypasses RLS)
// Use this for backend operations like agent workflows, cron jobs, etc.
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(resolvedSupabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase // Fallback to regular client if service key not available

let brainServerClient: SupabaseClient | null = null

function requireServiceRoleKey(): string {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for brain server client')
  }
  return supabaseServiceRoleKey
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

// Type definitions for database tables
export type Post = {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  status: 'draft' | 'scheduled' | 'published'
  category?: string
  tags?: string[]
  featured_image?: string
  thumbnail_url?: string
  seo_title?: string
  seo_description?: string
  affiliate_links?: Record<string, any>
  publish_date?: string
  created_by_agent?: string // Agent name that created the post
  created_by_user?: string // User ID (UUID) that created the post
  updated_by_user?: string // User ID (UUID) that last updated the post
  created_at: string
  updated_at: string
}

export type Agent = {
  id: string
  name: string
  role: 'researcher' | 'writer' | 'seo' | 'analytics' | 'publisher'
  llm_provider: 'claude' | 'openai' | 'google'
  model: string
  system_prompt: string
  tools?: string[]
  config?: Record<string, any>
  is_active: boolean
  created_at: string
}

export type Task = {
  id: string
  workflow_id?: string
  agent_id?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  input?: Record<string, any>
  output?: Record<string, any>
  error?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
  created_at: string
}

