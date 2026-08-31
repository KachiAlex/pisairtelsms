import { sql } from './db.js'

export interface AdminNotification {
  id: string
  tenantId: string
  type: 'payment_pending' | 'payment_confirmed' | 'payment_rejected'
  title: string
  message: string
  paymentId: string
  studentId: string
  studentName?: string
  amount: number
  read: boolean
  createdAt: string
}

export async function createAdminNotification(
  tenantId: string,
  type: 'payment_pending' | 'payment_confirmed' | 'payment_rejected',
  paymentId: string,
  studentId: string,
  studentName: string | undefined,
  amount: number,
  additionalData?: Record<string, any>
): Promise<AdminNotification> {
  try {
    const id = `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    let title = ''
    let message = ''

    switch (type) {
      case 'payment_pending':
        title = 'Manual Payment Pending Review'
        message = `Manual payment of ₦${amount.toLocaleString()} from ${studentName || studentId} requires review.`
        break
      case 'payment_confirmed':
        title = 'Payment Confirmed'
        message = `Payment of ₦${amount.toLocaleString()} from ${studentName || studentId} has been confirmed.`
        break
      case 'payment_rejected':
        title = 'Payment Rejected'
        message = `Payment of ₦${amount.toLocaleString()} from ${studentName || studentId} was rejected.`
        if (additionalData?.rejectionReason) {
          message += ` Reason: ${additionalData.rejectionReason}`
        }
        break
    }

    await sql`
      INSERT INTO admin_notifications (
        id, tenant_id, type, title, message, payment_id, student_id,
        student_name, amount, read, created_at
      ) VALUES (
        ${id}, ${tenantId}, ${type}, ${title}, ${message}, ${paymentId},
        ${studentId}, ${studentName || null}, ${amount}, false, ${now}
      )
    `

    const result = await sql`SELECT * FROM admin_notifications WHERE id = ${id}`
    if (result.rows.length === 0) {
      throw new Error('Failed to create notification')
    }

    return mapNotificationRow(result.rows[0])
  } catch (error) {
    console.error('Error creating admin notification:', error)
    throw new Error('Failed to create admin notification')
  }
}

export async function getAdminNotifications(
  tenantId: string,
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<AdminNotification[]> {
  try {
    let result
    if (unreadOnly) {
      result = await sql`
        SELECT * FROM admin_notifications
        WHERE tenant_id = ${tenantId} AND read = false
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else {
      result = await sql`
        SELECT * FROM admin_notifications
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    }
    return (result.rows || []).map(mapNotificationRow)
  } catch (error) {
    console.error('Error fetching admin notifications:', error)
    return []
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await sql`UPDATE admin_notifications SET read = true WHERE id = ${notificationId}`
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

export async function markAllNotificationsAsRead(tenantId: string): Promise<void> {
  try {
    await sql`UPDATE admin_notifications SET read = true WHERE tenant_id = ${tenantId}`
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

export async function getUnreadCount(tenantId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM admin_notifications
      WHERE tenant_id = ${tenantId} AND read = false
    `
    return parseInt(result.rows[0]?.count || '0')
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

export async function ensureAdminNotificationsTable(): Promise<void> {
  try {
    } catch (error) {
    console.error('Error ensuring admin_notifications table:', error)
  }
}

function mapNotificationRow(row: any): AdminNotification {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    title: row.title,
    message: row.message,
    paymentId: row.payment_id,
    studentId: row.student_id,
    studentName: row.student_name,
    amount: parseFloat(row.amount),
    read: row.read,
    createdAt: row.created_at,
  }
}
