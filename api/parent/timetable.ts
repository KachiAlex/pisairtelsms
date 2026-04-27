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
      schedule: [
        {
          id: '1',
          dayOfWeek: 1,
          timeSlot: '08:00-09:00',
          subject: 'Mathematics',
          teacher: 'Mr. Johnson',
          room: 'A101',
          startTime: '08:00',
          endTime: '09:00',
        },
        {
          id: '2',
          dayOfWeek: 1,
          timeSlot: '09:00-10:00',
          subject: 'English',
          teacher: 'Mrs. Williams',
          room: 'A102',
          startTime: '09:00',
          endTime: '10:00',
        },
        {
          id: '3',
          dayOfWeek: 2,
          timeSlot: '08:00-09:00',
          subject: 'Science',
          teacher: 'Mr. Smith',
          room: 'A103',
          startTime: '08:00',
          endTime: '09:00',
        },
        {
          id: '4',
          dayOfWeek: 2,
          timeSlot: '09:00-10:00',
          subject: 'History',
          teacher: 'Mr. Brown',
          room: 'A104',
          startTime: '09:00',
          endTime: '10:00',
        },
      ],
      examSchedule: [
        {
          id: '1',
          subject: 'Mathematics',
          date: '2025-02-01',
          time: '09:00',
          room: 'Exam Hall A',
          duration: 120,
          invigilator: 'Mr. Johnson',
        },
        {
          id: '2',
          subject: 'English',
          date: '2025-02-03',
          time: '09:00',
          room: 'Exam Hall B',
          duration: 120,
          invigilator: 'Mrs. Williams',
        },
      ],
      currentTerm: termId || 'First Term 2025',
      availableTerms: [
        { id: 'term1', name: 'First Term 2025' },
        { id: 'term2', name: 'Second Term 2024' },
        { id: 'term3', name: 'Third Term 2024' },
      ],
      holidays: [
        { id: '1', name: 'New Year', startDate: '2025-01-01', endDate: '2025-01-01' },
        { id: '2', name: 'Mid-term Break', startDate: '2025-02-15', endDate: '2025-02-22' },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching timetable:', error)
    return res.status(500).json({ error: 'Failed to fetch timetable data' })
  }
}
