import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  const { childId } = req.query as { childId: string }

  if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
    return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
  }

  try {
    // TODO: Remove child link from database
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error removing child:', error)
    return res.status(500).json({ error: 'Failed to remove child' })
  }
}
