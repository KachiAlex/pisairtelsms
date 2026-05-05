import { queryAll, queryOne, query } from '../cbt/_lib/db.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface GuardianNotification {
  id: string
  tenantId: string
  studentId: string
  guardianEmail: string
  guardianPhone?: string
  notificationType: 'at_risk_attendance' | 'attendance_improvement' | 'manual_alert'
  title: string
  message: string
  attendancePercentage?: number
  absenceCount?: number
  lateCount?: number
  recommendedActions?: string
  deliveryStatus: 'pending' | 'sent' | 'failed' | 'acknowledged'
  deliveryChannel: 'email' | 'sms' | 'both'
  sentAt?: string
  acknowledgedAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface BulkNotificationJob {
  id: string
  tenantId: string
  jobName: string
  jobType: 'at_risk_students' | 'manual_bulk' | 'scheduled'
  totalRecipients: number
  sentCount: number
  failedCount: number
  acknowledgedCount: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  filters?: Record<string, any>
  createdBy: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

/**
 * Create a guardian notification for an at-risk student
 * Validates: Requirements 18
 */
export async function createGuardianNotification(
  tenantId: string,
  studentId: string,
  guardianEmail: string,
  guardianPhone: string | undefined,
  notificationType: 'at_risk_attendance' | 'attendance_improvement' | 'manual_alert',
  title: string,
  message: string,
  attendancePercentage: number,
  absenceCount: number,
  lateCount: number,
  recommendedActions: string,
  deliveryChannel: 'email' | 'sms' | 'both' = 'email',
  createdBy?: string
): Promise<GuardianNotification> {
  try {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    await query(
      `INSERT INTO guardian_notifications (
        id, tenant_id, student_id, guardian_email, guardian_phone,
        notification_type, title, message, attendance_percentage,
        absence_count, late_count, recommended_actions, delivery_status,
        delivery_channel, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        id,
        tenantId,
        studentId,
        guardianEmail,
        guardianPhone || null,
        notificationType,
        title,
        message,
        attendancePercentage,
        absenceCount,
        lateCount,
        recommendedActions,
        'pending',
        deliveryChannel,
        now,
        now,
        createdBy || null,
      ]
    )

    const notification = await queryOne<any>(
      'SELECT * FROM guardian_notifications WHERE id = $1',
      [id]
    )

    return mapNotificationRow(notification!)
  } catch (error) {
    console.error('Error creating guardian notification:', error)
    throw new Error('Failed to create guardian notification')
  }
}

/**
 * Create bulk notification job for at-risk students
 */
export async function createBulkNotificationJob(
  tenantId: string,
  jobName: string,
  jobType: 'at_risk_students' | 'manual_bulk' | 'scheduled',
  totalRecipients: number,
  filters: Record<string, any> | undefined,
  createdBy: string
): Promise<BulkNotificationJob> {
  try {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    await query(
      `INSERT INTO bulk_notification_jobs (
        id, tenant_id, job_name, job_type, total_recipients,
        filters, created_by, created_at, updated_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        tenantId,
        jobName,
        jobType,
        totalRecipients,
        filters ? JSON.stringify(filters) : null,
        createdBy,
        now,
        now,
        'pending',
      ]
    )

    const job = await queryOne<any>(
      'SELECT * FROM bulk_notification_jobs WHERE id = $1',
      [id]
    )

    return mapBulkJobRow(job!)
  } catch (error) {
    console.error('Error creating bulk notification job:', error)
    throw new Error('Failed to create bulk notification job')
  }
}

/**
 * Update bulk notification job status
 */
export async function updateBulkNotificationJobStatus(
  jobId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled',
  sentCount?: number,
  failedCount?: number,
  acknowledgedCount?: number,
  errorMessage?: string
): Promise<BulkNotificationJob> {
  try {
    const now = new Date().toISOString()
    const updates: string[] = ['status = $1', 'updated_at = $2']
    const values: any[] = [status, now]
    let paramIndex = 3

    if (sentCount !== undefined) {
      updates.push(`sent_count = $${paramIndex++}`)
      values.push(sentCount)
    }

    if (failedCount !== undefined) {
      updates.push(`failed_count = $${paramIndex++}`)
      values.push(failedCount)
    }

    if (acknowledgedCount !== undefined) {
      updates.push(`acknowledged_count = $${paramIndex++}`)
      values.push(acknowledgedCount)
    }

    if (errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex++}`)
      values.push(errorMessage)
    }

    if (status === 'in_progress') {
      updates.push(`started_at = $${paramIndex++}`)
      values.push(now)
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.push(`completed_at = $${paramIndex++}`)
      values.push(now)
    }

    values.push(jobId)

    await query(
      `UPDATE bulk_notification_jobs
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    const job = await queryOne<any>(
      'SELECT * FROM bulk_notification_jobs WHERE id = $1',
      [jobId]
    )

    return mapBulkJobRow(job!)
  } catch (error) {
    console.error('Error updating bulk notification job:', error)
    throw new Error('Failed to update bulk notification job')
  }
}

/**
 * Update notification delivery status
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: 'sent' | 'failed' | 'acknowledged',
  errorMessage?: string
): Promise<GuardianNotification> {
  try {
    const now = new Date().toISOString()

    if (status === 'acknowledged') {
      await query(
        `UPDATE guardian_notifications
         SET delivery_status = $1, acknowledged_at = $2, updated_at = $3
         WHERE id = $4`,
        [status, now, now, notificationId]
      )
    } else if (status === 'failed') {
      await query(
        `UPDATE guardian_notifications
         SET delivery_status = $1, error_message = $2, updated_at = $3
         WHERE id = $4`,
        [status, errorMessage || null, now, notificationId]
      )
    } else {
      await query(
        `UPDATE guardian_notifications
         SET delivery_status = $1, sent_at = $2, updated_at = $3
         WHERE id = $4`,
        [status, now, now, notificationId]
      )
    }

    const notification = await queryOne<any>(
      'SELECT * FROM guardian_notifications WHERE id = $1',
      [notificationId]
    )

    return mapNotificationRow(notification!)
  } catch (error) {
    console.error('Error updating notification status:', error)
    throw new Error('Failed to update notification status')
  }
}

/**
 * Get notification history for a guardian
 */
export async function getGuardianNotificationHistory(
  tenantId: string,
  guardianEmail: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ notifications: GuardianNotification[]; total: number }> {
  try {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM guardian_notifications
       WHERE tenant_id = $1 AND guardian_email = $2`,
      [tenantId, guardianEmail]
    )

    const rows = await queryAll<any>(
      `SELECT * FROM guardian_notifications
       WHERE tenant_id = $1 AND guardian_email = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, guardianEmail, limit, offset]
    )

    const notifications = rows.map(mapNotificationRow)

    return {
      notifications,
      total: parseInt(countResult?.count || '0'),
    }
  } catch (error) {
    console.error('Error fetching guardian notification history:', error)
    throw new Error('Failed to fetch notification history')
  }
}

