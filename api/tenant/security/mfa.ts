import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * MFA Settings Handler
 * Manages multi-factor authentication settings for tenant users.
 *
 * Reads per-user MFA enrollment from the `user_mfa` table. If the table
 * does not exist yet (schema migration pending), returns the default
 * "not enrolled" status instead of failing, so the Security & Compliance
 * UI always renders meaningful data.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // SEC-06/tenant scoping: derive tenantId from the verified token, not query params
  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(403).json({ error: 'Forbidden: No tenant associated with this account' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let rows: any[] = []
    try {
      const result = await sql`
        SELECT user_id::text, mfa_type, enrolled_at::text, last_verified_at::text, is_enabled
        FROM user_mfa
        WHERE tenant_id = ${tenantId}
        ORDER BY enrolled_at DESC
        LIMIT 100
      `
      rows = result.rows
    } catch (tableError: any) {
      // Table not migrated yet — fall through with defaults so the UI renders
      if (process.env.NODE_ENV !== 'production') {
        console.warn('user_mfa table not available, returning default MFA status:', tableError?.message)
      }
    }

    const data = rows.map(r => ({
      userId: r.user_id,
      mfaType: r.mfa_type || 'totp',
      enrolledAt: r.enrolled_at,
      lastVerifiedAt: r.last_verified_at,
      isEnabled: !!r.is_enabled,
    }))

    return res.status(200).json({
      data,
      tenantMfaRequired: false,
      summary: {
        totalUsers: data.length,
        enabled: data.filter(d => d.isEnabled).length,
      },
    })
  } catch (error) {
    console.error('MFA settings GET error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
