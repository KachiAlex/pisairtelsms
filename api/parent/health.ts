import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const childId = req.query.childId as string
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const [medRows, vacRows, allergyRows, contactRows] = await Promise.all([
      sql`
        SELECT id, date::text, type, description, COALESCE(recorded_by, '') AS recorded_by
        FROM student_health_records
        WHERE student_id = ${childId}
        ORDER BY date DESC
      `,
      sql`
        SELECT id, name, date::text, next_due_date::text AS next_due_date, status
        FROM student_vaccinations
        WHERE student_id = ${childId}
        ORDER BY date DESC
      `,
      sql`
        SELECT id, allergen, severity, COALESCE(reaction, '') AS reaction
        FROM student_allergies
        WHERE student_id = ${childId}
      `,
      sql`
        SELECT id, name, COALESCE(relationship, '') AS relationship,
               COALESCE(phone, '') AS phone, COALESCE(email, '') AS email
        FROM student_emergency_contacts
        WHERE student_id = ${childId}
        ORDER BY name
      `,
    ])

    return res.status(200).json({
      medicalHistory: medRows.rows.map(r => ({
        id: r.id, date: r.date, type: r.type, description: r.description, recordedBy: r.recorded_by,
      })),
      vaccinations: vacRows.rows.map(r => ({
        id: r.id, name: r.name, date: r.date, nextDueDate: r.next_due_date ?? '',
        status: r.status as 'completed' | 'pending' | 'overdue',
      })),
      allergies: allergyRows.rows.map(r => ({
        id: r.id, allergen: r.allergen,
        severity: r.severity as 'mild' | 'moderate' | 'severe', reaction: r.reaction,
      })),
      emergencyContacts: contactRows.rows.map(r => ({
        id: r.id, name: r.name, relationship: r.relationship, phone: r.phone, email: r.email,
      })),
      healthInitiatives: [],
    })
  } catch (error) {
    console.error('Error fetching health data:', error)
    return res.status(500).json({ error: 'Failed to fetch health data' })
  }
}
