import { sql } from '@vercel/postgres'
import { verifyParentChildRelationship } from '../../../src/lib/parentAuth'

export async function getDashboardData(parentId: string, childId: string) {
  const isValid = verifyParentChildRelationship(parentId, childId, [])
  if (!isValid) { throw new Error('Invalid parent-child relationship') }

  const parentRes = await sql`SELECT name, email FROM parents WHERE id = ${parentId} LIMIT 1`
  const parent = parentRes.rows[0] || { name: '', email: '' }

  const childRes = await sql`SELECT id, name, admission_no, class, arm FROM students WHERE id = ${childId} AND deleted_at IS NULL LIMIT 1`
  const child = childRes.rows[0] || { id: childId, name: '', admission_no: '', class: '', arm: '' }

  const attRes = await sql`SELECT COUNT(*) FILTER (WHERE status = 'present') AS present, COUNT(*) AS total FROM attendance WHERE student_id = ${childId} AND date >= NOW() - INTERVAL '90 days'`
  const attPresent = parseInt(attRes.rows[0]?.present ?? '0')
  const attTotal = parseInt(attRes.rows[0]?.total ?? '0')
  const attendancePercent = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100

  const feeRes = await sql`SELECT COALESCE(SUM(fa.amount - COALESCE(paid.paid,0)), 0) AS balance FROM fee_assignments fa LEFT JOIN (SELECT fee_assignment_id, SUM(amount) AS paid FROM payments WHERE status = 'confirmed' GROUP BY fee_assignment_id) paid ON paid.fee_assignment_id = fa.id WHERE fa.student_id = ${childId}`
  const outstandingFees = parseFloat(feeRes.rows[0]?.balance ?? '0')

  const gradesRes = await sql`SELECT id::text, subject, (ca_score + exam_score) AS score, updated_at::date::text AS date FROM results WHERE student_id = ${childId} ORDER BY updated_at DESC LIMIT 5`
  const recentGrades = gradesRes.rows.map(r => ({ id: r.id, subject: r.subject, score: Number(r.score), date: r.date }))

  const annRes = await sql`SELECT id::text, title, created_at::date::text AS date, LEFT(body, 120) AS preview FROM announcements ORDER BY created_at DESC LIMIT 5`
  const recentAnnouncements = annRes.rows.map(r => ({ id: r.id, title: r.title, date: r.date, preview: r.preview }))

  const eventsRes = await sql`SELECT id::text, exam_date::text AS date, title, COALESCE(description, 'Examination') AS description FROM exams WHERE exam_date >= CURRENT_DATE ORDER BY exam_date ASC LIMIT 5`
  const upcomingEvents = eventsRes.rows.map(r => ({ id: r.id, date: r.date, title: r.title, description: r.description }))

  const alerts: Array<{ id: string; type: 'attendance' | 'behavioral' | 'academic' | 'fees'; message: string; severity: 'info' | 'warning' | 'critical'; date: string }> = []
  if (attendancePercent < 75) alerts.push({ id: 'att-1', type: 'attendance', message: `Attendance is ${attendancePercent}% — below the 75% minimum`, severity: 'warning', date: new Date().toISOString().split('T')[0] })
  if (outstandingFees > 0) alerts.push({ id: 'fee-1', type: 'fees', message: `Outstanding fee balance: ₦${outstandingFees.toLocaleString()}`, severity: 'critical', date: new Date().toISOString().split('T')[0] })

  return {
    parent: { id: parentId, name: parent.name || 'Parent', email: parent.email || '' },
    child: { id: child.id, name: child.name, admissionNumber: child.admission_no, class: child.class, arm: child.arm },
    metrics: { attendancePercent, gpa: 0, outstandingFees, nextExamDate: '' },
    recentGrades, recentAnnouncements, upcomingEvents, alerts,
  }
}
