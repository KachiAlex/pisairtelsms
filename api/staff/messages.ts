import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  replies?: Message[];
}

interface MessagesListResponse {
  messages: Message[];
}

interface NewMessageBody {
  recipientId: string;
  subject: string;
  body: string;
}

interface NewMessageResponse {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { limit = '20', offset = '0' } = req.query;

      // TODO: Fetch messages from database filtered by sender or recipient matching staffId
      // For now, return mock data

      const response: MessagesListResponse = {
        messages: [
          {
            id: '1',
            sender: 'Principal',
            senderRole: 'Admin',
            subject: 'Welcome to Staff Portal',
            body: 'Welcome to the new Staff Portal. This portal will help you manage your schedule, attendance, and communications.',
            date: '2025-01-15',
            isRead: true,
          },
          {
            id: '2',
            sender: 'Parent - Mrs. Adeyemi',
            senderRole: 'Parent',
            subject: 'Chioma\'s Performance',
            body: 'Good morning, I wanted to inquire about my daughter\'s performance in Mathematics.',
            date: '2025-01-18',
            isRead: false,
          },
          {
            id: '3',
            sender: 'Academic Officer',
            senderRole: 'Admin',
            subject: 'Exam Invigilation Schedule',
            body: 'Please find attached the exam invigilation schedule for Term 1.',
            date: '2025-01-20',
            isRead: false,
          },
        ],
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { recipientId, subject, body: messageBody } = body as NewMessageBody;

      // TODO: Validate required fields
      // TODO: Create message in database with authenticated staff member as sender

      const response: NewMessageResponse = {
        id: `msg-${Date.now()}`,
        sender: 'Mr. Femi Okafor',
        subject,
        body: messageBody,
        date: new Date().toISOString(),
        isRead: false,
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error('Error creating message:', error);
      return res.status(500).json({ error: 'Failed to create message' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
