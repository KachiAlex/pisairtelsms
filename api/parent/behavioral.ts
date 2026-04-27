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
      conductGrade: 'A',
      conductTrend: [
        { term: 'Term 1 2024', grade: 'B', date: '2024-04-15' },
        { term: 'Term 2 2024', grade: 'A', date: '2024-08-20' },
        { term: 'Term 3 2024', grade: 'A', date: '2024-12-10' },
        { term: 'Term 1 2025', grade: 'A', date: '2025-01-20' },
      ],
      incidents: [
        {
          id: '1',
          date: '2025-01-15',
          type: 'Late to class',
          description: 'Student arrived 10 minutes late',
          severity: 'minor' as const,
          action: 'Verbal warning',
          reportedBy: 'Mr. Smith',
        },
      ],
      positiveRecognition: [
        {
          id: '1',
          date: '2025-01-18',
          type: 'Academic Excellence',
          description: 'Top performer in Mathematics',
          awardedBy: 'Principal',
        },
        {
          id: '2',
          date: '2025-01-10',
          type: 'Sports Achievement',
          description: 'Won 100m sprint race',
          awardedBy: 'Sports Director',
        },
      ],
      teacherComments: [
        {
          id: '1',
          teacher: 'Mr. Johnson',
          subject: 'Mathematics',
          comment: 'Excellent student, very attentive in class',
          date: '2025-01-20',
        },
        {
          id: '2',
          teacher: 'Mrs. Williams',
          subject: 'English',
          comment: 'Good participation, needs to improve writing skills',
          date: '2025-01-19',
        },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching behavioral reports:', error)
    return res.status(500).json({ error: 'Failed to fetch behavioral data' })
  }
}
