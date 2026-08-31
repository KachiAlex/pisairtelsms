import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Get client IP address from request.
 */
export function getClientIP(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
    || (req.headers['x-real-ip'] as string)
    || 'unknown'
}

/**
 * Check if IP is in allowed list.
 */
export function isIPAllowed(ip: string, allowedIPs: string[]): boolean {
  if (allowedIPs.length === 0) return true // No restrictions
  return allowedIPs.includes(ip)
}

/**
 * Check if IP is in blocked list.
 */
export function isIPBlocked(ip: string, blockedIPs: string[]): boolean {
  return blockedIPs.includes(ip)
}

/**
 * IP restriction middleware.
 * Returns true if access denied (error response already sent), false if allowed.
 */
export function requireAllowedIP(
  req: VercelRequest,
  res: VercelResponse,
  allowedIPs: string[] = []
): boolean {
  if (allowedIPs.length === 0) return false // No restrictions

  const ip = getClientIP(req)
  if (!isIPAllowed(ip, allowedIPs)) {
    res.status(403).json({ error: 'Forbidden: IP address not allowed' })
    return true
  }

  return false
}

/**
 * IP blocking middleware.
 * Returns true if access denied (error response already sent), false if allowed.
 */
export function requireNotBlockedIP(
  req: VercelRequest,
  res: VercelResponse,
  blockedIPs: string[] = []
): boolean {
  if (blockedIPs.length === 0) return false // No blocks

  const ip = getClientIP(req)
  if (isIPBlocked(ip, blockedIPs)) {
    res.status(403).json({ error: 'Forbidden: IP address is blocked' })
    return true
  }

  return false
}

/**
 * Check if IP is from a trusted internal network (e.g., VPN, office network).
 */
export function isInternalIP(ip: string, internalCIDRs: string[] = []): boolean {
  if (internalCIDRs.length === 0) return false

  // Simple check for common private IP ranges
  const privateRanges = [
    /^10\./,          // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
    /^192\.168\./,    // 192.168.0.0/16
    /^127\./,         // localhost
    /^::1$/,          // IPv6 localhost
    /^fc00:/,         // IPv6 unique local
  ]

  for (const range of privateRanges) {
    if (range.test(ip)) return true
  }

  // Check against custom CIDRs (simplified - for production use ip-cidr library)
  for (const cidr of internalCIDRs) {
    if (ip.startsWith(cidr.replace(/\/\d+$/, ''))) return true
  }

  return false
}
