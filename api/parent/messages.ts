import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const childId = req.query.childId as string
    const limit = parseInt(req.query.limit as string) || 20

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const response = {
      conversations: [
        {
          id: '1',
          teacher: { id: 't1', name: 'Mr. Johnson', subject: 'Mathematics', email: 'johnson@school.com' },
          subject: 'Mathematics Performance',
          lastMessage: 'Your child is doing well in class',
          lastMessageDate: '2025-01-20',
          isRead: true,
          messageCount: 5,
        },
        {
          id: '2',
          teacher: { id: 't2', name: 'Mrs. Williams', subject: 'English', email: 'williams@school.com' },
          subject: 'Writing Assignment',
          lastMessage: 'Please encourage more reading',
          lastMessageDate: '2025-01-18',
          isRead: false,
          messageCount: 3,
        },
      ],
      availableTeachers: [
        { id: 't1', name: 'Mr. Johnson', subject: 'Mathematics', email: 'johnson@school.com' },
        { id: 't2', name: 'Mrs. Williams', subject: 'English', email: 'williams@school.com' },
        { id: 't3', name: 'Mr. Smith', subject: 'Science', email: 'smith@school.com' },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return res.status(500).json({ error: 'Failed to fetch messages' })
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { childId, teacherId, subject, body } = req.body

    if (!childId || !teacherId || !subject || !body) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    // TODO: Save message to database
    const response = {
      id: 'msg-' + Date.now(),
      sender: parentInfo.parentId,
      senderRole: 'parent' as const,
      body,
      date: new Date().toISOString(),
      attachments: [],
    }

    return res.status(201).json(response)
  } catch (error) {
    console.error('Error sending message:', error)
    return res.status(500).json({ error: 'Failed to send message' })
  }
}
