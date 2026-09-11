import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'
import { requireCSRF } from '../_lib/csrf.js'
import { rateLimit } from '../_lib/rate-limit.js'
import { hashPasswordSecurely, verifyPasswordAnyFormat } from '../_lib/password-hashing.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'PUT') {
    return handlePut(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.setHeader('Allow', 'GET, PUT, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return
    const parentId = decoded.parentId!

    const parentResult = await sql`SELECT id, name, email, phone, address FROM parents WHERE id = ${parentId} LIMIT 1`
    if (!parentResult.rows[0]) return res.status(404).json({ error: 'Parent not found' })
    const p = parentResult.rows[0]

    const childrenResult = await sql`
      SELECT s.id, s.name, s.admission_no, s.class FROM parent_students ps
      JOIN students s ON s.id = ps.student_id AND s.deleted_at IS NULL
      WHERE ps.parent_id = ${parentId} ORDER BY s.name
    `
    return res.status(200).json({
      id: p.id, name: p.name, email: p.email, phone: p.phone ?? '', address: p.address ?? '',
      linkedChildren: childrenResult.rows.map(r => ({ id: r.id, name: r.name, admissionNumber: r.admission_no, class: r.class })),
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return
    const parentId = decoded.parentId!

    // CSRF protection for state-changing request
    if (requireCSRF(req, res, parentId)) return

    const { email, phone, address } = req.body

    // Validate email format
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    await sql`
      UPDATE parents SET
        email   = COALESCE(${email   ?? null}, email),
        phone   = COALESCE(${phone   ?? null}, phone),
        address = COALESCE(${address ?? null}, address),
        updated_at = NOW()
      WHERE id = ${parentId}
    `
    const updated = await sql`SELECT id, name, email, phone, address FROM parents WHERE id = ${parentId} LIMIT 1`
    const u = updated.rows[0]
    const childrenResult = await sql`
      SELECT s.id, s.name, s.admission_no, s.class FROM parent_students ps
      JOIN students s ON s.id = ps.student_id AND s.deleted_at IS NULL
      WHERE ps.parent_id = ${parentId} ORDER BY s.name
    `
    return res.status(200).json({
      id: u.id, name: u.name, email: u.email, phone: u.phone ?? '', address: u.address ?? '',
      linkedChildren: childrenResult.rows.map(r => ({ id: r.id, name: r.name, admissionNumber: r.admission_no, class: r.class })),
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return
    const parentId = decoded.parentId!

    // Rate limit password changes: 5 per minute
    if (rateLimit(req, res, 5, 60 * 1000)) return

    // CSRF protection for state-changing request
    if (requireCSRF(req, res, parentId)) return

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const row = await sql`SELECT password_hash FROM parents WHERE id = ${parentId} LIMIT 1`
    const storedHash = row.rows[0]?.password_hash
    if (storedHash && !(await verifyPasswordAnyFormat(currentPassword, storedHash)))
      return res.status(401).json({ error: 'Current password is incorrect' })
    const newHash = await hashPasswordSecurely(newPassword)
    await sql`UPDATE parents SET password_hash = ${newHash} WHERE id = ${parentId}`
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return res.status(500).json({ error: 'Failed to change password' })
  }
}
