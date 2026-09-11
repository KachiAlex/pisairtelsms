import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'
import { requireCSRF } from '../_lib/csrf.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return
    const parentId = decoded.parentId!
    const tenantId = decoded.tenantId

    const result = await sql`
      SELECT s.id, s.name, s.admission_no, s.class, s.arm
      FROM parent_students ps
      JOIN students s ON s.id = ps.student_id AND s.deleted_at IS NULL
      WHERE ps.parent_id = ${parentId}
      ORDER BY s.name
    `
    return res.status(200).json({ children: result.rows.map(r => ({ id: r.id, name: r.name, admissionNumber: r.admission_no, class: r.class, arm: r.arm })) })
  } catch (error) {
    console.error('Error fetching children:', error)
    return res.status(500).json({ error: 'Failed to fetch children' })
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return
    const parentId = decoded.parentId!

    // CSRF protection for state-changing request
    if (requireCSRF(req, res, parentId)) return

    const { childAdmissionNumber, relationship } = req.body

    if (!childAdmissionNumber || !relationship) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }

    const studentResult = await sql`
      SELECT id, name, admission_no, class, arm FROM students
      WHERE admission_no = ${childAdmissionNumber} AND deleted_at IS NULL LIMIT 1
    `
    if (!studentResult.rows[0]) return res.status(404).json({ error: 'Student not found with that admission number' })
    const s = studentResult.rows[0]

    // Check not already linked
    const existing = await sql`SELECT 1 FROM parent_students WHERE parent_id = ${parentId} AND student_id = ${s.id}`
    if (existing.rows[0]) return res.status(409).json({ error: 'Child already linked to your account' })

    await sql`INSERT INTO parent_students (parent_id, student_id, relationship) VALUES (${parentId}, ${s.id}, ${relationship})`
    return res.status(201).json({ id: s.id, name: s.name, admissionNumber: s.admission_no, class: s.class, arm: s.arm })
  } catch (error) {
    console.error('Error adding child:', error)
    return res.status(500).json({ error: 'Failed to add child' })
  }
}
