import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import { fetchStaffByEmail, verifyStaffPassword } from '../../tenant/_lib/staff.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const staff = await fetchStaffByEmail(email)

    if (!staff) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!staff.passwordHash) {
      return res.status(401).json({ error: 'Account has no password set. Contact your administrator.' })
    }

    const valid = await verifyStaffPassword(password, staff.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = jwt.sign(
      { staffId: staff.id, userId: staff.id, role: staff.role, department: staff.department, email: staff.email },
      jwtSecret,
      { expiresIn: `${expiresIn}s` }
    )

    return res.status(200).json({
      token,
      staffId: staff.id,
      userId: staff.id,
      role: staff.role,
      name: staff.name,
      department: staff.department,
      email: staff.email,
      expiresAt,
    })
  } catch (error) {
    console.error('Staff login error:', error)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
