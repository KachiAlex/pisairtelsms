import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

export type UserRole = 'super_admin' | 'tenant_admin' | 'student' | 'staff' | 'parent'

export interface DecodedToken {
  userId?: string
  staffId?: string
  parentId?: string
  role: UserRole
  tenantId?: string
  email?: string
  iat?: number
  exp?: number
}

/**
 * Extracts and verifies JWT token from Authorization header.
 * Returns decoded payload if valid, null otherwise.
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key'
    const decoded = jwt.verify(token, secret) as DecodedToken
    return decoded
  } catch {
    return null
  }
}

/**
 * Extracts Bearer token from Authorization header.
 */
export function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

/**
 * Verifies token and checks if user has required role.
 * Returns decoded token if authorized, sends error response and returns null if not.
 */
export function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  allowedRoles: UserRole[]
): DecodedToken | null {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' })
    return null
  }

  const decoded = verifyToken(token)
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
export function requireAuth(req: VercelRequest, res: VercelResponse): DecodedToken | null {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' })
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
    return null
  }

  return decoded
}