/**
 * Get notification history for a student
 */
export async function getStudentNotificationHistory(
  tenantId: string,
  studentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ notifications: GuardianNotification[]; total: number }> {
  try {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM guardian_notifications
       WHERE tenant_id = $1 AND student_id = $2`,
      [tenantId, studentId]
    )

    const rows = await queryAll<any>(
      `SELECT * FROM guardian_notifications
       WHERE tenant_id = $1 AND student_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, studentId, limit, offset]
    )

    const notifications = rows.map(mapNotificationRow)

    return {
      notifications,
      total: parseInt(countResult?.count || '0'),
    }
  } catch (error) {
    console.error('Error fetching student notification history:', error)
    throw new Error('Failed to fetch notification history')
  }
}

/**
 * Get bulk notification job details
 */
export async function getBulkNotificationJob(
  jobId: string
): Promise<BulkNotificationJob | null> {
  try {
    const row = await queryOne<any>(
      'SELECT * FROM bulk_notification_jobs WHERE id = $1',
      [jobId]
    )

    return row ? mapBulkJobRow(row) : null
  } catch (error) {
    console.error('Error fetching bulk notification job:', error)
    throw new Error('Failed to fetch bulk notification job')
  }
}

/**
 * Get all bulk notification jobs for a tenant
 */
export async function getBulkNotificationJobs(
  tenantId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ jobs: BulkNotificationJob[]; total: number }> {
  try {
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM bulk_notification_jobs
       WHERE tenant_id = $1`,
      [tenantId]
    )

    const rows = await queryAll<any>(
      `SELECT * FROM bulk_notification_jobs
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    )

    const jobs = rows.map(mapBulkJobRow)

    return {
      jobs,
      total: parseInt(countResult?.count || '0'),
    }
  } catch (error) {
    console.error('Error fetching bulk notification jobs:', error)
    throw new Error('Failed to fetch bulk notification jobs')
  }
}

/**
 * Get pending notifications for delivery
 */
export async function getPendingNotifications(
  limit: number = 100
): Promise<GuardianNotification[]> {
  try {
    const rows = await queryAll<any>(
      `SELECT * FROM guardian_notifications
       WHERE delivery_status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    )

    return rows.map(mapNotificationRow)
  } catch (error) {
    console.error('Error fetching pending notifications:', error)
    throw new Error('Failed to fetch pending notifications')
  }
}

/**
 * Helper function to map database row to GuardianNotification
 */
function mapNotificationRow(row: any): GuardianNotification {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    guardianEmail: row.guardian_email,
    guardianPhone: row.guardian_phone,
    notificationType: row.notification_type,
    title: row.title,
    message: row.message,
    attendancePercentage: row.attendance_percentage,
    absenceCount: row.absence_count,
    lateCount: row.late_count,
    recommendedActions: row.recommended_actions,
    deliveryStatus: row.delivery_status,
    deliveryChannel: row.delivery_channel,
    sentAt: row.sent_at,
    acknowledgedAt: row.acknowledged_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }
}

/**
 * Helper function to map database row to BulkNotificationJob
 */
function mapBulkJobRow(row: any): BulkNotificationJob {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    jobName: row.job_name,
    jobType: row.job_type,
    totalRecipients: row.total_recipients,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    acknowledgedCount: row.acknowledged_count,
    status: row.status,
    filters: row.filters ? JSON.parse(row.filters) : undefined,
    createdBy: row.created_by,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
