import type { ApiRequest, ApiResponse } from './http-types.js'
import { jwtVerify } from 'jose'
import { getJwtSecret } from './jwt-secret.js'
import { touchSession, adoptLegacySession, userStillActive } from './session-tracker.js'

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
  /** Tracked session id (user_sessions.id). Present on tokens issued after session tracking went live. */
  sid?: string
}

/**
 * When the token carries a tracked session id, validate it against
 * user_sessions: terminated or expired sessions are rejected immediately so
 * force-logout actually takes effect. A database error fails open (log +
 * allow) so an outage doesn't lock everyone out.
 */
/**
 * Validates the session backing this request. Tokens with a sid check the row
 * directly; sid-less tokens issued before tracking went live are adopted into
 * user_sessions (keyed by a token hash) so they show up in session management
 * and respect termination. A database error fails open (log + allow) so an
 * outage doesn't lock everyone out.
 */
async function sessionStillValid(decoded: DecodedToken, token: string, req: ApiRequest): Promise<boolean> {
  try {
    if (decoded.sid) {
      if (!(await touchSession(decoded.sid))) return false
    } else if (decoded.tenantId) {
      if (!(await adoptLegacySession(decoded, token, req))) return false
    }
    // Reject tokens whose account was deleted or deactivated — otherwise a
    // JWT stays usable until expiry regardless of account state.
    return await userStillActive(decoded)
  } catch (error) {
    console.error('Session validation error:', error)
    return true
  }
}

/**
 * Extracts and verifies JWT token from Authorization header or cookie.
 * Returns decoded payload if valid, null otherwise.
 */
export async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as DecodedToken
  } catch {
    return null
  }
}

/**
 * Extracts JWT token from cookie.
 */
export function extractTokenFromCookie(req: ApiRequest): string | null {
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
export function extractToken(req: ApiRequest): string | null {
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
  req: ApiRequest,
  res: ApiResponse,
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

  if (!(await sessionStillValid(decoded, token, req))) {
    res.status(401).json({ error: 'Session terminated' })
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
export async function requireAuth(req: ApiRequest, res: ApiResponse): Promise<DecodedToken | null> {
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

  if (!(await sessionStillValid(decoded, token, req))) {
    res.status(401).json({ error: 'Session terminated' })
    return null
  }

  return decoded
}

/**
 * Extracts tenantId from the decoded JWT token.
 * The tenantId from the token is authoritative and cannot be overridden by headers.
 * Returns null if the token is invalid or has no tenantId.
 * Sends appropriate error response if authentication fails.
 */
export async function getTenantIdFromRequest(
  req: ApiRequest,
  res: ApiResponse
): Promise<string | null> {
  const decoded = await requireAuth(req, res)
  if (!decoded) return null

  if (!decoded.tenantId) {
    res.status(403).json({ error: 'Forbidden: No tenant associated with this account' })
    return null
  }

  return decoded.tenantId
}
