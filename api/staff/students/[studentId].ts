import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StudentProfile {
  id: string;
  name: string;
  admissionNumber: string;
  gender: string;
  class: string;
  arm: string;
  email?: string;
  phone?: string;
}

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return xUserId.trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const staffId = extractStaffIdFromToken(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const { studentId } = req.query;

    // TODO: Verify student is in a class taught by staff member
    // If not, return 403
    // For now, return mock data

    const profile: StudentProfile = {
      id: studentId as string,
      name: 'Chioma Adeyemi',
      admissionNumber: 'ADM-2024-001',
      gender: 'Female',
      class: 'SS 1',
      arm: 'A',
      email: 'chioma@school.edu',
      phone: '+234-801-234-5678',
    };

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return res.status(500).json({ error: 'Failed to fetch student profile' });
  }
}
