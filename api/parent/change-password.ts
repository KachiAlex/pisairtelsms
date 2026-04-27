import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Bad request: currentPassword and newPassword are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Bad request: newPassword must be at least 8 characters' })
    }

    // TODO: Verify current password and update in database
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return res.status(500).json({ error: 'Failed to change password' })
  }
}
