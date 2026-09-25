import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { rateLimit } from '../_lib/rate-limit';
import { requireCSRF } from '../_lib/csrf';
import { logPasswordChange } from '../_lib/audit-logger';
import { validatePassword } from '../_lib/password-validator';
import { validate, Schemas } from '../_lib/validator';
import { requireNotBlockedIP } from '../_lib/ip-restrictions';
import { hashPasswordSecurely, verifyPasswordAnyFormat } from '../_lib/password-hashing';

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

function parseBody(req: ApiRequest) {
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student']);
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

      // Real login history from tracked sessions (device + IP + timestamp)
      const sessions = await sql`
        SELECT created_at::text AS login_at, device_info, ip_address
        FROM user_sessions
        WHERE user_id = ${studentId}
        ORDER BY created_at DESC
        LIMIT 10
      `.catch(() => ({ rows: [] as any[] }));
      const loginHistory: LoginHistory[] = sessions.rows.map((s: any) => {
        const d = new Date(s.login_at);
        const di = s.device_info || {};
        return {
          date: d.toISOString().split('T')[0],
          time: d.toTimeString().slice(0, 8),
          device: [di.type, di.os, di.browser].filter(Boolean).join(' · ') || 'Unknown device',
          ipAddress: s.ip_address || '',
        };
      });

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
        loginHistory,
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

    // IP blocking (optional - configure BLOCKED_IPS env var)
    const blockedIPs = (process.env.BLOCKED_IPS || '').split(',').filter(Boolean)
    if (requireNotBlockedIP(req, res, blockedIPs)) return

    // CSRF protection for state-changing requests
    if (studentId && requireCSRF(req, res, studentId)) return

    try {
      const { action } = req.query;

      if (action === 'change-password') {
        const body = parseBody(req);
        if (!body || !body.currentPassword || !body.newPassword)
          return res.status(400).json({ error: 'Current password and new password are required' });
        
        // Validate input
        const validation = validate({ currentPassword: body.currentPassword, newPassword: body.newPassword }, Schemas.passwordChange);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Validation failed',
            details: validation.errors
          });
        }
        
        const passwordValidation = validatePassword(body.newPassword);
        if (!passwordValidation.valid) {
          return res.status(400).json({
            error: 'Password does not meet requirements',
            details: passwordValidation.errors
          });
        }
        
        const row = await sql`SELECT password_hash FROM students WHERE id = ${studentId} LIMIT 1`;
        const storedHash = row.rows[0]?.password_hash;
        if (storedHash && !(await verifyPasswordAnyFormat(body.currentPassword, storedHash)))
          return res.status(401).json({ error: 'Current password is incorrect' });
        const newHash = await hashPasswordSecurely(body.newPassword);
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
