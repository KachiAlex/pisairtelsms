import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

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

    const limit = parseInt(req.query.limit as string) || 20
    const type = req.query.type as string

    const allNotifications = [
      {
        id: '1',
        type: 'academic' as const,
        title: 'New Grades Posted',
        message: 'Mathematics grades have been posted',
        date: '2025-01-20',
        isRead: false,
        actionUrl: '/parent/academic',
      },
      {
        id: '2',
        type: 'attendance' as const,
        title: 'Attendance Alert',
        message: 'Attendance is below 75%',
        date: '2025-01-18',
        isRead: true,
        actionUrl: '/parent/attendance',
      },
      {
        id: '3',
        type: 'fees' as const,
        title: 'Fee Payment Due',
        message: 'Outstanding fees of 50,000 due by February 28',
        date: '2025-01-15',
        isRead: false,
        actionUrl: '/parent/fees',
      },
      {
        id: '4',
        type: 'communication' as const,
        title: 'New Announcement',
        message: 'School reopens on January 27',
        date: '2025-01-10',
        isRead: true,
        actionUrl: '/parent/communications',
      },
      {
        id: '5',
        type: 'behavioral' as const,
        title: 'Positive Recognition',
        message: 'Your child won the 100m sprint race',
        date: '2025-01-08',
        isRead: true,
        actionUrl: '/parent/behavioral',
      },
    ]

    let filtered = allNotifications
    if (type) {
      filtered = filtered.filter((n) => n.type === type)
    }

    const notifications = filtered.slice(0, limit)
    const unreadCount = allNotifications.filter((n) => !n.isRead).length

    const response = {
      notifications,
      unreadCount,
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'Failed to fetch notifications' })
  }
}
