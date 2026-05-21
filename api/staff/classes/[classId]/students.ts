import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StudentInfo {
  id: string;
  name: string;
  admissionNumber: string;
  gender: string;
}

interface ClassStudentsResponse {
  students: StudentInfo[];
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

    const { classId } = req.query;

    // TODO: Verify staff member is assigned teacher for this class
    // If not, return 403
    // For now, return mock data

    const response: ClassStudentsResponse = {
      students: [
        {
          id: 'stu-1',
          name: 'Chioma Adeyemi',
          admissionNumber: 'ADM-2024-001',
          gender: 'Female',
        },
        {
          id: 'stu-2',
          name: 'Tunde Okafor',
          admissionNumber: 'ADM-2024-002',
          gender: 'Male',
        },
        {
          id: 'stu-3',
          name: 'Zainab Hassan',
          admissionNumber: 'ADM-2024-003',
          gender: 'Female',
        },
        {
          id: 'stu-4',
          name: 'Emeka Nwosu',
          admissionNumber: 'ADM-2024-004',
          gender: 'Male',
        },
      ],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching class students:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
}
