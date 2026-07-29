import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'


/**
 * GET /api/tenant/tasks/statistics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  try {
    // Get task statistics
    const statsResult = await sql.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '1 day') as due_today,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue
      FROM tasks
      WHERE tenant_id = $1
    `, [tenantId])

    const stats = statsResult.rows[0]

    // Get completion rate for this week
    const weekResult = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days') as completed_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as created_this_week
      FROM tasks
      WHERE tenant_id = $1
    `, [tenantId])

    const weekStats = weekResult.rows[0]
    const completionRate = weekStats.created_this_week > 0 
      ? Math.round((weekStats.completed_this_week / weekStats.created_this_week) * 100) 
      : 0

    // Get squad statistics
    const squadResult = await sql.query(`
      SELECT 
        COUNT(*) as total_squads,
        COUNT(*) FILTER (WHERE risk = 'low') as on_track,
        COUNT(*) FILTER (WHERE risk = 'medium' OR risk = 'high') as at_risk
      FROM squad_assignments
      WHERE tenant_id = $1
    `, [tenantId])

    const squadStats = squadResult.rows[0]

    return res.status(200).json({
      success: true,
      data: {
        totalTasks: parseInt(stats.total || '0'),
        openTasks: parseInt(stats.open || '0'),
        inProgressTasks: parseInt(stats.in_progress || '0'),
        completedTasks: parseInt(stats.completed || '0'),
        highPriorityTasks: parseInt(stats.high_priority || '0'),
        dueToday: parseInt(stats.due_today || '0'),
        overdueTasks: parseInt(stats.overdue || '0'),
        completionRateThisWeek: completionRate,
        totalSquads: parseInt(squadStats.total_squads || '0'),
        onTrackSquads: parseInt(squadStats.on_track || '0'),
        atRiskSquads: parseInt(squadStats.at_risk || '0')
      }
    })
  } catch (error) {
    console.error('Error fetching task statistics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch task statistics',
      details: error instanceof Error ? error.message : undefined
    })
  }
}
