import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import crypto from 'crypto'
import { requireRole } from '../_lib/auth-middleware'
import { rateLimit } from '../_lib/rate-limit'
import { requireCSRF } from '../_lib/csrf'
import { logPasswordChange } from '../_lib/audit-logger'

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit: 5 requests per minute per IP for password changes
  if (rateLimit(req, res, 5, 60 * 1000)) {
    return
  }

  const decoded = requireRole(req, res, ['parent'])
  if (!decoded) return

  const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

  // CSRF protection for state-changing requests
  if (decoded.parentId && requireCSRF(req, res, decoded.parentId)) return

  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Bad request: currentPassword and newPassword are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Bad request: newPassword must be at least 8 characters' })
    }

    const row = await sql`SELECT password_hash FROM parents WHERE id = ${parentInfo.parentId} LIMIT 1`
    const storedHash = row.rows[0]?.password_hash
    if (storedHash && !verifyPassword(currentPassword, storedHash))
      return res.status(401).json({ error: 'Current password is incorrect' })
    const newHash = hashPassword(newPassword)
    await sql`UPDATE parents SET password_hash = ${newHash} WHERE id = ${parentInfo.parentId}`
    if (parentInfo.parentId) {
      await logPasswordChange(req, parentInfo.parentId, 'parent')
    }
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return res.status(500).json({ error: 'Failed to change password' })
  }
}
