import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { requireRole } from '../_lib/auth-middleware';
import { rateLimit } from '../_lib/rate-limit';
import { requireCSRF } from '../_lib/csrf';
import { logPasswordChange } from '../_lib/audit-logger';

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return crypto.createHmac('sha256', salt).update(password).digest('hex') === hash;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.createHmac('sha256', salt).update(password).digest('hex')}`;
}

interface StudentProfile {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  arm: string;
  gender: string;
  email: string;
  phone: string;
  guardian: {
    name: string;
    phone: string;
  };
}

interface LoginHistory {
  date: string;
  time: string;
  device: string;
  ipAddress: string;
}

interface StudentProfileResponse {
  profile: StudentProfile;
  loginHistory: LoginHistory[];
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['student']);
  if (!decoded) return;

  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, admission_no, name, class, arm, gender,
               guardian_email AS email, phone, guardian, guardian_email
        FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1
      `;
      if (!result.rows[0]) return res.status(404).json({ error: 'Student not found' });
      const r = result.rows[0];
      return res.status(200).json({
        profile: {
          id: r.id,
          name: r.name,
          admissionNumber: r.admission_no,
          class: r.class,
          arm: r.arm,
          gender: r.gender || '',
          email: r.email || '',
          phone: r.phone || '',
          guardian: { name: r.guardian || '', phone: r.phone || '' },
        },
        loginHistory: [],
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = parseBody(req);
      if (!body) return res.status(400).json({ error: 'Request body is required' });
      if (body.email && !body.email.includes('@')) return res.status(400).json({ error: 'Invalid email format' });
      await sql`
        UPDATE students SET
          guardian_email = COALESCE(${body.email ?? null}, guardian_email),
          phone          = COALESCE(${body.phone  ?? null}, phone),
          updated_at     = NOW()
        WHERE id = ${studentId}
      `;
      return res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  if (req.method === 'POST') {
    // Rate limit: 5 requests per minute per IP for password changes
    if (rateLimit(req, res, 5, 60 * 1000)) {
      return;
    }

    // CSRF protection for state-changing requests
    if (studentId && requireCSRF(req, res, studentId)) return

    try {
      const { action } = req.query;

      if (action === 'change-password') {
        const body = parseBody(req);
        if (!body || !body.currentPassword || !body.newPassword)
          return res.status(400).json({ error: 'Current password and new password are required' });
        if (body.newPassword.length < 8)
          return res.status(400).json({ error: 'New password must be at least 8 characters' });
        const row = await sql`SELECT password_hash FROM students WHERE id = ${studentId} LIMIT 1`;
        const storedHash = row.rows[0]?.password_hash;
        if (storedHash && !verifyPassword(body.currentPassword, storedHash))
          return res.status(401).json({ error: 'Current password is incorrect' });
        const newHash = hashPassword(body.newPassword);
        await sql`UPDATE students SET password_hash = ${newHash} WHERE id = ${studentId}`;
        await logPasswordChange(req, studentId, 'student');
        return res.status(200).json({ success: true, message: 'Password changed successfully' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Error processing profile action:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  }

  res.setHeader('Allow', 'GET,PUT,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
