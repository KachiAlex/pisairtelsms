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
      schedule: [
        { id: '1', dayOfWeek: 1, timeSlot: '08:00-09:00', subject: 'Mathematics', teacher: 'Mr. Johnson', room: 'Room 101', startTime: '08:00', endTime: '09:00' },
        { id: '2', dayOfWeek: 1, timeSlot: '09:00-10:00', subject: 'English', teacher: 'Mrs. Smith', room: 'Room 102', startTime: '09:00', endTime: '10:00' },
        { id: '3', dayOfWeek: 2, timeSlot: '08:00-09:00', subject: 'Physics', teacher: 'Mr. Brown', room: 'Lab 1', startTime: '08:00', endTime: '09:00' },
        { id: '4', dayOfWeek: 3, timeSlot: '08:00-09:00', subject: 'Chemistry', teacher: 'Mrs. Davis', room: 'Lab 2', startTime: '08:00', endTime: '09:00' },
        { id: '5', dayOfWeek: 4, timeSlot: '08:00-09:00', subject: 'Biology', teacher: 'Mr. Wilson', room: 'Lab 3', startTime: '08:00', endTime: '09:00' },
        { id: '6', dayOfWeek: 5, timeSlot: '08:00-09:00', subject: 'Geography', teacher: 'Mrs. Taylor', room: 'Room 103', startTime: '08:00', endTime: '09:00' },
      ],
      examSchedule: [
        { id: '1', subject: 'Mathematics', date: '2025-02-15', time: '09:00 AM', room: 'Hall A', duration: 120, invigilator: 'Mr. Johnson' },
        { id: '2', subject: 'English', date: '2025-02-16', time: '09:00 AM', room: 'Hall A', duration: 120, invigilator: 'Mrs. Smith' },
      ],
      currentTerm: 'First Term 2024/2025',
      availableTerms: [
        { id: 'term-1', name: 'First Term 2024/2025' },
        { id: 'term-2', name: 'Second Term 2024/2025' },
      ],
      holidays: [
        { id: '1', name: 'Mid-Term Break', startDate: '2025-02-03', endDate: '2025-02-07' },
      ],
    })
  } catch (error) {
    console.error('Error fetching timetable:', error)
    return res.status(500).json({ error: 'Failed to fetch timetable data' })
  }
}
