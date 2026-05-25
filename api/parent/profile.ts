import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import crypto from 'crypto'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  return crypto.createHmac('sha256', salt).update(password).digest('hex') === hash
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  return `${salt}:${crypto.createHmac('sha256', salt).update(password).digest('hex')}`
}

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
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const parentResult = await sql`SELECT id, name, email, phone, address FROM parents WHERE id = ${parentInfo.parentId} LIMIT 1`
    if (!parentResult.rows[0]) return res.status(404).json({ error: 'Parent not found' })
    const p = parentResult.rows[0]

    const childrenResult = await sql`
      SELECT s.id, s.name, s.admission_no, s.class FROM parent_students ps
      JOIN students s ON s.id = ps.student_id AND s.deleted_at IS NULL
      WHERE ps.parent_id = ${parentInfo.parentId} ORDER BY s.name
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
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

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
      WHERE id = ${parentInfo.parentId}
    `
    const updated = await sql`SELECT id, name, email, phone, address FROM parents WHERE id = ${parentInfo.parentId} LIMIT 1`
    const u = updated.rows[0]
    const childrenResult = await sql`
      SELECT s.id, s.name, s.admission_no, s.class FROM parent_students ps
      JOIN students s ON s.id = ps.student_id AND s.deleted_at IS NULL
      WHERE ps.parent_id = ${parentInfo.parentId} ORDER BY s.name
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
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const row = await sql`SELECT password_hash FROM parents WHERE id = ${parentInfo.parentId} LIMIT 1`
    const storedHash = row.rows[0]?.password_hash
    if (storedHash && !verifyPassword(currentPassword, storedHash))
      return res.status(401).json({ error: 'Current password is incorrect' })
    const newHash = hashPassword(newPassword)
    await sql`UPDATE parents SET password_hash = ${newHash} WHERE id = ${parentInfo.parentId}`
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return res.status(500).json({ error: 'Failed to change password' })
  }
}
