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
      medicalHistory: [
        { id: '1', date: '2024-09-01', type: 'General Checkup', description: 'Annual health screening', recordedBy: 'School Nurse' },
      ],
      vaccinations: [
        { id: '1', name: 'Hepatitis B', date: '2024-01-15', nextDueDate: null, status: 'completed' },
        { id: '2', name: 'Meningitis', date: '2024-01-15', nextDueDate: '2026-01-15', status: 'completed' },
      ],
      allergies: [],
      emergencyContacts: [
        { id: '1', name: 'Parent Name', relationship: 'Parent', phone: '+234-800-000-0000', email: 'parent@email.com' },
      ],
      healthInitiatives: [
        { id: '1', name: 'Annual Health Screening', description: 'Yearly health check for all students', date: '2025-03-01', type: 'screening' },
      ],
    })
  } catch (error) {
    console.error('Error fetching health data:', error)
    return res.status(500).json({ error: 'Failed to fetch health data' })
  }
}
