import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { verifyStaffPassword, resetStaffPassword } from '../tenant/_lib/staff.js';

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

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const parts = authHeader.substring(7).split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch { /* not a JWT */ }
  return null;
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
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
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
