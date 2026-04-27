import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

interface ParentDashboardResponse {
  parent: {
    id: string
    name: string
    email: string
  }
  child: {
    id: string
    name: string
    admissionNumber: string
    class: string
    arm: string
  }
  metrics: {
    attendancePercent: number
    gpa: number
    outstandingFees: number
    nextExamDate: string
  }
  recentGrades: Array<{
    id: string
    subject: string
    score: number
    date: string
  }>
  recentAnnouncements: Array<{
    id: string
    title: string
    date: string
    preview: string
  }>
  upcomingEvents: Array<{
    id: string
    date: string
    title: string
    description: string
  }>
  alerts: Array<{
    id: string
    type: 'attendance' | 'behavioral' | 'academic' | 'fees'
    message: string
    severity: 'info' | 'warning' | 'critical'
    date: string
  }>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Extract and validate token
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    // Get childId from query
    const childId = req.query.childId as string
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    // Verify parent-child relationship
    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    // TODO: Fetch actual data from database
    // For now, return mock data
    const response: ParentDashboardResponse = {
      parent: {
        id: parentInfo.parentId,
        name: 'Parent Name',
        email: parentInfo.email,
      },
      child: {
        id: childId,
        name: 'John Adewale',
        admissionNumber: 'ADM-2024-001',
        class: 'SS3',
        arm: 'A',
      },
      metrics: {
        attendancePercent: 92,
        gpa: 3.8,
        outstandingFees: 0,
        nextExamDate: '2025-02-15',
      },
      recentGrades: [
        {
          id: '1',
          subject: 'Mathematics',
          score: 85,
          date: '2025-01-20',
        },
        {
          id: '2',
          subject: 'English',
          score: 78,
          date: '2025-01-19',
        },
      ],
      recentAnnouncements: [
        {
          id: '1',
          title: 'School Resumption Date',
          date: '2025-01-20',
          preview: 'School resumes on Monday, January 27, 2025...',
        },
      ],
      upcomingEvents: [
        {
          id: '1',
          date: '2025-02-15',
          title: 'Mathematics Exam',
          description: 'First term examination',
        },
      ],
      alerts: [
        {
          id: '1',
          type: 'academic',
          message: 'New grades posted for Mathematics',
          severity: 'info',
          date: '2025-01-20',
        },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching parent dashboard:', error)
    return res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
}
