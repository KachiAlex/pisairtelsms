import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  // GET /api/parent/children
  if (req.method === 'GET') {
    try {
      const children = parentInfo.childrenIds.map((id, i) => ({
        id,
        name: `Child ${i + 1}`,
        admissionNumber: `ADM-${id.slice(0, 6).toUpperCase()}`,
        class: `Class ${i + 1}`,
        arm: 'A',
      }))
      return res.status(200).json({ children })
    } catch (error) {
      console.error('Error fetching children:', error)
      return res.status(500).json({ error: 'Failed to fetch children' })
    }
  }

  // POST /api/parent/children - add child
  if (req.method === 'POST') {
    try {
      const { childAdmissionNumber, relationship } = req.body

      if (!childAdmissionNumber || !relationship) {
        return res.status(400).json({ error: 'Bad request: childAdmissionNumber and relationship are required' })
      }

      // TODO: Look up student by admission number and link to parent
      return res.status(201).json({
        id: `child-${Date.now()}`,
        name: 'New Child',
        admissionNumber: childAdmissionNumber,
        class: 'JSS1',
        arm: 'A',
      })
    } catch (error) {
      console.error('Error adding child:', error)
      return res.status(500).json({ error: 'Failed to add child' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
