import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

// In-memory store for CSRF tokens (for production, use Redis or database)
const csrfStore = new Map<string, { token: string; expiresAt: number }>()

/**
 * Generate a random CSRF token.
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate and store a CSRF token for a session/user.
 * Returns the token that should be sent to the client.
 */
export function createCSRFToken(sessionId: string, expiresInMs: number = 60 * 60 * 1000): string {
  const token = generateCSRFToken()
  const expiresAt = Date.now() + expiresInMs
  csrfStore.set(`${sessionId}:${token}`, { token, expiresAt })
  return token
}

/**
 * Verify a CSRF token for a session/user.
 * Returns true if valid, false otherwise.
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  const key = `${sessionId}:${token}`
  const entry = csrfStore.get(key)
  
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    csrfStore.delete(key)
    return false
  }
  
  // Token is valid - consume it (single-use)
  csrfStore.delete(key)
  return true
}

/**
 * Extract CSRF token from request.
 * Checks both header (X-CSRF-Token) and body (csrfToken).
 */
export function extractCSRFToken(req: VercelRequest): string | null {
  // Check header first
  const headerToken = req.headers['x-csrf-token'] as string
  if (headerToken) return headerToken
  
  // Check body
  const bodyToken = req.body?.csrfToken
  if (bodyToken) return bodyToken
  
  return null
}

/**
 * CSRF protection middleware.
 * Verifies CSRF token for state-changing requests (POST, PUT, DELETE, PATCH).
 * Returns true if verification fails (error response already sent), false if valid.
 */
export function requireCSRF(req: VercelRequest, res: VercelResponse, sessionId: string): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
    return false
  }
  
  const token = extractCSRFToken(req)
  if (!token) {
    res.status(403).json({ error: 'CSRF token missing' })
    return true
  }
  
  if (!verifyCSRFToken(sessionId, token)) {
    res.status(403).json({ error: 'Invalid or expired CSRF token' })
    return true
  }
  
  return false
}

/**
 * Clean up expired CSRF tokens.
 * Call this periodically to prevent memory leaks.
 */
export function cleanupCSRFStore(): void {
  const now = Date.now()
  for (const [key, entry] of csrfStore.entries()) {
    if (now > entry.expiresAt) {
      csrfStore.delete(key)
    }
  }
}

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCSRFStore, 10 * 60 * 1000)
}
