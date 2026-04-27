import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ClassInfo {
  id: string;
  name: string;
  arm: string;
  studentCount: number;
}

interface StaffClassesResponse {
  classes: ClassInfo[];
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

    // TODO: Fetch actual classes assigned to staff member from database filtered by staffId
    // For now, return mock data
    const response: StaffClassesResponse = {
      classes: [
        {
          id: 'class-1',
          name: 'SS 1',
          arm: 'A',
          studentCount: 45,
        },
        {
          id: 'class-2',
          name: 'SS 2',
          arm: 'B',
          studentCount: 42,
        },
        {
          id: 'class-3',
          name: 'JSS 3',
          arm: 'C',
          studentCount: 48,
        },
      ],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching staff classes:', error);
    return res.status(500).json({ error: 'Failed to fetch classes' });
  }
}
