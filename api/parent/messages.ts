import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  // GET /api/parent/messages - list conversations
  if (req.method === 'GET') {
    try {
      const childId = req.query.childId as string
      if (!childId) return res.status(400).json({ error: 'Bad request: childId is required' })

      if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
        return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
      }

      return res.status(200).json({
        conversations: [
          {
            id: 'conv-1',
            teacher: { id: 'teacher-1', name: 'Mr. Johnson', subject: 'Mathematics', email: 'johnson@school.edu' },
            subject: 'Mathematics Performance',
            lastMessage: 'Your child is doing great in class',
            lastMessageDate: '2025-01-20',
            isRead: true,
            messageCount: 3,
          },
        ],
        availableTeachers: [
          { id: 'teacher-1', name: 'Mr. Johnson', subject: 'Mathematics', email: 'johnson@school.edu' },
          { id: 'teacher-2', name: 'Mrs. Smith', subject: 'English', email: 'smith@school.edu' },
        ],
      })
    } catch (error) {
      console.error('Error fetching messages:', error)
      return res.status(500).json({ error: 'Failed to fetch messages' })
    }
  }

  // POST /api/parent/messages - send message
  if (req.method === 'POST') {
    try {
      const { childId, teacherId, subject, body } = req.body

      if (!childId || !teacherId || !subject || !body) {
        return res.status(400).json({ error: 'Bad request: childId, teacherId, subject, and body are required' })
      }

      if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
        return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
      }

      const newMessage = {
        id: `msg-${Date.now()}`,
        sender: parentInfo.parentId,
        senderRole: 'parent',
        body,
        date: new Date().toISOString(),
        attachments: [],
      }

      return res.status(201).json(newMessage)
    } catch (error) {
      console.error('Error sending message:', error)
      return res.status(500).json({ error: 'Failed to send message' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
