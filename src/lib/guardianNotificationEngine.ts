import {
  GuardianContact,
  NotificationEvent,
  NotificationTemplate,
  NotificationSchedule,
  defaultNotificationTemplates,
  defaultNotificationSchedules,
  type NotificationEvent as NotificationEventType
} from './notificationTypes'

interface NotificationResult {
  success: boolean
  eventId: string
  channel: string
  error?: string
  deliveryId?: string
}

interface NotificationContext {
  studentName: string
  guardianName: string
  documentName: string
  documentCategory: string
  deadlineDate?: string
  approvalDeadline?: string
  daysRemaining?: number
  daysOverdue?: number
  approverName?: string
  approvalDate?: string
  rejectionReason?: string
  consequences?: string
  schoolName: string
}

class GuardianNotificationEngine {
  private templates: Map<string, NotificationTemplate> = new Map()
  private schedules: Map<string, NotificationSchedule> = new Map()
  private pendingNotifications: NotificationEvent[] = []

  constructor(
    customTemplates?: NotificationTemplate[],
    customSchedules?: NotificationSchedule[]
  ) {
    // Load default templates
    defaultNotificationTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })

    // Load default schedules
    Object.values(defaultNotificationSchedules).forEach(schedule => {
      this.schedules.set(schedule.eventType, schedule)
    })

    // Override with custom templates and schedules
    if (customTemplates) {
      customTemplates.forEach(template => {
        this.templates.set(template.id, template)
      })
    }

    if (customSchedules) {
      customSchedules.forEach(schedule => {
        this.schedules.set(schedule.eventType, schedule)
      })
    }
  }

  /**
   * Schedules notifications for a document approval workflow
   */
  async scheduleWorkflowNotifications(
    workflowId: string,
    documentId: string,
    studentId: string,
    guardian: GuardianContact,
    documentName: string,
    documentCategory: string,
    deadlineDate: string,
    approvalRequired: boolean = false
  ): Promise<NotificationEvent[]> {
    const events: NotificationEvent[] = []
    const now = new Date().toISOString()

    // Schedule document request notifications
    if (!approvalRequired) {
      const requestEvents = this.scheduleDocumentRequestNotifications(
        documentId,
        studentId,
        guardian,
        documentName,
        documentCategory,
        deadlineDate
      )
      events.push(...requestEvents)
    } else {
      // Schedule approval required notifications
      const approvalEvents = this.scheduleApprovalNotifications(
        workflowId,
        documentId,
        studentId,
        guardian,
        documentName,
        documentCategory,
        deadlineDate
      )
      events.push(...approvalEvents)
    }

    // Add to pending notifications
    this.pendingNotifications.push(...events)

    return events
  }

  /**
   * Schedules notifications for document requests
   */
  private scheduleDocumentRequestNotifications(
    documentId: string,
    studentId: string,
    guardian: GuardianContact,
    documentName: string,
    documentCategory: string,
    deadlineDate: string
  ): NotificationEvent[] {
    const events: NotificationEvent[] = []
    const schedule = this.schedules.get('document_request')

    if (!schedule) return events

    const template = Array.from(this.templates.values())
      .find(t => t.eventType === 'document_request')

    if (!template) return events

    // Immediate notification
    if (schedule.triggers.immediate) {
      events.push(this.createNotificationEvent(
        'document_request',
        template,
        {
          documentId,
          studentId,
          guardianId: guardian.id
        },
        new Date().toISOString(),
        {
          studentName: 'Student Name', // Would be fetched from student data
          guardianName: guardian.name,
          documentName,
          documentCategory,
          deadlineDate,
          schoolName: 'ScholarX International School'
        }
      ))
    }

    // Deadline-based notifications
    if (schedule.triggers.daysBeforeDeadline) {
      const deadline = new Date(deadlineDate)

      schedule.triggers.daysBeforeDeadline.forEach(daysBefore => {
        const notificationDate = new Date(deadline)
        notificationDate.setDate(deadline.getDate() - daysBefore)

        if (notificationDate > new Date()) {
          events.push(this.createNotificationEvent(
            daysBefore === 0 ? 'final_notice' : 'deadline_reminder',
            template,
            {
              documentId,
              studentId,
              guardianId: guardian.id
            },
            notificationDate.toISOString(),
            {
              studentName: 'Student Name',
              guardianName: guardian.name,
              documentName,
              documentCategory,
              deadlineDate,
              daysRemaining: daysBefore,
              schoolName: 'ScholarX International School'
            }
          ))
        }
      })
    }

    return events
  }

  /**
   * Schedules notifications for approval workflows
   */
  private scheduleApprovalNotifications(
    workflowId: string,
    documentId: string,
    studentId: string,
    guardian: GuardianContact,
    documentName: string,
    documentCategory: string,
    deadlineDate: string
  ): NotificationEvent[] {
    const events: NotificationEvent[] = []
    const schedule = this.schedules.get('approval_required')

    if (!schedule) return events

    const template = Array.from(this.templates.values())
      .find(t => t.eventType === 'approval_required')

    if (!template) return events

    // Immediate notification
    if (schedule.triggers.immediate) {
      events.push(this.createNotificationEvent(
        'approval_required',
        template,
        {
          workflowId,
          documentId,
          studentId,
          guardianId: guardian.id
        },
        new Date().toISOString(),
        {
          studentName: 'Student Name',
          guardianName: guardian.name,
          documentName,
          documentCategory,
          approvalDeadline: deadlineDate,
          schoolName: 'ScholarX International School'
        }
      ))
    }

    return events
  }

  /**
   * Creates a notification event
   */
  private createNotificationEvent(
    eventType: NotificationEventType['type'],
    template: NotificationTemplate,
    ids: {
      documentId?: string
      workflowId?: string
      studentId: string
      guardianId: string
    },
    scheduledFor: string,
    templateData: NotificationContext
  ): NotificationEvent {
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      priority: template.priority,
      documentId: ids.documentId,
      workflowId: ids.workflowId,
      studentId: ids.studentId,
      guardianId: ids.guardianId,
      scheduledFor,
      status: 'scheduled',
      channels: template.channels,
      templateId: template.id,
      templateData,
      retryCount: 0,
      maxRetries: 3
    }
  }

  /**
   * Sends pending notifications that are due
   */
  async sendDueNotifications(): Promise<NotificationResult[]> {
    const now = new Date()
    const dueNotifications = this.pendingNotifications.filter(notification =>
      notification.status === 'scheduled' &&
      new Date(notification.scheduledFor) <= now
    )

    const results: NotificationResult[] = []

    for (const notification of dueNotifications) {
      const result = await this.sendNotification(notification)
      results.push(result)

      if (result.success) {
        notification.status = 'sent'
        notification.sentAt = now.toISOString()
      } else {
        notification.retryCount++
        if (notification.retryCount >= notification.maxRetries) {
          notification.status = 'failed'
        }
      }
    }

    return results
  }

  /**
   * Sends a single notification
   */
  private async sendNotification(notification: NotificationEvent): Promise<NotificationResult> {
    const results: NotificationResult[] = []

    for (const channel of notification.channels) {
      try {
        const result = await this.sendViaChannel(notification, channel)
        results.push(result)
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error)
        results.push({
          success: false,
          eventId: notification.id,
          channel,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Return the first successful result, or the last failure
    return results.find(r => r.success) || results[results.length - 1]
  }

  /**
   * Sends notification via specific channel
   */
  private async sendViaChannel(
    notification: NotificationEvent,
    channel: 'email' | 'sms' | 'in_app'
  ): Promise<NotificationResult> {
    const template = this.templates.get(notification.templateId)
    if (!template) {
      throw new Error(`Template ${notification.templateId} not found`)
    }

    // Render template with data
    const content = this.renderTemplate(template, notification.templateData)

    // In production, integrate with actual notification services
    // For now, simulate sending
    console.log(`Sending ${channel} notification:`, {
      to: notification.guardianId,
      subject: template.subject,
      content: content,
      priority: notification.priority
    })

    // Simulate delivery
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      success: true,
      eventId: notification.id,
      channel,
      deliveryId: `delivery_${Date.now()}`
    }
  }

  /**
   * Renders template with data
   */
  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): string {
    let content = template.body

    // Replace variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g')
      content = content.replace(regex, String(value || ''))
    })

    return content
  }

  /**
   * Notifies about approval status changes
   */
  async notifyApprovalStatusChange(
    workflowId: string,
    documentId: string,
    studentId: string,
    guardian: GuardianContact,
    status: 'approved' | 'rejected',
    approverName: string,
    reason?: string
  ): Promise<NotificationEvent[]> {
    const eventType = status === 'approved' ? 'document_approved' : 'document_rejected'
    const template = Array.from(this.templates.values())
      .find(t => t.eventType === eventType)

    if (!template) return []

    const event = this.createNotificationEvent(
      eventType,
      template,
      {
        workflowId,
        documentId,
        studentId,
        guardianId: guardian.id
      },
      new Date().toISOString(),
      {
        studentName: 'Student Name',
        guardianName: guardian.name,
        documentName: 'Document Name',
        documentCategory: 'Document Category',
        approverName,
        approvalDate: new Date().toISOString(),
        rejectionReason: reason,
        schoolName: 'ScholarX International School'
      }
    )

    this.pendingNotifications.push(event)

    // Send immediately for approval status changes
    await this.sendNotification(event)

    return [event]
  }

  /**
   * Gets notification statistics
   */
  getNotificationStatistics(): {
    totalScheduled: number
    totalSent: number
    totalFailed: number
    pendingNotifications: number
  } {
    const stats = {
      totalScheduled: this.pendingNotifications.length,
      totalSent: this.pendingNotifications.filter(n => n.status === 'sent').length,
      totalFailed: this.pendingNotifications.filter(n => n.status === 'failed').length,
      pendingNotifications: this.pendingNotifications.filter(n => n.status === 'scheduled').length
    }

    return stats
  }

  /**
   * Cancels notifications for a document
   */
  cancelNotifications(documentId: string): void {
    this.pendingNotifications = this.pendingNotifications.filter(
      notification => notification.documentId !== documentId
    )
  }

  /**
   * Gets pending notifications for a guardian
   */
  getPendingNotifications(guardianId: string): NotificationEvent[] {
    return this.pendingNotifications.filter(
      notification => notification.guardianId === guardianId &&
                      notification.status === 'scheduled'
    )
  }
}

// Export the notification engine
export { GuardianNotificationEngine }
export type { NotificationContext, GuardianContact }
