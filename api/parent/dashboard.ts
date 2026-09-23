import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'

interface ParentDashboardResponse {
  parent: {
    id: string
    name: string
    email: string
  }
  child: {
    id: string
    name: string
    admissionNumber: string
    class: string
    arm: string
  }
  metrics: {
    attendancePercent: number
    gpa: number
    outstandingFees: number
    nextExamDate: string
  }
  recentGrades: Array<{
    id: string
    subject: string
    score: number
    date: string
  }>
  recentAnnouncements: Array<{
    id: string
    title: string
    date: string
    preview: string
  }>
  upcomingEvents: Array<{
    id: string
    date: string
    title: string
    description: string
  }>
  alerts: Array<{
    id: string
    type: 'attendance' | 'behavioral' | 'academic' | 'fees'
    message: string
    severity: 'info' | 'warning' | 'critical'
    date: string
  }>
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    // Ensure dependent tables exist
    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role, email: decoded.email }

    // Get childId from query
    const childId = req.query.childId as string
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    // Verify parent-child relationship
    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const tenantId = decoded.tenantId || 'default-tenant'

    // Fetch parent name
    const parentResult = await sql`SELECT name FROM parents WHERE id = ${parentInfo.parentId} LIMIT 1`
    const parentName = parentResult.rows[0]?.name ?? 'Parent'

    // Fetch child info
    const childResult = await sql`
      SELECT id, name, admission_no, class, arm FROM students
      WHERE id = ${childId} AND deleted_at IS NULL LIMIT 1
    `
    if (!childResult.rows[0]) return res.status(404).json({ error: 'Child not found' })
    const ch = childResult.rows[0]

    // Attendance %
    const attResult = await sql`
      SELECT COUNT(*) FILTER (WHERE status = 'present') AS present, COUNT(*) AS total
      FROM attendance WHERE student_id = ${childId} AND date >= NOW() - INTERVAL '90 days'
    `
    const attPresent = parseInt(attResult.rows[0]?.present ?? '0')
    const attTotal   = parseInt(attResult.rows[0]?.total   ?? '0')
    const attendancePercent = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100

    // Outstanding fees
    const feeResult = await sql`
      SELECT COALESCE(SUM(fa.total_amount - COALESCE(paid.paid,0)), 0) AS balance
      FROM fee_assignments fa
      LEFT JOIN (
        SELECT fee_assignment_id, SUM(amount) AS paid FROM payments
        WHERE status = 'confirmed' GROUP BY fee_assignment_id
      ) paid ON paid.fee_assignment_id = fa.id
      WHERE fa.student_id = ${childId}
    `
    const outstandingFees = parseFloat(feeResult.rows[0]?.balance ?? '0')

    // Next exam
    const classBase = (ch.class || '').replace(/\s+[A-Z]$/, '')
    const examResult = await sql`
      SELECT scheduled_date::text AS date FROM exams
      WHERE (class = ${ch.class} OR class = ${classBase} OR class IS NULL OR class = '')
        AND scheduled_date >= CURRENT_DATE AND deleted_at IS NULL
        AND status IN ('Scheduled', 'Ongoing')
      ORDER BY scheduled_date ASC LIMIT 1
    `
    const nextExamDate = examResult.rows[0]?.date ?? ''

    // Recent grades — published results only (never drafts)
    const gradesResult = await sql`
      SELECT id::text, subject, total_score AS score, compiled_at::date::text AS date
      FROM compiled_results
      WHERE student_id = ${childId} AND tenant_id = ${tenantId} AND status = 'published'
      ORDER BY compiled_at DESC LIMIT 5
    `

    // Announcements (tenant-scoped, sent, parent-audience)
    const annResult = await sql`
      SELECT id::text, title, created_at::date::text AS date, LEFT(body, 120) AS preview
      FROM announcements
      WHERE tenant_id = ${tenantId}
        AND COALESCE(status, 'sent') = 'sent'
        AND COALESCE(audience, 'all') IN ('all', 'parents')
      ORDER BY created_at DESC LIMIT 5
    `

    // Upcoming events (from exams table)
    const eventsResult = await sql`
      SELECT id::text, scheduled_date::text AS date, title, COALESCE(description, 'Examination') AS description
      FROM exams
      WHERE (class = ${ch.class} OR class = ${classBase} OR class IS NULL OR class = '')
        AND scheduled_date >= CURRENT_DATE AND deleted_at IS NULL
        AND status IN ('Scheduled', 'Ongoing')
      ORDER BY scheduled_date ASC LIMIT 5
    `

    // Auto alerts
    const alerts: ParentDashboardResponse['alerts'] = []
    if (attendancePercent < 75) alerts.push({ id: 'att-1', type: 'attendance', message: `Attendance is ${attendancePercent}% — below the 75% minimum`, severity: 'warning', date: new Date().toISOString().split('T')[0] })
    if (outstandingFees > 0) alerts.push({ id: 'fee-1', type: 'fees', message: `Outstanding fee balance: ₦${outstandingFees.toLocaleString()}`, severity: 'critical', date: new Date().toISOString().split('T')[0] })

    return res.status(200).json({
      parent: { id: parentInfo.parentId, name: parentName, email: parentInfo.email },
      child: { id: ch.id, name: ch.name, admissionNumber: ch.admission_no, class: ch.class, arm: ch.arm },
      metrics: { attendancePercent, gpa: 0, outstandingFees, nextExamDate },
      recentGrades: gradesResult.rows.map(r => ({ id: r.id, subject: r.subject, score: Number(r.score), date: r.date })),
      recentAnnouncements: annResult.rows.map(r => ({ id: r.id, title: r.title, date: r.date, preview: r.preview })),
      upcomingEvents: eventsResult.rows.map(r => ({ id: r.id, date: r.date, title: r.title, description: r.description })),
      alerts,
    })
  } catch (error) {
    console.error('Error fetching parent dashboard:', error)
    return res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
}
