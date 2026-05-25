import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT')
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

    const { announcementId } = req.query

    if (!announcementId) {
      return res.status(400).json({ error: 'Bad request: announcementId is required' })
    }

    const id = Array.isArray(announcementId) ? announcementId[0] : announcementId
    await sql`
      INSERT INTO parent_announcement_reads (parent_id, announcement_id, read_at)
      VALUES (${parentInfo.parentId}, ${id}, NOW())
      ON CONFLICT (parent_id, announcement_id) DO UPDATE SET read_at = NOW()
    `
    return res.status(200).json({ id, isRead: true })
  } catch (error) {
    console.error('Error marking announcement as read:', error)
    return res.status(500).json({ error: 'Failed to update announcement' })
  }
}
