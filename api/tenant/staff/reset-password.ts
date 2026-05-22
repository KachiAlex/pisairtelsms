import type { VercelRequest, VercelResponse } from '@vercel/node'
import { resetStaffPassword } from '../_lib/staff.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { id, newPassword } = body || {}

  if (!id || !newPassword) {
    return res.status(400).json({ error: 'id and newPassword are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const ok = await resetStaffPassword(id, newPassword)
  if (!ok) return res.status(404).json({ error: 'Staff member not found' })

  return res.status(200).json({ success: true })
}
