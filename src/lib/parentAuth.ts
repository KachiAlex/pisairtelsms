/**
 * Parent authentication utilities for JWT extraction and validation
 * Validates: Requirements 1.4, 13.3, 13.5
 */

export interface ParentJWTPayload {
  parentId: string
  childrenIds: string[]
  role: 'parent'
  email: string
  iat?: number
  exp?: number
}

/**
 * Extracts parent information from JWT token
 * @param token - JWT token string
 * @returns Parent info (parentId, childrenIds) or null if invalid
 */
export function extractParentInfoFromJWT(token: string): ParentJWTPayload | null {
  try {
    if (!token) return null

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token

    // Decode without verification first (for client-side use)
    // In production, verify with secret on backend
    const parts = cleanToken.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

    // Validate required fields
    if (!payload.parentId || !Array.isArray(payload.childrenIds) || payload.role !== 'parent') {
      return null
    }

    return payload as ParentJWTPayload
  } catch {
    return null
  }
}

/**
 * Verifies parent-child relationship
 * @param parentId - Parent ID from token
 * @param childId - Child ID to verify
 * @param childrenIds - List of linked children from token
 * @returns true if relationship is valid, false otherwise
 */
export function verifyParentChildRelationship(
  parentId: string,
  childId: string,
  childrenIds: string[]
): boolean {
  if (!parentId || !childId || !childrenIds) {
    return false
  }

  // Verify childId is in parent's linked children
  return childrenIds.includes(childId)
}

/**
 * Validates JWT token expiration
 * @param token - JWT token string
 * @returns true if token is valid and not expired, false otherwise
 */
export function isParentTokenValid(token: string): boolean {
  try {
    const payload = extractParentInfoFromJWT(token)
    if (!payload) return false

    // Check expiration
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000)
      if (now > payload.exp) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

/**
 * Extracts token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null if invalid
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null

  if (!authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7)
}
