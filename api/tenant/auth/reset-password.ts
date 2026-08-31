import type { VercelRequest, VercelResponse } from '@vercel/node'
import { poolQuery } from '../../_lib/pg-pool.js'
import { fetchStaffByEmail, hashPassword } from '../../tenant/_lib/staff.js'
import { sendEmail } from '../../_lib/email.js'
import { emailTemplates } from '../../_lib/email-templates.js'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (rateLimit(req, res, 5, 60 * 1000)) {
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { email } = body || {}

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    const staff = await fetchStaffByEmail(normalizedEmail)

    if (!staff) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      })
    }

    const tempPassword = `reset_${Math.random().toString(36).slice(2, 10)}`
    const passwordHash = await hashPassword(tempPassword)

    await poolQuery(
      'UPDATE staff SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, staff.id]
    )

    try {
      const template = emailTemplates.passwordReset({ name: staff.name, password: tempPassword })
      await sendEmail({
        to: normalizedEmail,
        subject: template.subject,
        html: template.html,
      })
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr)
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return res.status(500).json({ error: 'Failed to process password reset' })
  }
}
