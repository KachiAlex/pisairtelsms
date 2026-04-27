import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

const defaultPreferences = {
  emailNotifications: true,
  inAppNotifications: true,
  smsNotifications: false,
  notificationTypes: {
    academic: true,
    attendance: true,
    behavioral: true,
    fees: true,
    communication: true,
    health: true,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  if (req.method === 'GET') {
    // TODO: Fetch from database
    return res.status(200).json(defaultPreferences)
  }

  if (req.method === 'PUT') {
    try {
      const updates = req.body
      // TODO: Save to database
      const updated = { ...defaultPreferences, ...updates }
      return res.status(200).json(updated)
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
