import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  if (req.method === 'GET') {
    try {
      // TODO: Fetch from database
      return res.status(200).json({
        id: parentInfo.parentId,
        name: 'Parent Name',
        email: parentInfo.email,
        phone: '+234-800-000-0000',
        address: '123 Main Street, Lagos',
        linkedChildren: parentInfo.childrenIds.map((id, i) => ({
          id,
          name: `Child ${i + 1}`,
          admissionNumber: `ADM-${id.slice(0, 6).toUpperCase()}`,
          class: `Class ${i + 1}`,
        })),
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      return res.status(500).json({ error: 'Failed to fetch profile' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { email, phone, address } = req.body
      // TODO: Update in database
      return res.status(200).json({
        id: parentInfo.parentId,
        name: 'Parent Name',
        email: email || parentInfo.email,
        phone: phone || '+234-800-000-0000',
        address: address || '123 Main Street, Lagos',
        linkedChildren: [],
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      return res.status(500).json({ error: 'Failed to update profile' })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
