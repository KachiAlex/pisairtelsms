import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { revokeToken } from '../../_lib/token-blacklist.js'
import { clearCookie } from '../../_lib/cookie-helper.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { terminateSession, logSecurityEvent } from '../../_lib/session-tracker.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const decoded = await requireRole(req, res, ['tenant_admin', 'staff'])
  if (!decoded) return

  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : null
  const userId = decoded.userId || decoded.staffId
  if (!token || !userId) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  try {
    await revokeToken(token, userId, decoded.exp || Math.floor(Date.now() / 1000) + 86400)
    if (decoded.sid && decoded.tenantId) {
      await terminateSession(decoded.tenantId, decoded.sid)
      await logSecurityEvent(decoded.tenantId, userId, 'logout', 'User logged out', 'low')
    }
    clearCookie(res, 'auth_token', { path: '/' })
    setSecurityHeaders(res)
    return res.status(200).json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Tenant logout error:', error)
    return res.status(500).json({ error: 'Failed to logout' })
  }
}
