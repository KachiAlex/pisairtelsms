import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { revokeToken } from '../../_lib/token-blacklist.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { logAuditEvent, extractAuditContext } from '../../_lib/audit-logger.js'
import { clearCookie } from '../../_lib/cookie-helper.js'
import { terminateSession, logSecurityEvent } from '../../_lib/session-tracker.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const decoded = await requireRole(req, res, ['staff'])
  if (!decoded) return

  const authHeader = req.headers.authorization
  const token = authHeader?.substring(7) // Remove 'Bearer ' prefix
  const userId = decoded.staffId || decoded.userId

  if (!token || !userId) {
    setSecurityHeaders(res)
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    // Revoke the token
    const expiresAt = decoded.exp || (Date.now() + 24 * 60 * 60 * 1000)
    await revokeToken(token, userId, expiresAt)

    // Close the tracked session and record the logout event
    if (decoded.sid && decoded.tenantId) {
      await terminateSession(decoded.tenantId, decoded.sid)
      await logSecurityEvent(decoded.tenantId, userId, 'logout', 'User logged out', 'low')
    }

    // Log logout event
    await logAuditEvent('logout', {
      userId,
      role: decoded.role,
      ...extractAuditContext(req, userId, decoded.role, decoded.tenantId),
    })

    // Clear httpOnly cookie
    clearCookie(res, 'auth_token', { path: '/' })

    setSecurityHeaders(res)
    return res.status(200).json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    setSecurityHeaders(res)
    return res.status(500).json({ error: 'Failed to logout' })
  }
}
