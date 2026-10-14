import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { SignJWT } from 'jose'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { setCookie } from '../../_lib/cookie-helper.js'
import { getJwtSecret } from '../../_lib/jwt-secret.js'
import { needsTransparentUpgrade } from '../../_lib/password-hashing.js'
import { fetchAllStaffByEmail, verifyStaffPassword, hashPassword } from '../../tenant/_lib/staff.js'
import { poolQuery } from '../../_lib/pg-pool.js'
import { recordSession, logSecurityEvent } from '../../_lib/session-tracker.js'

const ADMIN_ROLES = new Set(['tenant_admin', 'Admin', 'Principal', 'admin', 'principal'])

export default async function handler(req: ApiRequest, res: ApiResponse) {
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

    // Emails are not unique across tenants — authenticate against whichever
    // active admin-capable row's stored hash verifies the password.
    const candidates = await fetchAllStaffByEmail(normalizedEmail)

    if (candidates.length === 0) {
      await logSecurityEvent('unknown', null, 'login_failure', `Failed admin login for ${normalizedEmail}: account not found`, 'medium')
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    let staff: (typeof candidates)[number] | null = null
    let hashlessAdmin: (typeof candidates)[number] | null = null
    for (const c of candidates) {
      if (!ADMIN_ROLES.has(c.role) || c.status !== 'active') continue
      if (c.passwordHash) {
        if (await verifyStaffPassword(password, c.passwordHash)) { staff = c; break }
      } else if (!hashlessAdmin) {
        hashlessAdmin = c
      }
    }

    if (!staff && hashlessAdmin) {
      // No password set — allow email-as-password for first login
      if (password !== normalizedEmail) {
        await logSecurityEvent(hashlessAdmin.tenantId, hashlessAdmin.id, 'login_failure', `Failed admin login for ${normalizedEmail}: bad temporary password`, 'medium')
        return res.status(401).json({
          error: 'No password set. Use your email address as your temporary password.',
        })
      }
      // Auto-set the password hash
      const newHash = await hashPassword(password)
      await poolQuery('UPDATE staff SET password_hash = $1 WHERE id = $2', [newHash, hashlessAdmin.id])
      staff = hashlessAdmin
    }

    if (!staff) {
      // Report errors against the deterministic first row
      const first = candidates[0]
      if (!ADMIN_ROLES.has(first.role)) {
        await logSecurityEvent(first.tenantId, first.id, 'login_failure', `Failed admin login for ${normalizedEmail}: insufficient privileges`, 'medium')
        return res.status(403).json({ error: 'Account does not have admin privileges' })
      }
      if (first.status !== 'active') {
        await logSecurityEvent(first.tenantId, first.id, 'login_failure', `Failed admin login for ${normalizedEmail}: account inactive`, 'medium')
        return res.status(403).json({ error: 'Account is inactive or suspended' })
      }
      await logSecurityEvent(first.tenantId, first.id, 'login_failure', `Failed admin login for ${normalizedEmail}: invalid password`, 'medium')
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // SEC-08: transparently upgrade legacy (scrypt/HMAC) hashes to Argon2id
    if (staff.passwordHash && needsTransparentUpgrade(staff.passwordHash)) {
      const upgradedHash = await hashPassword(password)
      await poolQuery('UPDATE staff SET password_hash = $1 WHERE id = $2', [upgradedHash, staff.id])
    }

    const resolvedTenantId = staff.tenantId  // SEC-06: derive from staff record, not fallbacks
    if (!resolvedTenantId) {
      return res.status(403).json({ error: 'No tenant associated with this account' })
    }
    const jwtSecret = getJwtSecret()
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    // Track the session so it appears in Session Management and can be
    // force-terminated (the sid claim is validated on every request).
    const sessionId = await recordSession(resolvedTenantId, staff.id, req, expiresIn)
    await logSecurityEvent(resolvedTenantId, staff.id, 'login_success', `Admin login: ${staff.name} (${normalizedEmail})`, 'low')

    const token = await new SignJWT({
      userId: staff.id,
      role: 'tenant_admin',
      tenantId: resolvedTenantId,
      email: staff.email,
      ...(sessionId ? { sid: sessionId } : {}),
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
