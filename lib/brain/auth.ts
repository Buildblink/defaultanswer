import { supabase } from '@/lib/supabase/client'

type AuthResult =
  | { userId: string; error?: undefined }
  | { userId: null; error: string }

/**
 * Resolve the authenticated user from a request.
 * - Prefers Bearer token (Supabase session access token)
 * - Falls back to custom headers for internal calls (`x-user-id`).
 */
export async function getUserIdFromRequest(req: Request): Promise<AuthResult> {
  const headerUserId =
    req.headers.get('x-user-id') || req.headers.get('x-rww-user-id')
  if (headerUserId) {
    return { userId: headerUserId }
  }

  const authHeader = req.headers.get('authorization')
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null

  if (!token) {
    return { userId: null, error: 'Missing Authorization header' }
  }

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return { userId: null, error: 'Invalid or expired token' }
    }

    return { userId: data.user.id }
  } catch (error) {
    console.error('[brain/auth] Failed to resolve user', error)
    return { userId: null, error: 'Unable to verify user' }
  }
}

