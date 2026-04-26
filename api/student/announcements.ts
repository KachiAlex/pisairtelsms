import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Announcement {
  id: string;
  title: string;
  date: string;
  sender: string;
  preview: string;
  body: string;
  audience: string;
}

interface StudentAnnouncementsResponse {
  announcements: Announcement[];
  total: number;
  limit: number;
  offset: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '10', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);
    const offsetNum = parseInt(offset as string) || 0;

    // TODO: Fetch actual announcements from database with public audience
    // For now, return mock data
    const allAnnouncements: Announcement[] = [
      {
        id: '1',
        title: 'School Resumption Date',
        date: '2025-01-20',
        sender: 'Principal',
        preview: 'School resumes on Monday, January 27, 2025...',
        body: 'School resumes on Monday, January 27, 2025. All students are expected to be present with their uniforms and school materials.',
        audience: 'public',
      },
      {
        id: '2',
        title: 'Examination Timetable Released',
        date: '2025-01-18',
        sender: 'Academic Office',
        preview: 'The examination timetable for the first term has been released...',
        body: 'The examination timetable for the first term has been released. Students should check the portal for their individual schedules.',
        audience: 'public',
      },
      {
        id: '3',
        title: 'Sports Day Announcement',
        date: '2025-01-15',
        sender: 'Sports Director',
        preview: 'Annual sports day will be held on February 14, 2025...',
        body: 'Annual sports day will be held on February 14, 2025. All students are encouraged to participate in various events.',
        audience: 'public',
      },
      {
        id: '4',
        title: 'Library Extension Hours',
        date: '2025-01-10',
        sender: 'Librarian',
        preview: 'The library will now be open until 6 PM on weekdays...',
        body: 'The library will now be open until 6 PM on weekdays to support student studies.',
        audience: 'public',
      },
      {
        id: '5',
        title: 'New Cafeteria Menu',
        date: '2025-01-08',
        sender: 'Cafeteria Manager',
        preview: 'A new menu has been introduced in the school cafeteria...',
        body: 'A new menu has been introduced in the school cafeteria with more nutritious options.',
        audience: 'public',
      },
    ];

    const announcements = allAnnouncements.slice(offsetNum, offsetNum + limitNum);

    const response: StudentAnnouncementsResponse = {
      announcements,
      total: allAnnouncements.length,
      limit: limitNum,
      offset: offsetNum,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}
