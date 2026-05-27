import type { VercelRequest, VercelResponse } from '@vercel/node'
import { SignJWT } from 'jose'
import { sql } from '@vercel/postgres'
import crypto from 'crypto'
import { rateLimit } from '../../_lib/rate-limit.js'
import { setSecurityHeaders } from '../../_lib/security-headers.js'
import { logLoginSuccess, logLoginFailure } from '../../_lib/audit-logger.js'
import { validate, Schemas } from '../../_lib/validator.js'
import { setCookie } from '../../_lib/cookie-helper.js'

async function ensureStudentAuthColumn() {
  await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT`
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex')
  return `${salt}:${hash}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const attempt = crypto.createHmac('sha256', salt).update(password).digest('hex')
  return attempt === hash
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
    await ensureStudentAuthColumn()

    const { admissionNumber, password } = req.body as { admissionNumber: string; password: string }

    // Validate input
    const validation = validate({ admissionNumber, password }, Schemas.studentLogin)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      })
    }

    const tenantId = (req.headers['x-tenant-id'] as string) || process.env.DEFAULT_TENANT_ID || 'default-tenant'

    const result = await sql`
      SELECT id, admission_no, name, class, arm, password_hash, status
      FROM students
      WHERE admission_no = ${admissionNumber.trim()}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `

    const student = result.rows[0]

    if (!student) {
      await logLoginFailure(req, admissionNumber, 'Student not found')
      return res.status(401).json({ error: 'Invalid admission number or password' })
    }

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
      const newHash = hashPassword(password)
      await sql`UPDATE students SET password_hash = ${newHash} WHERE id = ${student.id}`
    } else {
      const valid = await verifyPassword(password, student.password_hash)
      if (!valid) {
        await logLoginFailure(req, admissionNumber, 'Invalid password')
        return res.status(401).json({ error: 'Invalid admission number or password' })
      }
    }

    const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = await new SignJWT({ studentId: student.id, userId: student.id, role: 'student', admissionNo: student.admission_no })
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
