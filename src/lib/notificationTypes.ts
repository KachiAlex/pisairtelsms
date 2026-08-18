interface GuardianContact {
  id: string
  studentId: string
  name: string
  email: string
  phone: string
  relationship?: string
  preferredLanguage: 'en' | 'fr' | 'yo' | 'ha'
  notificationPreferences: {
    email: boolean
    sms: boolean
    inApp: boolean
  }
  timezone: string
  lastContacted?: string
}

interface NotificationEvent {
  id: string
  type: 'document_request' | 'approval_required' | 'document_approved' | 'document_rejected' | 'deadline_reminder' | 'escalation_warning' | 'final_notice' | 'payment_pending' | 'payment_confirmed' | 'payment_rejected'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  documentId?: string
  workflowId?: string
  studentId: string
  guardianId?: string
  adminId?: string
  scheduledFor: string
  sentAt?: string
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  channels: ('email' | 'sms' | 'in_app')[]
  templateId: string
  templateData: Record<string, any>
  retryCount: number
  maxRetries: number
}

interface NotificationTemplate {
  id: string
  name: string
  eventType: NotificationEvent['type']
  channels: ('email' | 'sms' | 'in_app')[]
  subject?: string // For email
  body: string
  variables: string[] // Template variables like {student_name}, {document_name}, etc.
  priority: NotificationEvent['priority']
  cooldownHours: number // Minimum hours between similar notifications
}

interface NotificationSchedule {
  eventType: NotificationEvent['type']
  triggers: {
    immediate?: boolean
    daysBeforeDeadline?: number[]
    daysAfterEvent?: number[]
    specificTimes?: string[] // ISO time strings
  }
  reminderSequence?: {
    intervalDays: number
    maxReminders: number
    escalationAfter: number // reminders
  }
}

