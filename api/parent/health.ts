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
      medicalHistory: [
        {
          id: '1',
          date: '2024-12-15',
          type: 'Checkup',
          description: 'Annual health checkup - All clear',
          recordedBy: 'Dr. Okafor',
        },
        {
          id: '2',
          date: '2024-11-20',
          type: 'Vaccination',
          description: 'Flu shot administered',
          recordedBy: 'Nurse Adekunle',
        },
      ],
      vaccinations: [
        {
          id: '1',
          name: 'Polio',
          date: '2024-06-15',
          nextDueDate: '2025-06-15',
          status: 'completed' as const,
        },
        {
          id: '2',
          name: 'Measles',
          date: '2024-07-20',
          nextDueDate: '2025-07-20',
          status: 'completed' as const,
        },
        {
          id: '3',
          name: 'Typhoid',
          date: '2024-08-10',
          nextDueDate: '2025-08-10',
          status: 'completed' as const,
        },
      ],
      allergies: [
        {
          id: '1',
          allergen: 'Peanuts',
          severity: 'moderate' as const,
          reaction: 'Itching and swelling',
        },
        {
          id: '2',
          allergen: 'Penicillin',
          severity: 'severe' as const,
          reaction: 'Rash and difficulty breathing',
        },
      ],
      emergencyContacts: [
        {
          id: '1',
          name: 'Mother',
          relationship: 'Mother',
          phone: '+234-801-234-5678',
          email: 'mother@example.com',
        },
        {
          id: '2',
          name: 'Father',
          relationship: 'Father',
          phone: '+234-802-234-5678',
          email: 'father@example.com',
        },
      ],
      healthInitiatives: [
        {
          id: '1',
          name: 'Sports Day',
          description: 'Annual inter-house sports competition',
          date: '2025-02-10',
          type: 'Sports',
        },
        {
          id: '2',
          name: 'Health Awareness',
          description: 'Nutrition and wellness seminar',
          date: '2025-02-20',
          type: 'Wellness',
        },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching health data:', error)
    return res.status(500).json({ error: 'Failed to fetch health data' })
  }
}
