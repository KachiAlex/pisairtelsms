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
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const response = {
      attendancePercent: 92,
      totalPresent: 92,
      totalAbsent: 5,
      totalLate: 3,
      records: [
        { id: '1', date: '2025-01-20', status: 'present' as const, subject: 'Mathematics', reason: null },
        { id: '2', date: '2025-01-20', status: 'present' as const, subject: 'English', reason: null },
        { id: '3', date: '2025-01-19', status: 'late' as const, subject: 'Science', reason: 'Traffic' },
        { id: '4', date: '2025-01-18', status: 'absent' as const, subject: 'History', reason: 'Sick' },
        { id: '5', date: '2025-01-17', status: 'present' as const, subject: 'Geography', reason: null },
      ],
      trend: [
        { week: 'Week 1', percent: 90 },
        { week: 'Week 2', percent: 91 },
        { week: 'Week 3', percent: 92 },
        { week: 'Week 4', percent: 92 },
      ],
      absenceReasons: [
        { date: '2025-01-18', reason: 'Sick', approvedBy: 'Principal' },
        { date: '2025-01-15', reason: 'Family event', approvedBy: 'Vice Principal' },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return res.status(500).json({ error: 'Failed to fetch attendance data' })
  }
}
