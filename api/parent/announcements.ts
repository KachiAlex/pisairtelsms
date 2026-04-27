import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
    const limit = parseInt(req.query.limit as string) || 10
    const category = req.query.category as string

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const allAnnouncements = [
      {
        id: '1',
        title: 'School Reopens',
        body: 'School will reopen on January 27, 2025',
        category: 'academic',
        date: '2025-01-20',
        author: 'Principal',
        attachments: [],
        isRead: true,
      },
      {
        id: '2',
        title: 'Sports Day',
        body: 'Annual sports day scheduled for February 10th',
        category: 'event',
        date: '2025-01-18',
        author: 'Sports Director',
        attachments: [],
        isRead: false,
      },
      {
        id: '3',
        title: 'Exam Schedule',
        body: 'First term exams begin on February 1st',
        category: 'academic',
        date: '2025-01-15',
        author: 'Academic Officer',
        attachments: [],
        isRead: true,
      },
      {
        id: '4',
        title: 'Holiday Notice',
        body: 'School closed for public holiday',
        category: 'notice',
        date: '2025-01-10',
        author: 'Principal',
        attachments: [],
        isRead: true,
      },
      {
        id: '5',
        title: 'Parent Meeting',
        body: 'Parent-teacher meeting on February 5th',
        category: 'event',
        date: '2025-01-08',
        author: 'Principal',
        attachments: [],
        isRead: false,
      },
    ]

    let filtered = allAnnouncements
    if (category) {
      filtered = filtered.filter((a) => a.category === category)
    }

    const announcements = filtered.slice(0, limit)
    const unreadCount = allAnnouncements.filter((a) => !a.isRead).length

    const response = {
      announcements,
      categories: ['academic', 'event', 'notice'],
      unreadCount,
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return res.status(500).json({ error: 'Failed to fetch announcements' })
  }
}
