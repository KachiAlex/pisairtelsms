import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import { fetchStaffByEmail, verifyStaffPassword, resetStaffPassword } from '../../tenant/_lib/staff.js'
import { rateLimit } from '../../_lib/rate-limit'
import { setSecurityHeaders } from '../../_lib/security-headers'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit: 10 requests per minute per IP
  if (rateLimit(req, res, 10, 60 * 1000)) {
    return
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
      // Existing staff with no password: use email as one-time default password.
      // On success, auto-set it so future logins use the real hash.
      if (password !== email.trim().toLowerCase()) {
        return res.status(401).json({
          error: 'No password has been set for this account. Use your email address as your temporary password to log in for the first time.',
        })
      }
      await resetStaffPassword(staff.id, password)
    } else {
      const valid = await verifyStaffPassword(password, staff.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = jwt.sign(
      { staffId: staff.id, userId: staff.id, role: 'staff', department: staff.department, email: staff.email },
      jwtSecret,
      { expiresIn: `${expiresIn}s` }
    )

    setSecurityHeaders(res)
    return res.status(200).json({
      token,
      staffId: staff.id,
      userId: staff.id,
      role: 'staff',
      staffRole: staff.role, // actual role from DB (teacher, principal, etc.)
      name: staff.name,
      department: staff.department,
      email: staff.email,
      expiresAt,
    })
  } catch (error) {
    console.error('Staff login error:', error)
    setSecurityHeaders(res)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
