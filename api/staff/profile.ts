import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.staffId || payload.userId || payload.sub || null;
  } catch {
    return null;
  }
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
      // TODO: Fetch staff profile from database filtered by staffId
      // For now, return mock data

      const profile: StaffProfile = {
        id: staffId,
        staffId: 'STAFF-001',
        name: 'Mr. Femi Okafor',
        department: 'Mathematics',
        role: 'Teacher',
        email: 'femi.okafor@school.edu',
        phone: '+234-801-234-5678',
        address: '123 Main Street, Lagos',
        qualification: 'B.Sc. Mathematics, M.Ed. Education',
      };

      return res.status(200).json(profile);
    } catch (error) {
      console.error('Error fetching staff profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  } else if (req.method === 'PUT') {
    try {
      const body = await parseBody(req);
      const { email, phone, address } = body as ProfileUpdateBody;

      // TODO: Validate email format if provided
      // TODO: Verify staffId matches authenticated staff member
      // TODO: Update profile in database

      if (email && !isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const updatedProfile: StaffProfile = {
        id: staffId,
        staffId: 'STAFF-001',
        name: 'Mr. Femi Okafor',
        department: 'Mathematics',
        role: 'Teacher',
        email: email || 'femi.okafor@school.edu',
        phone: phone || '+234-801-234-5678',
        address: address || '123 Main Street, Lagos',
        qualification: 'B.Sc. Mathematics, M.Ed. Education',
      };

      return res.status(200).json(updatedProfile);
    } catch (error) {
      console.error('Error updating staff profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { currentPassword, newPassword } = body as PasswordChangeBody;

      // TODO: Validate current password
      // TODO: Validate new password meets requirements
      // TODO: Update password in database

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
