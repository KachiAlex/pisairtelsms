import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  category: 'academic' | 'sports' | 'cultural' | 'pta' | 'holiday' | 'general';
  isMandatory: boolean;
}

interface EventsResponse {
  events: SchoolEvent[];
  academicSession: string;
  term: string;
}

function extractParentId(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) return xUserId.trim();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.parentId || payload.userId || payload.sub || null;
    }
  } catch { /* not JWT */ }
  return token || null;
}

const mockEvents: SchoolEvent[] = [
  { id: 'evt-1', title: 'PTA Meeting', description: 'General PTA meeting to discuss term results and upcoming activities. All parents are encouraged to attend.', date: '2024-11-30', startTime: '10:00', endTime: '12:00', venue: 'School Assembly Hall', category: 'pta', isMandatory: false },
  { id: 'evt-2', title: 'Inter-House Sports Competition', description: 'Annual inter-house sports competition featuring track events, relay races, and field events.', date: '2024-12-05', startTime: '08:00', endTime: '16:00', venue: 'School Sports Field', category: 'sports', isMandatory: true },
  { id: 'evt-3', title: 'Christmas Break Begins', description: 'End of term holiday. School resumes on January 13, 2025.', date: '2024-12-20', venue: 'N/A', category: 'holiday', isMandatory: false },
  { id: 'evt-4', title: 'Cultural Day Celebration', description: 'Students showcase Nigerian cultural heritage through dance, drama, and cuisine.', date: '2024-12-10', startTime: '09:00', endTime: '14:00', venue: 'School Grounds', category: 'cultural', isMandatory: true },
  { id: 'evt-5', title: 'Career Day', description: 'Professionals from various fields speak to students about career opportunities and requirements.', date: '2024-11-28', startTime: '09:00', endTime: '12:00', venue: 'School Assembly Hall', category: 'general', isMandatory: false },
  { id: 'evt-6', title: 'Science Fair', description: 'Students present their science projects and experiments to a panel of judges.', date: '2024-12-15', startTime: '10:00', endTime: '15:00', venue: 'Science Block', category: 'academic', isMandatory: false },
  { id: 'evt-7', title: 'Mid-Term Break', description: 'One-week mid-term break for all students.', date: '2024-11-25', venue: 'N/A', category: 'holiday', isMandatory: false },
  { id: 'evt-8', title: 'End of Term Prize Giving', description: 'Award ceremony recognizing outstanding academic and extracurricular achievements.', date: '2024-12-18', startTime: '09:00', endTime: '12:00', venue: 'School Assembly Hall', category: 'general', isMandatory: true },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parentId = extractParentId(req);
  if (!parentId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const { category } = req.query;
      let events = [...mockEvents];
      // Only show upcoming events
      const now = new Date();
      events = events.filter(e => new Date(e.date) >= new Date(now.toDateString()));
      if (category) events = events.filter(e => e.category === category);
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return res.status(200).json({ events, academicSession: '2024/2025', term: 'First Term' } as EventsResponse);
    } catch (error) {
      console.error('Error fetching events:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
