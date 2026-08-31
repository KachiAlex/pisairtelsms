import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SignJWT } from 'jose'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { setCookie } from '../../_lib/cookie-helper.js'
import { getJwtSecret } from '../../_lib/jwt-secret.js'
import { fetchStaffByEmail, verifyStaffPassword, hashPassword } from '../../tenant/_lib/staff.js'
import { poolQuery } from '../../_lib/pg-pool.js'

const ADMIN_ROLES = new Set(['tenant_admin', 'Admin', 'Principal', 'admin', 'principal'])

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

    // Look up staff member with an admin role
    const staff = await fetchStaffByEmail(normalizedEmail)

    if (!staff) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!ADMIN_ROLES.has(staff.role)) {
      return res.status(403).json({ error: 'Account does not have admin privileges' })
    }

    if (staff.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive or suspended' })
    }

    // Verify password
    if (!staff.passwordHash) {
      // No password set — allow email-as-password for first login
      if (password !== normalizedEmail) {
        return res.status(401).json({
          error: 'No password set. Use your email address as your temporary password.',
        })
      }
      // Auto-set the password hash
      const newHash = await hashPassword(password)
      await poolQuery('UPDATE staff SET password_hash = $1 WHERE id = $2', [newHash, staff.id])
    } else {
      const valid = await verifyStaffPassword(password, staff.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }
    }

    const resolvedTenantId = staff.tenantId || staff.department || 'default-tenant'
    const jwtSecret = getJwtSecret()
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = await new SignJWT({
      userId: staff.id,
      role: 'tenant_admin',
      tenantId: resolvedTenantId,
      email: staff.email,
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
      userId: staff.id,
      role: 'tenant_admin',
      tenantId: resolvedTenantId,
      name: staff.name,
      email: staff.email,
      expiresAt,
    })
  } catch (error) {
    console.error('Tenant admin login error:', error)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
