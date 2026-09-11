import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SignJWT } from 'jose'
import { sql } from '@vercel/postgres'
import { fetchParentByEmail, verifyPassword } from '../../tenant/_lib/parents.js'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { logLoginSuccess, logLoginFailure } from '../../_lib/audit-logger.js'
import { validate, Schemas } from '../../_lib/validator.js'
import { setCookie } from '../../_lib/cookie-helper.js'
import { getJwtSecret } from '../../_lib/jwt-secret.js'
import { hashPasswordSecurely, needsTransparentUpgrade } from '../../_lib/password-hashing.js'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  parentId: string
  childrenIds: string[]
  name?: string
  email?: string
  tenantId?: string
  expiresAt: number
}

/**
 * Parent login endpoint
 * Validates parent credentials and returns JWT token with parent and children info
 * 
 * Validates: Requirements 1.1, 1.2, 1.6, 1.7
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit: 10 requests per minute per IP
  if (rateLimit(req, res, 10, 60 * 1000)) {
    return
  }

  try {
    const { email, password } = req.body as LoginRequest

    // Validate input
    const validation = validate({ email, password }, Schemas.login)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      })
    }

    // SEC-06: Look up parent by email — tenantId is derived from the record,
    // not a client-supplied x-tenant-id header.
    const parent = await fetchParentByEmail(email.trim().toLowerCase())

    if (!parent) {
      await logLoginFailure(req, email, 'Parent not found')
      return res.status(401).json({ error: 'Unauthorized: Invalid email or password' })
    }

    const tenantId = parent.tenantId

    const passwordValid = await verifyPassword(password, parent.passwordHash)
    if (!passwordValid) {
      await logLoginFailure(req, email, 'Invalid password')
      return res.status(401).json({ error: 'Unauthorized: Invalid email or password' })
    }

    // SEC-08: transparently upgrade legacy (scrypt/HMAC) hashes to Argon2id
    if (needsTransparentUpgrade(parent.passwordHash)) {
      const upgradedHash = await hashPasswordSecurely(password)
      await sql`UPDATE parents SET password_hash = ${upgradedHash} WHERE id = ${parent.id}`
    }

    // Generate JWT token
    const jwtSecret = getJwtSecret()
    const expiresIn = 24 * 60 * 60 // 24 hours
    const expiresAt = Date.now() + expiresIn * 1000

    const token = await new SignJWT({
      parentId: parent.id,
      childrenIds: parent.childrenIds,
      role: 'parent',
      email: parent.email,
      tenantId
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${expiresIn}s`)
      .sign(jwtSecret)

    const response: LoginResponse = {
      token,
      parentId: parent.id,
      childrenIds: parent.childrenIds,
      name: parent.name,
      email: parent.email,
      tenantId,
      expiresAt
    }

    await logLoginSuccess(req, parent.id, 'parent')
    
    // Set httpOnly cookie with JWT token
    setCookie(res, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn, // 24 hours in seconds
      path: '/',
    })
    
    setSecurityHeaders(res)
    return res.status(200).json(response)
  } catch (error) {
    console.error('Login error:', error)
    setSecurityHeaders(res)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
