import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Message {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body: string;
  isRead: boolean;
  replies: Reply[];
}

interface Reply {
  id: string;
  sender: string;
  date: string;
  body: string;
}

interface StudentMessagesResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { limit = '20', offset = '0' } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;

      // TODO: Fetch actual messages from database filtered by studentId
      // For now, return mock data
      const allMessages: Message[] = [
        {
          id: '1',
          sender: 'Principal',
          subject: 'Welcome to the Portal',
          date: '2025-01-15',
          body: 'Welcome to the student portal. You can now access your academic information anytime.',
          isRead: true,
          replies: [],
        },
        {
          id: '2',
          sender: 'Class Teacher',
          subject: 'Class Assignment',
          date: '2025-01-18',
          body: 'Please submit your assignment on the portal by Friday.',
          isRead: false,
          replies: [],
        },
        {
          id: '3',
          sender: 'Academic Office',
          subject: 'Exam Schedule',
          date: '2025-01-20',
          body: 'Your exam schedule has been posted. Check the timetable section.',
          isRead: false,
          replies: [],
        },
      ];

      const messages = allMessages.slice(offsetNum, offsetNum + limitNum);

      const response: StudentMessagesResponse = {
        messages,
        total: allMessages.length,
        limit: limitNum,
        offset: offsetNum,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      // TODO: Mark message as read in database
      return res.status(200).json({ success: true, message: 'Message marked as read' });
    } catch (error) {
      console.error('Error marking message as read:', error);
      return res.status(500).json({ error: 'Failed to mark message as read' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      const body = req.body;
      if (!body || typeof body !== 'object' || !body.reply) {
        return res.status(400).json({ error: 'Reply text is required' });
      }

      // TODO: Save reply to database
      const newReply: Reply = {
        id: `reply-${Date.now()}`,
        sender: 'Student',
        date: new Date().toISOString().split('T')[0],
        body: body.reply,
      };

      return res.status(201).json({ success: true, reply: newReply });
    } catch (error) {
      console.error('Error adding reply:', error);
      return res.status(500).json({ error: 'Failed to add reply' });
    }
  }

  res.setHeader('Allow', 'GET,PUT,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
