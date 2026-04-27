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

    const termId = req.query.termId as string

    return res.status(200).json({
      currentTerm: termId || 'term-1',
      availableTerms: [
        { id: 'term-1', name: 'First Term 2024/2025' },
        { id: 'term-2', name: 'Second Term 2024/2025' },
      ],
      subjects: [
        {
          id: '1',
          subject: 'Mathematics',
          caScore: 35,
          examScore: 55,
          totalScore: 90,
          grade: 'A',
          classAverage: 72,
          teacherFeedback: 'Excellent performance',
          trend: 'up',
        },
        {
          id: '2',
          subject: 'English Language',
          caScore: 28,
          examScore: 48,
          totalScore: 76,
          grade: 'B',
          classAverage: 68,
          teacherFeedback: 'Good work, keep it up',
          trend: 'stable',
        },
      ],
      overallGPA: 3.8,
      classAverage: 3.2,
      performanceTrend: [
        { term: 'First Term 2023/2024', gpa: 3.5, date: '2024-04-01' },
        { term: 'Second Term 2023/2024', gpa: 3.6, date: '2024-08-01' },
        { term: 'First Term 2024/2025', gpa: 3.8, date: '2025-01-01' },
      ],
      upcomingAssessments: [
        {
          id: '1',
          subject: 'Mathematics',
          type: 'CA Test',
          date: '2025-02-10',
          weightage: 30,
        },
      ],
    })
  } catch (error) {
    console.error('Error fetching academic progress:', error)
    return res.status(500).json({ error: 'Failed to fetch academic data' })
  }
}
