/**
 * URL utilities for DefaultAnswer
 * Minimal validation aligned with DEFAULTANSWER_RULES.md:
 * - Graceful degradation
 * - Never block the user unnecessarily
 */

/**
 * Normalizes a URL input:
 * - Trims whitespace
 * - Adds https:// if no protocol present
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  
  // If already has a protocol, return as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  
  // Add https:// prefix
  return `https://${trimmed}`
}

/**
 * Validates a URL with minimal rules:
 * - Must not be empty after trim
 * - Must not contain spaces
 * - Must contain at least one dot (basic domain check)
 * 
 * Intentionally lenient to avoid rejecting legit URLs.
 */
export function isValidUrl(input: string): boolean {
  const trimmed = input.trim()
  
  // Must not be empty
  if (!trimmed) return false
  
  // Must not contain spaces
  if (/\s/.test(trimmed)) return false
  
  // Must contain at least one dot
  if (!trimmed.includes('.')) return false
  
  return true
}


