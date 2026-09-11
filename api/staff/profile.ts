import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { verifyStaffPassword, resetStaffPassword } from '../tenant/_lib/staff.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { requireCSRF } from '../_lib/csrf.js';
import { rateLimit } from '../_lib/rate-limit.js';

interface StaffProfile {
  id: string;
  staffId: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  qualification: string;
}

interface ProfileUpdateBody {
  email?: string;
  phone?: string;
  address?: string;
}

interface PasswordChangeBody {
  currentPassword: string;
  newPassword: string;
}

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff']);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId;
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, staff_id, name, department, role, email, phone, address, qualification
        FROM staff WHERE id = ${staffId} LIMIT 1
      `;
      if (!result.rows[0]) return res.status(404).json({ error: 'Staff not found' });
      const r = result.rows[0];
      return res.status(200).json({
        id: r.id, staffId: r.staff_id, name: r.name, department: r.department,
        role: r.role, email: r.email ?? '', phone: r.phone ?? '',
        address: r.address ?? '', qualification: r.qualification ?? '',
      });
    } catch (error) {
      console.error('Error fetching staff profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  } else if (req.method === 'PUT') {
    // CSRF protection for state-changing request
    if (requireCSRF(req, res, staffId)) return;
    try {
      const body = await parseBody(req);
      const { email, phone, address } = body as ProfileUpdateBody;
      if (email && !isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
      await sql`
        UPDATE staff SET
          email   = COALESCE(${email   ?? null}, email),
          phone   = COALESCE(${phone   ?? null}, phone),
          address = COALESCE(${address ?? null}, address),
          updated_at = NOW()
        WHERE id = ${staffId}
      `;
      const updated = await sql`
        SELECT id, staff_id, name, department, role, email, phone, address, qualification
        FROM staff WHERE id = ${staffId} LIMIT 1
      `;
      const r = updated.rows[0];
      return res.status(200).json({
        id: r.id, staffId: r.staff_id, name: r.name, department: r.department,
        role: r.role, email: r.email ?? '', phone: r.phone ?? '',
        address: r.address ?? '', qualification: r.qualification ?? '',
      });
    } catch (error) {
      console.error('Error updating staff profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  } else if (req.method === 'POST') {
    // Rate limit password changes: 5 per minute
    if (rateLimit(req, res, 5, 60 * 1000)) return;
    // CSRF protection for state-changing request
    if (requireCSRF(req, res, staffId)) return;
    try {
      const body = await parseBody(req);
      const { currentPassword, newPassword } = body as PasswordChangeBody;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword are required' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
      const row = await sql`SELECT password_hash FROM staff WHERE id = ${staffId} LIMIT 1`;
      const storedHash = row.rows[0]?.password_hash;
      if (storedHash && !(await verifyStaffPassword(currentPassword, storedHash)))
        return res.status(401).json({ error: 'Current password is incorrect' });
      await resetStaffPassword(staffId, newPassword);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  } else {
    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
