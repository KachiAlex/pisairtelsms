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
    const termId = req.query.termId as string

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const response = {
      currentTerm: termId || 'First Term 2025',
      availableTerms: [
        { id: 'term1', name: 'First Term 2025' },
        { id: 'term2', name: 'Second Term 2024' },
        { id: 'term3', name: 'Third Term 2024' },
      ],
      subjects: [
        {
          id: '1',
          subject: 'Mathematics',
          caScore: 18,
          examScore: 67,
          totalScore: 85,
          grade: 'A',
          classAverage: 72,
          teacherFeedback: 'Excellent performance',
          trend: 'up' as const,
        },
        {
          id: '2',
          subject: 'English',
          caScore: 16,
          examScore: 62,
          totalScore: 78,
          grade: 'B',
          classAverage: 70,
          teacherFeedback: 'Good improvement',
          trend: 'up' as const,
        },
        {
          id: '3',
          subject: 'Science',
          caScore: 17,
          examScore: 65,
          totalScore: 82,
          grade: 'A',
          classAverage: 71,
          teacherFeedback: 'Very good',
          trend: 'stable' as const,
        },
      ],
      overallGPA: 3.8,
      classAverage: 71,
      performanceTrend: [
        { term: 'Term 1 2024', gpa: 3.5, date: '2024-04-15' },
        { term: 'Term 2 2024', gpa: 3.6, date: '2024-08-20' },
        { term: 'Term 3 2024', gpa: 3.7, date: '2024-12-10' },
        { term: 'Term 1 2025', gpa: 3.8, date: '2025-01-20' },
      ],
      upcomingAssessments: [
        { id: '1', subject: 'Mathematics', type: 'Quiz', date: '2025-02-01', weightage: 10 },
        { id: '2', subject: 'English', type: 'Assignment', date: '2025-02-03', weightage: 15 },
        { id: '3', subject: 'Science', type: 'Practical', date: '2025-02-05', weightage: 20 },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching academic progress:', error)
    return res.status(500).json({ error: 'Failed to fetch academic data' })
  }
}
