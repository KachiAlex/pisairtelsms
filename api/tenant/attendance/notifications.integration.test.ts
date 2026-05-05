import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { queryAll, queryOne, query } from '../cbt/_lib/db'
import {
  createGuardianNotification,
  createBulkNotificationJob,
  updateBulkNotificationJobStatus,
  updateNotificationStatus,
  getGuardianNotificationHistory,
  getStudentNotificationHistory,
  getBulkNotificationJob,
  getBulkNotificationJobs,
  getPendingNotifications,
} from '../_lib/guardian-notifications'

// Mock the database module
vi.mock('../cbt/_lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryAll: vi.fn(),
}))

const TEST_TENANT_ID = 'test-tenant-123'
const TEST_STUDENT_ID = 'STU001'
const TEST_GUARDIAN_EMAIL = 'guardian@example.com'
const TEST_GUARDIAN_PHONE = '+1234567890'

describe('Guardian Notifications Integration Tests', () => {
  beforeAll(() => {
    // Setup mocks
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    vi.mocked(queryOne).mockResolvedValue(null)
    vi.mocked(queryAll).mockResolvedValue([])
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe('4.4.1 Create notification trigger in at-risk detection', () => {
    it('should create a guardian notification for an at-risk student', async () => {
      const mockNotification = {
        id: 'notif_123',
        tenant_id: TEST_TENANT_ID,
        student_id: TEST_STUDENT_ID,
        guardian_email: TEST_GUARDIAN_EMAIL,
        guardian_phone: TEST_GUARDIAN_PHONE,
        notification_type: 'at_risk_attendance',
        title: 'Attendance Alert: John Doe',
        message: 'Your child\'s attendance has fallen below 85%.',
        attendance_percentage: 78.5,
        absence_count: 8,
        late_count: 2,
        recommended_actions: 'Please discuss attendance importance with your child.',
        delivery_status: 'pending',
        delivery_channel: 'email',
        sent_at: null,
        acknowledged_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin-user-123',
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotification)

      const notification = await createGuardianNotification(
        TEST_TENANT_ID,
        TEST_STUDENT_ID,
        TEST_GUARDIAN_EMAIL,
        TEST_GUARDIAN_PHONE,
        'at_risk_attendance',
        'Attendance Alert: John Doe',
        'Your child\'s attendance has fallen below 85%.',
        78.5,
        8,
        2,
        'Please discuss attendance importance with your child.',
        'email',
        'admin-user-123'
      )

      expect(notification).toBeDefined()
      expect(notification.id).toBe('notif_123')
      expect(notification.tenantId).toBe(TEST_TENANT_ID)
      expect(notification.studentId).toBe(TEST_STUDENT_ID)
      expect(notification.guardianEmail).toBe(TEST_GUARDIAN_EMAIL)
      expect(notification.notificationType).toBe('at_risk_attendance')
      expect(notification.deliveryStatus).toBe('pending')
      expect(notification.attendancePercentage).toBe(78.5)
      expect(notification.absenceCount).toBe(8)
      expect(notification.lateCount).toBe(2)
    })

    it('should create multiple notifications for different students', async () => {
      const mockNotif1 = {
        id: 'notif_1',
        tenant_id: TEST_TENANT_ID,
        student_id: 'STU002',
        guardian_email: 'guardian2@example.com',
        guardian_phone: '+1234567891',
        notification_type: 'at_risk_attendance',
        title: 'Alert 1',
        message: 'Message 1',
        attendance_percentage: 72.0,
        absence_count: 10,
        late_count: 1,
        recommended_actions: 'Actions 1',
        delivery_status: 'pending',
        delivery_channel: 'email',
        sent_at: null,
        acknowledged_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }

      const mockNotif2 = {
        id: 'notif_2',
        tenant_id: TEST_TENANT_ID,
        student_id: 'STU003',
        guardian_email: 'guardian3@example.com',
        guardian_phone: '+1234567892',
        notification_type: 'at_risk_attendance',
        title: 'Alert 2',
        message: 'Message 2',
        attendance_percentage: 80.0,
        absence_count: 5,
        late_count: 3,
        recommended_actions: 'Actions 2',
        delivery_status: 'pending',
        delivery_channel: 'email',
        sent_at: null,
        acknowledged_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotif1)

      const notif1 = await createGuardianNotification(
        TEST_TENANT_ID,
        'STU002',
        'guardian2@example.com',
        '+1234567891',
        'at_risk_attendance',
        'Alert 1',
        'Message 1',
        72.0,
        10,
        1,
        'Actions 1',
        'email'
      )

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotif2)

      const notif2 = await createGuardianNotification(
        TEST_TENANT_ID,
        'STU003',
        'guardian3@example.com',
        '+1234567892',
        'at_risk_attendance',
        'Alert 2',
        'Message 2',
        80.0,
        5,
        3,
        'Actions 2',
        'email'
      )

      expect(notif1.id).not.toBe(notif2.id)
      expect(notif1.studentId).toBe('STU002')
      expect(notif2.studentId).toBe('STU003')
    })
  })

  describe('4.4.2 Integrate with notification system', () => {
    it('should update notification delivery status to sent', async () => {
      const mockNotification = {
        id: 'notif_123',
        tenant_id: TEST_TENANT_ID,
        student_id: TEST_STUDENT_ID,
        guardian_email: TEST_GUARDIAN_EMAIL,
        guardian_phone: TEST_GUARDIAN_PHONE,
        notification_type: 'at_risk_attendance',
        title: 'Test Notification',
        message: 'Test message',
        attendance_percentage: 75.0,
        absence_count: 5,
        late_count: 2,
        recommended_actions: 'Test actions',
        delivery_status: 'sent',
        delivery_channel: 'email',
        sent_at: new Date().toISOString(),
        acknowledged_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotification)

      const updated = await updateNotificationStatus('notif_123', 'sent')

      expect(updated.deliveryStatus).toBe('sent')
      expect(updated.sentAt).toBeDefined()
    })

    it('should update notification delivery status to failed with error message', async () => {
      const mockNotification = {
        id: 'notif_123',
        tenant_id: TEST_TENANT_ID,
        student_id: TEST_STUDENT_ID,
        guardian_email: TEST_GUARDIAN_EMAIL,
        guardian_phone: TEST_GUARDIAN_PHONE,
        notification_type: 'at_risk_attendance',
        title: 'Test Notification',
        message: 'Test message',
        attendance_percentage: 75.0,
        absence_count: 5,
        late_count: 2,
        recommended_actions: 'Test actions',
        delivery_status: 'failed',
        delivery_channel: 'email',
        sent_at: null,
        acknowledged_at: null,
        error_message: 'Email service unavailable',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotification)

      const updated = await updateNotificationStatus(
        'notif_123',
        'failed',
        'Email service unavailable'
      )

      expect(updated.deliveryStatus).toBe('failed')
      expect(updated.errorMessage).toBe('Email service unavailable')
    })

    it('should update notification delivery status to acknowledged', async () => {
      const mockNotification = {
        id: 'notif_123',
        tenant_id: TEST_TENANT_ID,
        student_id: TEST_STUDENT_ID,
        guardian_email: TEST_GUARDIAN_EMAIL,
        guardian_phone: TEST_GUARDIAN_PHONE,
        notification_type: 'at_risk_attendance',
        title: 'Test Notification',
        message: 'Test message',
        attendance_percentage: 75.0,
        absence_count: 5,
        late_count: 2,
        recommended_actions: 'Test actions',
        delivery_status: 'acknowledged',
        delivery_channel: 'email',
        sent_at: new Date().toISOString(),
        acknowledged_at: new Date().toISOString(),
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotification)

      const updated = await updateNotificationStatus('notif_123', 'acknowledged')

      expect(updated.deliveryStatus).toBe('acknowledged')
      expect(updated.acknowledgedAt).toBeDefined()
    })
  })

  describe('4.4.3 Implement bulk notification endpoint', () => {
    it('should create a bulk notification job', async () => {
      const mockJob = {
        id: 'job_123',
        tenant_id: TEST_TENANT_ID,
        job_name: 'Test Bulk Job',
        job_type: 'at_risk_students',
        total_recipients: 5,
        sent_count: 0,
        failed_count: 0,
        acknowledged_count: 0,
        status: 'pending',
        filters: JSON.stringify({ className: 'JSS 1' }),
        created_by: 'admin-user-123',
        started_at: null,
        completed_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockJob)

      const job = await createBulkNotificationJob(
        TEST_TENANT_ID,
        'Test Bulk Job',
        'at_risk_students',
        5,
        { className: 'JSS 1' },
        'admin-user-123'
      )

      expect(job).toBeDefined()
      expect(job.id).toBe('job_123')
      expect(job.tenantId).toBe(TEST_TENANT_ID)
      expect(job.jobName).toBe('Test Bulk Job')
      expect(job.jobType).toBe('at_risk_students')
      expect(job.totalRecipients).toBe(5)
      expect(job.status).toBe('pending')
      expect(job.sentCount).toBe(0)
      expect(job.failedCount).toBe(0)
    })

    it('should update bulk notification job status to in_progress', async () => {
      const mockJob = {
        id: 'job_123',
        tenant_id: TEST_TENANT_ID,
        job_name: 'Test Bulk Job 2',
        job_type: 'at_risk_students',
        total_recipients: 3,
        sent_count: 0,
        failed_count: 0,
        acknowledged_count: 0,
        status: 'in_progress',
        filters: null,
        created_by: 'admin-user-123',
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockJob)

      const updated = await updateBulkNotificationJobStatus('job_123', 'in_progress')

      expect(updated.status).toBe('in_progress')
      expect(updated.startedAt).toBeDefined()
    })

    it('should update bulk notification job status to completed with counts', async () => {
      const mockJob = {
        id: 'job_123',
        tenant_id: TEST_TENANT_ID,
        job_name: 'Test Bulk Job 3',
        job_type: 'at_risk_students',
        total_recipients: 5,
        sent_count: 4,
        failed_count: 1,
        acknowledged_count: 2,
        status: 'completed',
        filters: null,
        created_by: 'admin-user-123',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockJob)

      const updated = await updateBulkNotificationJobStatus(
        'job_123',
        'completed',
        4,
        1,
        2
      )

      expect(updated.status).toBe('completed')
      expect(updated.sentCount).toBe(4)
      expect(updated.failedCount).toBe(1)
      expect(updated.acknowledgedCount).toBe(2)
      expect(updated.completedAt).toBeDefined()
    })

    it('should update bulk notification job status to failed with error message', async () => {
      const mockJob = {
        id: 'job_123',
        tenant_id: TEST_TENANT_ID,
        job_name: 'Test Bulk Job 4',
        job_type: 'at_risk_students',
        total_recipients: 5,
        sent_count: 0,
        failed_count: 0,
        acknowledged_count: 0,
        status: 'failed',
        filters: null,
        created_by: 'admin-user-123',
        started_at: null,
        completed_at: new Date().toISOString(),
        error_message: 'Database connection failed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockJob)

      const updated = await updateBulkNotificationJobStatus(
        'job_123',
        'failed',
        undefined,
        undefined,
        undefined,
        'Database connection failed'
      )

      expect(updated.status).toBe('failed')
      expect(updated.errorMessage).toBe('Database connection failed')
      expect(updated.completedAt).toBeDefined()
    })
  })

  describe('4.4.4 Add notification history tracking', () => {
    it('should retrieve guardian notification history', async () => {
      const mockNotifications = [
        {
          id: 'notif_1',
          tenant_id: TEST_TENANT_ID,
          student_id: 'STU004',
          guardian_email: 'guardian4@example.com',
          guardian_phone: '+1234567893',
          notification_type: 'at_risk_attendance',
          title: 'Alert 1',
          message: 'Message 1',
          attendance_percentage: 75.0,
          absence_count: 5,
          late_count: 2,
          recommended_actions: 'Actions 1',
          delivery_status: 'pending',
          delivery_channel: 'email',
          sent_at: null,
          acknowledged_at: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        },
      ]

      vi.mocked(queryOne).mockResolvedValueOnce({ count: '2' })
      vi.mocked(queryAll).mockResolvedValueOnce(mockNotifications)

      const result = await getGuardianNotificationHistory(
        TEST_TENANT_ID,
        'guardian4@example.com',
        50,
        0
      )

      expect(result.notifications.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(2)
      expect(result.notifications[0].guardianEmail).toBe('guardian4@example.com')
    })

    it('should retrieve student notification history', async () => {
      const mockNotifications = [
        {
          id: 'notif_1',
          tenant_id: TEST_TENANT_ID,
          student_id: 'STU006',
          guardian_email: 'guardian6a@example.com',
          guardian_phone: '+1234567894',
          notification_type: 'at_risk_attendance',
          title: 'Alert 1',
          message: 'Message 1',
          attendance_percentage: 75.0,
          absence_count: 5,
          late_count: 2,
          recommended_actions: 'Actions 1',
          delivery_status: 'pending',
          delivery_channel: 'email',
          sent_at: null,
          acknowledged_at: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        },
      ]

      vi.mocked(queryOne).mockResolvedValueOnce({ count: '2' })
      vi.mocked(queryAll).mockResolvedValueOnce(mockNotifications)

      const result = await getStudentNotificationHistory(
        TEST_TENANT_ID,
        'STU006',
        50,
        0
      )

      expect(result.notifications.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(2)
      expect(result.notifications.every(n => n.studentId === 'STU006')).toBe(true)
    })

    it('should retrieve pending notifications for delivery', async () => {
      const mockNotifications = [
        {
          id: 'notif_1',
          tenant_id: TEST_TENANT_ID,
          student_id: 'STU007',
          guardian_email: 'guardian7@example.com',
          guardian_phone: '+1234567896',
          notification_type: 'at_risk_attendance',
          title: 'Alert 1',
          message: 'Message 1',
          attendance_percentage: 75.0,
          absence_count: 5,
          late_count: 2,
          recommended_actions: 'Actions 1',
          delivery_status: 'pending',
          delivery_channel: 'email',
          sent_at: null,
          acknowledged_at: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        },
      ]

      vi.mocked(queryAll).mockResolvedValueOnce(mockNotifications)

      const pending = await getPendingNotifications(100)

      expect(pending.length).toBeGreaterThanOrEqual(1)
      expect(pending.every(n => n.deliveryStatus === 'pending')).toBe(true)
    })

    it('should support pagination for notification history', async () => {
      const mockNotifications = [
        {
          id: 'notif_1',
          tenant_id: TEST_TENANT_ID,
          student_id: 'STU_PAGE_0',
          guardian_email: 'guardian-page@example.com',
          guardian_phone: '+1234567898',
          notification_type: 'at_risk_attendance',
          title: 'Alert 0',
          message: 'Message 0',
          attendance_percentage: 75.0,
          absence_count: 5,
          late_count: 2,
          recommended_actions: 'Actions',
          delivery_status: 'pending',
          delivery_channel: 'email',
          sent_at: null,
          acknowledged_at: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        },
      ]

      vi.mocked(queryOne).mockResolvedValueOnce({ count: '5' })
      vi.mocked(queryAll).mockResolvedValueOnce(mockNotifications)

      const page1 = await getGuardianNotificationHistory(
        TEST_TENANT_ID,
        'guardian-page@example.com',
        2,
        0
      )

      expect(page1.notifications.length).toBeLessThanOrEqual(2)
      expect(page1.total).toBe(5)
    })
  })

  describe('4.4.5 Add integration tests', () => {
    it('should retrieve bulk notification job by ID', async () => {
      const mockJob = {
        id: 'job_123',
        tenant_id: TEST_TENANT_ID,
        job_name: 'Test Job for Retrieval',
        job_type: 'at_risk_students',
        total_recipients: 10,
        sent_count: 0,
        failed_count: 0,
        acknowledged_count: 0,
        status: 'pending',
        filters: JSON.stringify({ className: 'JSS 2' }),
        created_by: 'admin-user-123',
        started_at: null,
        completed_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.mocked(queryOne).mockResolvedValueOnce(mockJob)

      const retrieved = await getBulkNotificationJob('job_123')

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('job_123')
      expect(retrieved?.jobName).toBe('Test Job for Retrieval')
      expect(retrieved?.totalRecipients).toBe(10)
    })

    it('should retrieve all bulk notification jobs for a tenant', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          tenant_id: TEST_TENANT_ID,
          job_name: 'Job 1',
          job_type: 'at_risk_students',
          total_recipients: 5,
          sent_count: 0,
          failed_count: 0,
          acknowledged_count: 0,
          status: 'pending',
          filters: null,
          created_by: 'admin-user-123',
          started_at: null,
          completed_at: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      vi.mocked(queryOne).mockResolvedValueOnce({ count: '2' })
      vi.mocked(queryAll).mockResolvedValueOnce(mockJobs)

      const result = await getBulkNotificationJobs(TEST_TENANT_ID, 50, 0)

      expect(result.jobs.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(2)
      expect(result.jobs.every(j => j.tenantId === TEST_TENANT_ID)).toBe(true)
    })

    it('should support pagination for bulk notification jobs', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          tenant_id: TEST_TENANT_ID,
          job_name: 'Pagination Job 0',
          job_type: 'at_risk_students',
          total_recipients: 5,
          sent_count: 0,
          failed_count: 0,
          acknowledged_count: 0,
          status: 'pending',
          filters: null,
          created_by: 'admin-user-123',
          started_at: null,
          completed_at: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      vi.mocked(queryOne).mockResolvedValueOnce({ count: '5' })
      vi.mocked(queryAll).mockResolvedValueOnce(mockJobs)

      const page1 = await getBulkNotificationJobs(TEST_TENANT_ID, 2, 0)

      expect(page1.jobs.length).toBeLessThanOrEqual(2)
      expect(page1.total).toBe(5)
    })

    it('should handle notification creation with all optional fields', async () => {
      const mockNotification = {
        id: 'notif_full',
        tenant_id: TEST_TENANT_ID,
        student_id: 'STU_FULL',
        guardian_email: 'guardian-full@example.com',
        guardian_phone: '+1234567899',
        notification_type: 'manual_alert',
        title: 'Manual Alert Title',
        message: 'This is a manual alert message',
        attendance_percentage: 85.5,
        absence_count: 3,
        late_count: 1,
        recommended_actions: 'Recommended actions for manual alert',
        delivery_status: 'pending',
        delivery_channel: 'both',
        sent_at: null,
        acknowledged_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin-user-456',
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotification)

      const notification = await createGuardianNotification(
        TEST_TENANT_ID,
        'STU_FULL',
        'guardian-full@example.com',
        '+1234567899',
        'manual_alert',
        'Manual Alert Title',
        'This is a manual alert message',
        85.5,
        3,
        1,
        'Recommended actions for manual alert',
        'both',
        'admin-user-456'
      )

      expect(notification.guardianPhone).toBe('+1234567899')
      expect(notification.notificationType).toBe('manual_alert')
      expect(notification.deliveryChannel).toBe('both')
      expect(notification.createdBy).toBe('admin-user-456')
    })

    it('should handle notification creation with minimal fields', async () => {
      const mockNotification = {
        id: 'notif_minimal',
        tenant_id: TEST_TENANT_ID,
        student_id: 'STU_MINIMAL',
        guardian_email: 'guardian-minimal@example.com',
        guardian_phone: null,
        notification_type: 'at_risk_attendance',
        title: 'Minimal Alert',
        message: 'Minimal message',
        attendance_percentage: 80.0,
        absence_count: 2,
        late_count: 1,
        recommended_actions: 'Minimal actions',
        delivery_status: 'pending',
        delivery_channel: 'email',
        sent_at: null,
        acknowledged_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }

      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
      vi.mocked(queryOne).mockResolvedValueOnce(mockNotification)

      const notification = await createGuardianNotification(
        TEST_TENANT_ID,
        'STU_MINIMAL',
        'guardian-minimal@example.com',
        undefined,
        'at_risk_attendance',
        'Minimal Alert',
        'Minimal message',
        80.0,
        2,
        1,
        'Minimal actions'
      )

      expect(notification.guardianPhone).toBeNull()
      expect(notification.createdBy).toBeNull()
      expect(notification.deliveryChannel).toBe('email')
    })
  })
})
