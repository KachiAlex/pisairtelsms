import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import { sql } from '@vercel/postgres'
import crypto from 'crypto'

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

  try {
    await ensureStudentAuthColumn()

    const { admissionNumber, password } = req.body as { admissionNumber: string; password: string }

    if (!admissionNumber || !password) {
      return res.status(400).json({ error: 'admissionNumber and password are required' })
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
      return res.status(401).json({ error: 'Invalid admission number or password' })
    }

    if (student.status === 'Suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact your school administrator.' })
    }

    if (!student.password_hash) {
      // First-time login: admission number as default password
      if (password !== admissionNumber.trim()) {
        return res.status(401).json({ error: 'Invalid admission number or password' })
      }
      // Auto-set the password on first use
      const newHash = hashPassword(password)
      await sql`UPDATE students SET password_hash = ${newHash} WHERE id = ${student.id}`
    } else {
      const valid = await verifyPassword(password, student.password_hash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid admission number or password' })
      }
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const expiresIn = 24 * 60 * 60
    const expiresAt = Date.now() + expiresIn * 1000

    const token = jwt.sign(
      { studentId: student.id, userId: student.id, role: 'student', admissionNo: student.admission_no },
      jwtSecret,
      { expiresIn: `${expiresIn}s` }
    )

    return res.status(200).json({
      token,
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
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
