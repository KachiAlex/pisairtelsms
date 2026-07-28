import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SignJWT } from 'jose'
import { fetchStaffByEmail, verifyStaffPassword, resetStaffPassword } from '../../tenant/_lib/staff.js'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { logLoginSuccess, logLoginFailure } from '../../_lib/audit-logger.js'
import { validate, Schemas } from '../../_lib/validator.js'
import { setCookie } from '../../_lib/cookie-helper.js'
import { getJwtSecret } from '../../_lib/jwt-secret.js'

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

    // Validate input
    const validation = validate({ email, password }, Schemas.staffLogin)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      })
    }

    const staff = await fetchStaffByEmail(email)

    if (!staff) {
      await logLoginFailure(req, email, 'Staff not found')
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!staff.passwordHash) {
      // Existing staff with no password: use email as one-time default password.
      // On success, auto-set it so future logins use the real hash.
      if (password !== email.trim().toLowerCase()) {
        await logLoginFailure(req, email, 'Default password incorrect')
        return res.status(401).json({
          error: 'No password has been set for this account. Use your email address as your temporary password to log in for the first time.',
        })
      }
      await resetStaffPassword(staff.id, password)
    } else {
      const valid = await verifyStaffPassword(password, staff.passwordHash)
      if (!valid) {
        await logLoginFailure(req, email, 'Invalid password')
        return res.status(401).json({ error: 'Invalid email or password' })
      }
    }

    const jwtSecret = getJwtSecret()
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000
    const tenantId = staff.tenantId || (req.headers['x-tenant-id'] as string) || 'default-tenant'

    const token = await new SignJWT({ staffId: staff.id, userId: staff.id, role: 'staff', department: staff.department, email: staff.email, tenantId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${expiresIn}s`)
      .sign(jwtSecret)

    await logLoginSuccess(req, staff.id, 'staff')

    // Set httpOnly cookie with JWT token
    setCookie(res, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn, // 24 hours in seconds
      path: '/',
    })

    setSecurityHeaders(res)
    return res.status(200).json({
      token, // Still return token for backward compatibility
      staffId: staff.id,
      userId: staff.id,
      role: 'staff',
      staffRole: staff.role, // actual role from DB (teacher, principal, etc.)
      name: staff.name,
      department: staff.department,
      email: staff.email,
      tenantId,
      expiresAt,
    })
  } catch (error) {
    console.error('Staff login error:', error)
    setSecurityHeaders(res)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
