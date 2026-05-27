import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SignJWT } from 'jose'
import { verifySuperAdminCredentials } from '../../_lib/super-admin.js'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { setCookie } from '../../_lib/cookie-helper.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (rateLimit(req, res, 10, 60 * 1000)) {
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { email, password } = body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'invalid email format' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' })
    }

    const account = await verifySuperAdminCredentials(normalizedEmail, password)

    if (!account) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = await new SignJWT({
      userId: String(account.id),
      role: 'super_admin',
      email: account.email,
      organization: account.organization,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${expiresIn}s`)
      .sign(jwtSecret)

    setCookie(res, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn,
      path: '/',
    })

    return res.status(200).json({
      token,
      userId: String(account.id),
      role: 'super_admin',
      tenantId: 'super-admin',
      name: account.fullName,
      email: account.email,
      expiresAt,
    })
  } catch (error) {
    console.error('Super admin login error:', error)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
