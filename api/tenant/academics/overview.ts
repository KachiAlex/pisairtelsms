import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * Academic Structure Overview API
 * Aggregates counts across the academic structure: classes, subjects,
 * students, teacher allocations, departments, and programs.
 */

async function countQuery(q: ReturnType<typeof sql>): Promise<number> {
  try {
    const result: any = await q
    return parseInt(result.rows?.[0]?.n ?? '0', 10) || 0
  } catch (error) {
    // Log the error so schema/database failures are visible in PM2 logs,
    // but still return 0 so the overview page renders without crashing.
    console.error('Academic overview countQuery failed:', error)
    return 0
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const [
      classes, subjects, students, assigned, open, departments, programs,
    ] = await Promise.all([
      countQuery(sql`SELECT COUNT(*)::int AS n FROM classes WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`),
      countQuery(sql`SELECT COUNT(*)::int AS n FROM subjects WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`),
      countQuery(sql`SELECT COUNT(*)::int AS n FROM students WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`),
      countQuery(sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId} AND coverage = 'Assigned'`),
      countQuery(sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId} AND coverage = 'Open'`),
      countQuery(sql`SELECT COUNT(*)::int AS n FROM academic_departments WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`),
      countQuery(sql`SELECT COUNT(*)::int AS n FROM academic_programs WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`),
    ])

    return res.status(200).json({
      success: true,
      data: {
        classes,
        subjects,
        students,
        teacherAssignments: assigned,
        openSlots: open,
        departments,
        programs,
      },
    })
  } catch (error: any) {
    console.error('Error loading academic overview:', error)
    return res.status(500).json({ success: false, error: error.message || 'Failed to load overview' })
  }
}
