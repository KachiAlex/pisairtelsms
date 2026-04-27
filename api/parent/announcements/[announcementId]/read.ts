import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  const { announcementId } = req.query

  try {
    // TODO: Update read status in database
    return res.status(200).json({ id: announcementId, isRead: true })
  } catch (error) {
    console.error('Error marking announcement as read:', error)
    return res.status(500).json({ error: 'Failed to update announcement' })
  }
}
