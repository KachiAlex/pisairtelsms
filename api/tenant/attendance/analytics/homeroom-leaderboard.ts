import type { VercelRequest, VercelResponse } from '@vercel/node'
import { calculateHomeroomLeaderboard } from '../../_lib/attendance.js'
import { requireRole } from '../../../_lib/auth-middleware.js'



/**
 * GET /api/tenant/attendance/analytics/homeroom-leaderboard
 * Returns top 5 homerooms ranked by attendance percentage.
 * Query params: term?
 * Validates: Requirements 16
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  try {
    const { term } = req.query

    const data = await calculateHomeroomLeaderboard(
      tenantId,
      term as string | undefined
    )

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching homeroom leaderboard:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch homeroom leaderboard',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
