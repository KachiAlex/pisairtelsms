import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Apply security headers to the response.
 * Call this at the end of your handler before returning.
 */
export function setSecurityHeaders(res: VercelResponse): void {
  // Content Security Policy (CSP)
  // Restricts sources from which content can be loaded
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
  )

  // X-Frame-Options
  // Prevents clickjacking by disallowing embedding in frames
  res.setHeader('X-Frame-Options', 'DENY')

  // X-Content-Type-Options
  // Prevents MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // X-XSS-Protection
  // Enables XSS filter in browsers (mostly superseded by CSP)
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer-Policy
  // Controls how much referrer information is sent
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy (formerly Feature-Policy)
  // Controls browser features access
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  )

  // Strict-Transport-Security (HSTS)
  // Forces HTTPS connections (only apply in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
}

/**
 * Middleware wrapper that applies security headers.
 * Use this to wrap your handler function.
 */
export function withSecurityHeaders(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req: VercelRequest, res: VercelResponse) => {
    await handler(req, res)
    setSecurityHeaders(res)
  }
}
