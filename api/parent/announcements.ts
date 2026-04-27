import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  // GET /api/parent/announcements
  if (req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const category = req.query.category as string

      const allAnnouncements = [
        {
          id: '1',
          title: 'School Resumption Date',
          body: 'School resumes on Monday, January 27, 2025. All students are expected to be present.',
          category: 'general',
          date: '2025-01-20',
          author: 'Principal',
          attachments: [],
          isRead: false,
        },
        {
          id: '2',
          title: 'First Term Examination Schedule',
          body: 'The first term examination will commence on February 15, 2025.',
          category: 'academic',
          date: '2025-01-18',
          author: 'Academic Director',
          attachments: [{ id: '1', name: 'exam-schedule.pdf', url: '/files/exam-schedule.pdf', type: 'pdf' }],
          isRead: true,
        },
      ]

      const filtered = category
        ? allAnnouncements.filter(a => a.category === category)
        : allAnnouncements

      return res.status(200).json({
        announcements: filtered.slice(0, limit),
        categories: ['general', 'academic', 'sports', 'health'],
        unreadCount: filtered.filter(a => !a.isRead).length,
      })
    } catch (error) {
      console.error('Error fetching announcements:', error)
      return res.status(500).json({ error: 'Failed to fetch announcements' })
    }
  }

  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}
