import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SignJWT } from 'jose'
import { sql } from '@vercel/postgres'
import crypto from 'crypto'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { logLoginSuccess, logLoginFailure } from '../../_lib/audit-logger.js'
import { validate, Schemas } from '../../_lib/validator.js'
import { setCookie } from '../../_lib/cookie-helper.js'
import { getJwtSecret } from '../../_lib/jwt-secret.js'
import { hashPasswordSecurely, verifyPasswordAnyFormat } from '../../_lib/password-hashing.js'
import { needsTransparentUpgrade } from '../../_lib/password-hashing.js'

// SEC-08: delegate to the shared Argon2id-based hashing library
function hashPassword(password: string): Promise<string> {
  return hashPasswordSecurely(password)
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return verifyPasswordAnyFormat(password, stored)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit: 10 requests per minute per IP
  if (rateLimit(req, res, 10, 60 * 1000)) {
    return
  }

  try {
    const { admissionNumber, password } = req.body as { admissionNumber: string; password: string }

    // Validate input
    const validation = validate({ admissionNumber, password }, Schemas.studentLogin)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      })
    }

    // SEC-06: Look up student by admission number — tenantId is derived from the record, not a client header
    const result = await sql`
      SELECT id, admission_no, name, class, arm, password_hash, status, tenant_id
      FROM students
      WHERE admission_no = ${admissionNumber.trim()}
        AND deleted_at IS NULL
      LIMIT 1
    `

    const student = result.rows[0]

    if (!student) {
      await logLoginFailure(req, admissionNumber, 'Student not found')
      return res.status(401).json({ error: 'Invalid admission number or password' })
    }

    const tenantId = student.tenant_id

    if (student.status === 'Suspended') {
      await logLoginFailure(req, admissionNumber, 'Account suspended')
      return res.status(403).json({ error: 'Your account has been suspended. Contact your school administrator.' })
    }

    if (!student.password_hash) {
      // First-time login: admission number as default password
      if (password !== admissionNumber.trim()) {
        await logLoginFailure(req, admissionNumber, 'Default password incorrect')
        return res.status(401).json({ error: 'Invalid admission number or password' })
      }
      // Auto-set the password on first use
      const newHash = await hashPassword(password)
      await sql`UPDATE students SET password_hash = ${newHash} WHERE id = ${student.id}`
    } else {
      const valid = await verifyPassword(password, student.password_hash)
      if (!valid) {
        await logLoginFailure(req, admissionNumber, 'Invalid password')
        return res.status(401).json({ error: 'Invalid admission number or password' })
      }
      // SEC-08: transparently upgrade legacy (scrypt/HMAC) hashes to Argon2id
      if (needsTransparentUpgrade(student.password_hash)) {
        const upgradedHash = await hashPassword(password)
        await sql`UPDATE students SET password_hash = ${upgradedHash} WHERE id = ${student.id}`
      }
    }

    const jwtSecret = getJwtSecret()
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = await new SignJWT({ studentId: student.id, userId: student.id, role: 'student', admissionNo: student.admission_no, tenantId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${expiresIn}s`)
      .sign(jwtSecret)

    await logLoginSuccess(req, student.id, 'student')
    
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
      userId: student.id,
      studentId: student.id,
      tenantId,
      role: 'student',
      name: student.name,
      email: student.guardian_email || undefined,
      admissionNo: student.admission_no,
      class: student.class,
      arm: student.arm,
      expiresAt,
    })
  } catch (error) {
    console.error('Student login error:', error)
    setSecurityHeaders(res)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
