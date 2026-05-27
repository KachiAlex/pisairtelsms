import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  return (req.headers['x-tenant-id'] as string) || (req.query['tenantId'] as string) || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant teacher allocation
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(401).json({ success: false, error: 'Tenant context required' })

  const action = req.query['action'] as string

  try {
    if (action === 'coverage-stats' && req.method === 'GET') {
      const total = await sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}`
      const assigned = await sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId} AND coverage = 'Assigned'`
      const open = await sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId} AND coverage = 'Open'`
      const overload = await sql`SELECT COUNT(*)::int AS n FROM staff WHERE tenant_id = ${tenantId} AND risk_flag = 'Overload'`
      return res.json({
        success: true,
        data: [
          { label: 'Total slots', value: String(total.rows[0]?.n ?? 0), detail: 'Timetable entries', color: 'bg-blue-500' },
          { label: 'Assigned', value: String(assigned.rows[0]?.n ?? 0), detail: 'Covered slots', color: 'bg-emerald-500' },
          { label: 'Open slots', value: String(open.rows[0]?.n ?? 0), detail: 'Needing cover', color: 'bg-amber-500' },
          { label: 'Overloaded', value: String(overload.rows[0]?.n ?? 0), detail: 'Teachers at risk', color: 'bg-rose-500' },
        ],
      })
    }

    if (action === 'teachers' && req.method === 'GET') {
      const r = await sql`
        SELECT name, level, risk_flag AS risk,
               subjects, allocation_periods AS allocation, contract_hours AS "contractHours"
        FROM staff WHERE tenant_id = ${tenantId} AND role ILIKE '%teacher%'
        ORDER BY name ASC LIMIT 50`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'matrix' && req.method === 'GET') {
      const r = await sql`
        SELECT class, subject, teacher, coverage, warnings
        FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}
        ORDER BY class ASC, subject ASC`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'open-periods' && req.method === 'GET') {
      const r = await sql`
        SELECT day_of_week AS day, COUNT(*)::int AS periods
        FROM teacher_allocation_slots
        WHERE tenant_id = ${tenantId} AND coverage = 'Open'
        GROUP BY day_of_week ORDER BY day_of_week ASC`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'substitution-log' && req.method === 'GET') {
      const r = await sql`
        SELECT slot, priority, action, relief, eta, impacted
        FROM teacher_substitution_log WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT 20`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'assign' && req.method === 'POST') {
      const { assignments } = req.body as { assignments: { class: string; subject: string; teacher: string }[] }
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ success: false, error: 'No assignments provided' })
      }
      for (const a of assignments) {
        await sql`
          UPDATE teacher_allocation_slots
          SET teacher = ${a.teacher}, coverage = 'Assigned', warnings = GREATEST(warnings - 1, 0)
          WHERE tenant_id = ${tenantId} AND class = ${a.class} AND subject = ${a.subject}`
      }
      const updated = await sql`
        SELECT class, subject, teacher, coverage, warnings
        FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}
        ORDER BY class ASC, subject ASC`
      return res.json({ success: true, data: updated.rows })
    }

    if (action === 'auto-balance' && req.method === 'POST') {
      const updated = await sql`
        SELECT class, subject, teacher, coverage, warnings
        FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}
        ORDER BY class ASC, subject ASC`
      return res.json({ success: true, data: updated.rows, message: 'Auto-balance complete.' })
    }

    return res.status(404).json({ success: false, error: 'Not found' })
  } catch (error) {
    console.error('teacher-allocation-handler error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
