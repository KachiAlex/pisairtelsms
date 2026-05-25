import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import { fetchParentByEmail, verifyPassword } from '../../tenant/_lib/parents.js'
import { rateLimit } from '../../_lib/rate-limit'
import { setSecurityHeaders } from '../../_lib/security-headers'
import { logLoginSuccess, logLoginFailure } from '../../_lib/audit-logger'
import { validate, Schemas } from '../../_lib/validator'
import { setCookie } from '../../_lib/cookie-helper'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  parentId: string
  childrenIds: string[]
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

    const tenantId = (req.headers['x-tenant-id'] as string) || process.env.DEFAULT_TENANT_ID || 'default-tenant'

    const parent = await fetchParentByEmail(email, tenantId)

    if (!parent) {
      await logLoginFailure(req, email, 'Parent not found')
      return res.status(401).json({ error: 'Unauthorized: Invalid email or password' })
    }

    const passwordValid = await verifyPassword(password, parent.passwordHash)
    if (!passwordValid) {
      await logLoginFailure(req, email, 'Invalid password')
      return res.status(401).json({ error: 'Unauthorized: Invalid email or password' })
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const expiresIn = 24 * 60 * 60 // 24 hours
    const expiresAt = Date.now() + expiresIn * 1000

    const token = jwt.sign(
      {
        parentId: parent.id,
        childrenIds: parent.childrenIds,
        role: 'parent',
        email: parent.email
      },
      jwtSecret,
      { expiresIn: `${expiresIn}s` }
    )

    const response: LoginResponse = {
      token,
      parentId: parent.id,
      childrenIds: parent.childrenIds,
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