// Default notification templates
const defaultNotificationTemplates: NotificationTemplate[] = [
  {
    id: 'document_request',
    name: 'Document Request',
    eventType: 'document_request',
    channels: ['email', 'sms', 'in_app'],
    subject: 'Document Required for {student_name}',
    body: 'Dear {guardian_name},\n\nWe require the following document for {student_name}: {document_name}\n\nDocument Type: {document_category}\nDeadline: {deadline_date}\n\nPlease submit the document through the school portal.\n\nBest regards,\n{school_name} Administration',
    variables: ['guardian_name', 'student_name', 'document_name', 'document_category', 'deadline_date', 'school_name'],
    priority: 'medium',
    cooldownHours: 24
  },
  {
    id: 'approval_required',
    name: 'Approval Required',
    eventType: 'approval_required',
    channels: ['email', 'in_app'],
    subject: 'Approval Required for {student_name}\'s {document_name}',
    body: 'Dear {guardian_name},\n\n{student_name}\'s {document_name} has been submitted and requires your approval.\n\nDocument Type: {document_category}\nApproval Deadline: {approval_deadline}\n\nPlease review and approve the document in the parent portal.\n\nBest regards,\n{school_name} Administration',
    variables: ['guardian_name', 'student_name', 'document_name', 'document_category', 'approval_deadline', 'school_name'],
    priority: 'high',
    cooldownHours: 12
  },
  {
    id: 'deadline_reminder',
    name: 'Deadline Reminder',
    eventType: 'deadline_reminder',
    channels: ['email', 'sms', 'in_app'],
    subject: 'Reminder: Document Deadline Approaching for {student_name}',
    body: 'Dear {guardian_name},\n\nThis is a reminder that {student_name}\'s {document_name} is due in {days_remaining} day(s).\n\nDocument Type: {document_category}\nDeadline: {deadline_date}\n\nPlease ensure the document is submitted on time.\n\nBest regards,\n{school_name} Administration',
    variables: ['guardian_name', 'student_name', 'document_name', 'document_category', 'deadline_date', 'days_remaining', 'school_name'],
    priority: 'high',
    cooldownHours: 24
  },
  {
    id: 'escalation_warning',
    name: 'Escalation Warning',
    eventType: 'escalation_warning',
    channels: ['email', 'sms', 'in_app'],
    subject: 'URGENT: Document Overdue for {student_name}',
    body: 'Dear {guardian_name},\n\n{student_name}\'s {document_name} is now overdue.\n\nDocument Type: {document_category}\nOriginal Deadline: {deadline_date}\nDays Overdue: {days_overdue}\n\nImmediate action is required. Please submit the document as soon as possible.\n\nBest regards,\n{school_name} Administration',
    variables: ['guardian_name', 'student_name', 'document_name', 'document_category', 'deadline_date', 'days_overdue', 'school_name'],
    priority: 'urgent',
    cooldownHours: 12
  },
  {
    id: 'final_notice',
    name: 'Final Notice',
    eventType: 'final_notice',
    channels: ['email', 'sms', 'in_app'],
    subject: 'FINAL NOTICE: Document Required for {student_name}',
    body: 'Dear {guardian_name},\n\nThis is the FINAL NOTICE regarding {student_name}\'s outstanding document requirement.\n\nDocument: {document_name}\nType: {document_category}\nStatus: Overdue by {days_overdue} days\n\nFailure to submit may result in {consequences}.\n\nPlease contact the school immediately if you need assistance.\n\nBest regards,\n{school_name} Administration',
    variables: ['guardian_name', 'student_name', 'document_name', 'document_category', 'days_overdue', 'consequences', 'school_name'],
    priority: 'urgent',
    cooldownHours: 6
  },
  {
    id: 'document_approved',
    name: 'Document Approved',
    eventType: 'document_approved',
    channels: ['email', 'in_app'],
    subject: 'Document Approved for {student_name}',
    body: 'Dear {guardian_name},\n\nGreat news! {student_name}\'s {document_name} has been approved.\n\nDocument Type: {document_category}\nApproved by: {approver_name}\nApproval Date: {approval_date}\n\nThe document is now part of {student_name}\'s official records.\n\nBest regards,\n{school_name} Administration',
    variables: ['guardian_name', 'student_name', 'document_name', 'document_category', 'approver_name', 'approval_date', 'school_name'],
    priority: 'low',
    cooldownHours: 0
  },
  {
    id: 'document_rejected',
    name: 'Document Rejected',
    eventType: 'document_rejected',
    channels: ['email', 'in_app'],
    subject: 'Document Requires Revision for {student_name}',
    body: 'Dear {guardian_name},\n\n{student_name}\'s {document_name} requires revision.\n\nDocument Type: {document_category}\nReason: {rejection_reason}\nRejected by: {approver_name}\n\nPlease review the feedback and resubmit the corrected document.\n\nBest regards,\n{school_name} Administration',
    variables: ['guardian_name', 'student_name', 'document_name', 'document_category', 'rejection_reason', 'approver_name', 'school_name'],
    priority: 'high',
    cooldownHours: 12
  },
  {
    id: 'payment_pending',
    name: 'Manual Payment Pending Review',
    eventType: 'payment_pending',
    channels: ['email', 'in_app'],
    subject: 'Manual Payment Requires Review - {student_name}',
    body: 'A manual payment has been submitted for review.\n\nStudent: {student_name}\nAmount: {amount}\nPayment Method: {payment_method}\nReference: {reference_number}\nNotes: {notes}\n\nPlease review the payment proof in the finance portal and confirm or reject.\n\nBest regards,\n{school_name} Finance',
    variables: ['student_name', 'amount', 'payment_method', 'reference_number', 'notes', 'school_name'],
    priority: 'medium',
    cooldownHours: 0
  },
  {
    id: 'payment_confirmed',
    name: 'Payment Confirmed',
    eventType: 'payment_confirmed',
    channels: ['email', 'in_app'],
    subject: 'Payment Confirmed - {student_name}',
    body: 'The manual payment has been confirmed.\n\nStudent: {student_name}\nAmount: {amount}\nReceipt: {receipt_number}\nConfirmed by: {admin_name}\n\nBest regards,\n{school_name} Finance',
    variables: ['student_name', 'amount', 'receipt_number', 'admin_name', 'school_name'],
    priority: 'low',
    cooldownHours: 0
  },
  {
    id: 'payment_rejected',
    name: 'Payment Rejected',
    eventType: 'payment_rejected',
    channels: ['email', 'in_app'],
    subject: 'Payment Rejected - {student_name}',
    body: 'The manual payment has been rejected.\n\nStudent: {student_name}\nAmount: {amount}\nReference: {reference_number}\nReason: {rejection_reason}\nRejected by: {admin_name}\n\nPlease contact the finance office for assistance.\n\nBest regards,\n{school_name} Finance',
    variables: ['student_name', 'amount', 'reference_number', 'rejection_reason', 'admin_name', 'school_name'],
    priority: 'high',
    cooldownHours: 0
  }
]

// Default notification schedules
const defaultNotificationSchedules: Record<string, NotificationSchedule> = {
  document_request: {
    eventType: 'document_request',
    triggers: {
      immediate: true,
      daysBeforeDeadline: [7, 3, 1]
    },
    reminderSequence: {
      intervalDays: 2,
      maxReminders: 5,
      escalationAfter: 3
    }
  },
  approval_required: {
    eventType: 'approval_required',
    triggers: {
      immediate: true,
      daysBeforeDeadline: [2, 1]
    }
  },
  deadline_reminder: {
    eventType: 'deadline_reminder',
    triggers: {
      daysBeforeDeadline: [7, 3, 2, 1, 0]
    }
  }
}

export type {
  GuardianContact,
  NotificationEvent,
  NotificationTemplate,
  NotificationSchedule
}

export { defaultNotificationTemplates, defaultNotificationSchedules }
