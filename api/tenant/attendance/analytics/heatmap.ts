import type { VercelRequest, VercelResponse } from '@vercel/node'
import { calculateWeeklyHeatmap } from '../../_lib/attendance.js'
import { requireRole } from '../../../_lib/auth-middleware.js'



/**
 * GET /api/tenant/attendance/analytics/heatmap
 * Returns weekly attendance heatmap data with color coding.
 * Query params: weeks? (default 4), class?
 * Validates: Requirements 14
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
    const { weeks: weeksParam, class: className } = req.query

    let weeks = 4
    if (weeksParam) {
      const parsed = parseInt(weeksParam as string, 10)
      if (!isNaN(parsed) && parsed > 0) {
        weeks = Math.min(parsed, 52) // cap at 52 weeks
      }
    }

    const data = await calculateWeeklyHeatmap(
      tenantId,
      weeks,
      className as string | undefined
    )

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching heatmap analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
