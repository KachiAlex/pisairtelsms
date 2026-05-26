import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import { sql } from '@vercel/postgres'
import { verify } from '@node-rs/argon2'
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
    const { email, password, tenantId } = body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Look up user in tenant_users with role tenant_admin
    const result = await sql`
      SELECT id, name, email, role, tenant_id, password_hash, status
      FROM tenant_users
      WHERE email = ${normalizedEmail}
        AND role IN ('tenant_admin', 'Admin', 'Principal')
        AND status != 'suspended'
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = result.rows[0]

    // Verify password
    if (!user.password_hash) {
      // No password set — allow email-as-password for first login
      if (password !== normalizedEmail) {
        return res.status(401).json({
          error: 'No password set. Use your email address as your temporary password.',
        })
      }
      // Auto-set the password hash
      const { hash } = await import('@node-rs/argon2')
      const passwordHash = await hash(password)
      await sql`
        UPDATE tenant_users SET password_hash = ${passwordHash} WHERE id = ${user.id}
      `
    } else {
      const valid = await verify(user.password_hash, password)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }
    }

    const resolvedTenantId = tenantId || user.tenant_id || 'default-tenant'
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = jwt.sign(
      {
        userId: user.id,
        role: 'tenant_admin',
        tenantId: resolvedTenantId,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: `${expiresIn}s` }
    )

    setCookie(res, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn,
      path: '/',
    })

    return res.status(200).json({
      token,
      userId: user.id,
      role: 'tenant_admin',
      tenantId: resolvedTenantId,
      name: user.name,
      email: user.email,
      expiresAt,
    })
  } catch (error) {
    console.error('Tenant admin login error:', error)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
