import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import { getStudentProgressAnalytics, type AnalyticsFilters } from '../_lib/analytics/engine.js'

/**
 * GET /api/tenant/analytics/student-progress
 * Returns student progress analytics including improvement tracking and risk categories
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
    const { academicSession, term, class: className, startDate, endDate } = req.query
    const filters: AnalyticsFilters = {
      academicSession: academicSession as string | undefined,
      term: term as string | undefined,
      class: className as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    }

    const data = await getStudentProgressAnalytics(tenantId, filters)

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching student progress analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch student progress analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

