import type { VercelRequest, VercelResponse } from '@vercel/node'
import { jwtVerify } from 'jose'

export type UserRole = 'super_admin' | 'tenant_admin' | 'student' | 'staff' | 'parent'

export interface DecodedToken {
  userId?: string
  staffId?: string
  studentId?: string
  parentId?: string
  childrenIds?: string[]
  role: UserRole
  tenantId?: string
  email?: string
  sub?: string
  iat?: number
  exp?: number
}

/**
 * Extracts and verifies JWT token from Authorization header or cookie.
 * Returns decoded payload if valid, null otherwise.
 */
export async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as DecodedToken
  } catch {
    return null
  }
}

/**
 * Extracts JWT token from cookie.
 */
export function extractTokenFromCookie(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=')
    acc[name] = value
    return acc
  }, {} as Record<string, string>)
  
  return cookies['auth_token'] || null
}

/**
 * Extracts Bearer token from Authorization header.
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

/**
 * Extracts token from either cookie or Authorization header.
 * Cookie takes priority for httpOnly cookie auth.
 */
export function extractToken(req: VercelRequest): string | null {
  // Try cookie first (httpOnly cookie auth)
  const cookieToken = extractTokenFromCookie(req)
  if (cookieToken) return cookieToken
  
  // Fallback to Authorization header (for backward compatibility)
  return extractTokenFromHeader(req.headers.authorization)
}

/**
 * Verifies token and checks if user has required role.
 * Returns decoded token if authorized, sends error response and returns null if not.
 */
export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  allowedRoles: UserRole[]
): Promise<DecodedToken | null> {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' })
    return null
  }

  const decoded = await verifyToken(token)
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
    return null
  }

  if (!allowedRoles.includes(decoded.role)) {
    res.status(403).json({ error: 'Forbidden: Insufficient permissions' })
    return null
  }

  return decoded
}

/**
 * Verifies token without role check (for endpoints where any authenticated user can access).
 */
export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<DecodedToken | null> {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' })
    return null
  }

  const decoded = await verifyToken(token)
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
    return null
  }

  return decoded
}
