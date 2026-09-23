import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildAccess } from './_lib/verify-child.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const childId = req.query.childId as string
    const termId = req.query.termId as string

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!await verifyParentChildAccess(parentInfo.parentId, childId, decoded.tenantId || 'default-tenant')) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const tenantId = decoded.tenantId || 'default-tenant'

    // Get student's class
    const studentRow = await sql`SELECT class FROM students WHERE id = ${childId} AND deleted_at IS NULL LIMIT 1`
    const studentClass = studentRow.rows[0]?.class ?? ''

    // Terms come from Timetable & Scheduling (timetable_terms) — the single
    // source of truth. results.term stores the term *name*, so resolve the
    // termId param (id or name) to the name before filtering.
    const termRows = await sql`
      SELECT id::text, name, start_date::text AS start_date, end_date::text AS end_date
      FROM timetable_terms WHERE tenant_id = ${tenantId} ORDER BY start_date
    `
    const availableTerms = termRows.rows.map(r => ({ id: r.id, name: r.name }))
    const today = new Date().toISOString().slice(0, 10)
    const requestedTerm = termRows.rows.find(r => r.id === termId || r.name === termId)
    const activeTerm = termRows.rows.find(r => r.start_date <= today && today <= r.end_date)
    const termName = requestedTerm?.name || activeTerm?.name || availableTerms[0]?.name || null

    // Results for this child — published compiled results only (never drafts).
    // compiled_results carries subject/class_average/position computed at compile time.
    const resultsQuery = termName
      ? await sql`SELECT id::text, subject, total_score, grade, class_average FROM compiled_results WHERE student_id = ${childId} AND tenant_id = ${tenantId} AND status = 'published' AND term = ${termName} ORDER BY subject`
      : await sql`SELECT id::text, subject, total_score, grade, class_average FROM compiled_results WHERE student_id = ${childId} AND tenant_id = ${tenantId} AND status = 'published' ORDER BY subject`

    const subjects = resultsQuery.rows.map(r => ({
      id: r.id, subject: r.subject,
      caScore: null as number | null, examScore: null as number | null, totalScore: Number(r.total_score),
      grade: r.grade, classAverage: r.class_average !== null ? Number(r.class_average) : 0,
      teacherFeedback: '', trend: 'stable' as const,
    }))

    const overallAvg = subjects.length > 0 ? Math.round(subjects.reduce((s, r) => s + r.totalScore, 0) / subjects.length) : 0

    // Upcoming exams
    const studentClassBase = studentClass.replace(/\s+[A-Z]$/, '')
    const examRows = await sql`
      SELECT id::text, COALESCE(subject, title) AS subject, scheduled_date::text AS date, 'Exam' AS type
      FROM exams
      WHERE (class = ${studentClass} OR class = ${studentClassBase} OR class IS NULL OR class = '')
        AND tenant_id = ${tenantId} AND deleted_at IS NULL
        AND status IN ('Scheduled', 'Ongoing')
        AND scheduled_date >= CURRENT_DATE
      ORDER BY scheduled_date LIMIT 5
    `

    return res.status(200).json({
      currentTerm: requestedTerm?.id || activeTerm?.id || availableTerms[0]?.id || '',
      availableTerms,
      subjects,
      overallGPA: 0,
      classAverage: overallAvg,
      performanceTrend: [],
      upcomingAssessments: examRows.rows.map(r => ({ id: r.id, subject: r.subject, type: r.type, date: r.date, weightage: 0 })),
    })
  } catch (error) {
    console.error('Error fetching academic progress:', error)
    return res.status(500).json({ error: 'Failed to fetch academic data' })
  }
}
