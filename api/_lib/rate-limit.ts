import type { VercelRequest, VercelResponse } from '@vercel/node'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (for production, use Redis or Vercel KV)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limiting middleware.
 * Limits requests per IP address within a time window.
 *
 * @param req - Vercel request
 * @param res - Vercel response
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limit exceeded, false otherwise
 */
export function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minute default
): boolean {
  const identifier = getIdentifier(req)
  const now = Date.now()

  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    // First request or window expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return false
  }

  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString())
    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
    })
    return true
  }

  // Increment count
  entry.count++
  rateLimitStore.set(identifier, entry)
  return false
}

/**
 * Get identifier for rate limiting (IP address or user ID from token).
 */
function getIdentifier(req: VercelRequest): string {
  // Try to get user ID from token for authenticated requests
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7)
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        if (payload.userId || payload.staffId || payload.parentId) {
          return `user:${payload.userId || payload.staffId || payload.parentId}`
        }
      }
    } catch { /* ignore */ }
  }

  // Fall back to IP address
  const ip = req.headers['x-forwarded-for'] as string
    || req.headers['x-real-ip'] as string
    || 'unknown'
  return `ip:${ip}`
}

/**
 * Clean up expired entries from the rate limit store.
 * Call this periodically to prevent memory leaks.
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}
