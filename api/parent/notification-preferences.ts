import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
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

    const result = await sql`
      SELECT * FROM parent_notification_preferences WHERE parent_id = ${parentInfo.parentId} LIMIT 1
    `

    if (result.rows[0]) {
      const r = result.rows[0]
      return res.status(200).json({
        emailNotifications: r.email_notifications,
        inAppNotifications: r.in_app_notifications,
        smsNotifications: r.sms_notifications,
        notificationTypes: {
          academic: r.academic,
          attendance: r.attendance,
          behavioral: r.behavioral,
          fees: r.fees,
          communication: r.communication,
          health: r.health,
        },
      })
    }

    // Default response if no record exists
    return res.status(200).json({
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
    })
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

    await sql`
      INSERT INTO parent_notification_preferences (
        parent_id, email_notifications, in_app_notifications, sms_notifications,
        academic, attendance, behavioral, fees, communication, health
      ) VALUES (
        ${parentInfo.parentId},
        ${emailNotifications ?? true},
        ${inAppNotifications ?? true},
        ${smsNotifications ?? false},
        ${notificationTypes?.academic ?? true},
        ${notificationTypes?.attendance ?? true},
        ${notificationTypes?.behavioral ?? true},
        ${notificationTypes?.fees ?? true},
        ${notificationTypes?.communication ?? true},
        ${notificationTypes?.health ?? true}
      )
      ON CONFLICT (parent_id) DO UPDATE SET
        email_notifications = EXCLUDED.email_notifications,
        in_app_notifications = EXCLUDED.in_app_notifications,
        sms_notifications = EXCLUDED.sms_notifications,
        academic = EXCLUDED.academic,
        attendance = EXCLUDED.attendance,
        behavioral = EXCLUDED.behavioral,
        fees = EXCLUDED.fees,
        communication = EXCLUDED.communication,
        health = EXCLUDED.health,
        updated_at = NOW()
    `

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
