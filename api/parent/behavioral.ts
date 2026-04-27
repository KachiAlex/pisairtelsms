import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

    const childId = req.query.childId as string
    if (!childId) return res.status(400).json({ error: 'Bad request: childId is required' })

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    return res.status(200).json({
      conductGrade: 'A',
      conductTrend: [
        { term: 'First Term 2023/2024', grade: 'B', date: '2024-04-01' },
        { term: 'Second Term 2023/2024', grade: 'A', date: '2024-08-01' },
        { term: 'First Term 2024/2025', grade: 'A', date: '2025-01-01' },
      ],
      incidents: [],
      positiveRecognition: [
        {
          id: '1',
          date: '2025-01-15',
          type: 'Academic Excellence',
          description: 'Best student in Mathematics',
          awardedBy: 'Mathematics Teacher',
        },
      ],
      teacherComments: [
        {
          id: '1',
          teacher: 'Mr. Johnson',
          subject: 'Mathematics',
          comment: 'Excellent student, always participates in class',
          date: '2025-01-20',
        },
      ],
    })
  } catch (error) {
    console.error('Error fetching behavioral reports:', error)
    return res.status(500).json({ error: 'Failed to fetch behavioral data' })
  }
}
