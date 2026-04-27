import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'PUT') {
    return handlePut(req, res)
  } else {
    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const response = {
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

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return res.status(500).json({ error: 'Failed to fetch preferences' })
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { emailNotifications, inAppNotifications, smsNotifications, notificationTypes } = req.body

    // TODO: Update preferences in database
    const response = {
      emailNotifications: emailNotifications ?? true,
      inAppNotifications: inAppNotifications ?? true,
      smsNotifications: smsNotifications ?? false,
      notificationTypes: notificationTypes || {
        academic: true,
        attendance: true,
        behavioral: true,
        fees: true,
        communication: true,
        health: true,
      },
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return res.status(500).json({ error: 'Failed to update preferences' })
  }
}
