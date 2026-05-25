import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const childId = req.query.childId as string
    const termId = req.query.termId as string

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const dayOrder: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 }

    const childRow = await sql`SELECT class, arm FROM students WHERE id = ${childId} AND deleted_at IS NULL LIMIT 1`
    if (!childRow.rows[0]) return res.status(404).json({ error: 'Child not found' })
    const { class: studentClass, arm } = childRow.rows[0]
    const className = `${studentClass}${arm ?? ''}`

    const ttResult = await sql`
      SELECT tt.id::text, tt.day, tt.start_time, tt.end_time,
             tt.start_time || '-' || tt.end_time AS time_slot,
             tt.subject, tt.room,
             COALESCE(st.name, '') AS teacher
      FROM timetable tt
      LEFT JOIN staff st ON st.id = tt.staff_id
      WHERE tt.class_name = ${className}
      ORDER BY tt.day, tt.start_time
    `

    const schedule = ttResult.rows.map(r => ({
      id: r.id, dayOfWeek: dayOrder[r.day?.toLowerCase()] ?? 0,
      timeSlot: r.time_slot, subject: r.subject, teacher: r.teacher, room: r.room,
      startTime: r.start_time, endTime: r.end_time,
    }))

    const examResult = await sql`
      SELECT id::text, title AS subject, exam_date::text AS date, start_time AS time, room,
             EXTRACT(EPOCH FROM (end_time::time - start_time::time))/60 AS duration
      FROM exams
      WHERE (student_class = ${studentClass} OR student_class IS NULL) AND exam_date >= CURRENT_DATE
      ORDER BY exam_date, start_time
    `

    const examSchedule = examResult.rows.map(r => ({
      id: r.id, subject: r.subject, date: r.date, time: r.time ?? '',
      room: r.room ?? '', duration: Number(r.duration ?? 0), invigilator: '',
    }))

    let availableTerms = [{ id: 'term1', name: 'First Term' }, { id: 'term2', name: 'Second Term' }, { id: 'term3', name: 'Third Term' }]
    try {
      const termRows = await sql`SELECT id::text, name FROM terms ORDER BY name`
      if (termRows.rows.length > 0) availableTerms = termRows.rows.map(r => ({ id: r.id, name: r.name }))
    } catch { /* terms table may not exist */ }

    return res.status(200).json({
      schedule, examSchedule,
      currentTerm: termId || (availableTerms[0]?.name ?? 'Current'),
      availableTerms, holidays: [],
    })
  } catch (error) {
    console.error('Error fetching timetable:', error)
    return res.status(500).json({ error: 'Failed to fetch timetable data' })
  }
}
