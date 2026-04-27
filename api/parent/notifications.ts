import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  if (req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit as string) || 20
      const type = req.query.type as string

      const allNotifications = [
        { id: '1', type: 'academic', title: 'New Grades Posted', message: 'Mathematics grades have been posted', date: '2025-01-20', isRead: false, actionUrl: '/parent/academic' },
        { id: '2', type: 'attendance', title: 'Attendance Alert', message: 'Your child was absent on Jan 18', date: '2025-01-18', isRead: true, actionUrl: '/parent/attendance' },
        { id: '3', type: 'fees', title: 'Payment Confirmed', message: 'Your payment of ₦150,000 has been received', date: '2025-01-10', isRead: true, actionUrl: '/parent/fees' },
      ]

      const filtered = type ? allNotifications.filter(n => n.type === type) : allNotifications

      return res.status(200).json({
        notifications: filtered.slice(0, limit),
        unreadCount: filtered.filter(n => !n.isRead).length,
      })
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return res.status(500).json({ error: 'Failed to fetch notifications' })
    }
  }

  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}
