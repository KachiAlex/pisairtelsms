import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  audience: string;
  sentBy: string;
}

interface AnnouncementsResponse {
  announcements: Announcement[];
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

    const { limit = '10', offset = '0' } = req.query;

    // TODO: Fetch announcements from database (no staffId filtering - all staff see same announcements)
    // For now, return mock data

    const response: AnnouncementsResponse = {
      announcements: [
        {
          id: '1',
          title: 'Staff Meeting',
          body: 'All staff members are required to attend the monthly staff meeting on Friday at 3 PM in the conference room.',
          date: '2025-01-20',
          audience: 'All Staff',
          sentBy: 'Principal',
        },
        {
          id: '2',
          title: 'School Resumption',
          body: 'School resumes on Monday, January 27, 2025. All staff should be present by 7:30 AM.',
          date: '2025-01-15',
          audience: 'All Staff',
          sentBy: 'Principal',
        },
        {
          id: '3',
          title: 'Examination Schedule',
          body: 'The examination schedule for Term 1 has been released. Please check the notice board for details.',
          date: '2025-01-10',
          audience: 'Teaching Staff',
          sentBy: 'Academic Officer',
        },
      ],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}
