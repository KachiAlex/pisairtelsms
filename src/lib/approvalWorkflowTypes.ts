interface ApprovalRule {
  id: string
  name: string
  priority: number // Higher priority rules are checked first
  conditions: {
    documentCategory?: string[]
    documentType?: string[]
    studentClass?: string[]
    studentAge?: { min?: number; max?: number }
    requiresMedicalClearance?: boolean
    requiresGuardianConsent?: boolean
    isInternationalStudent?: boolean
    hasSpecialNeeds?: boolean
  }
  approvers: ApproverConfig[]
  requiredApprovals: number // Number of approvals needed from the approvers list
  autoApprove: boolean // If true, automatically approve if conditions met
  escalationDays: number // Days before escalating to higher authority
  notificationSettings: {
    immediate: boolean // Notify immediately when document is submitted
    reminderDays: number[] // Days before due date to send reminders
    escalationEnabled: boolean
  }
}

interface ApproverConfig {
  role: 'class_teacher' | 'subject_teacher' | 'head_teacher' | 'principal' | 'medical_officer' | 'counselor' | 'board_member' | 'super_admin'
  department?: string // For subject teachers
  backupApprovers?: string[] // User IDs of backup approvers
  canDelegate: boolean
  approvalWeight: number // Weight of this approver's approval (for weighted voting)
}

interface ApprovalWorkflow {
  id: string
  documentId: string
  studentId: string
  initiatedBy: string // User ID who initiated the workflow
  currentStep: number
  totalSteps: number
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated' | 'expired'
  steps: ApprovalStep[]
  appliedRule: ApprovalRule
  createdAt: string
  updatedAt: string
  dueDate?: string
  escalatedAt?: string
  completedAt?: string
}

interface ApprovalStep {
  id: string
  stepNumber: number
  name: string
  description: string
  assignedTo: string[] // User IDs
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped' | 'escalated'
  requiredApprovals: number
  currentApprovals: number
  approvals: ApprovalRecord[]
  assignedAt: string
  dueDate: string
  reminderSent: boolean
  escalated: boolean
  notes?: string
}

interface ApprovalRecord {
  id: string
  approverId: string
  approverName: string
  decision: 'approved' | 'rejected' | 'delegated'
  delegatedTo?: string
  comments?: string
  approvedAt: string
  ipAddress?: string
  deviceInfo?: string
}

interface NotificationTemplate {
  type: 'approval_request' | 'reminder' | 'escalation' | 'approval' | 'rejection'
  subject: string
  body: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  channels: ('email' | 'sms' | 'in_app')[]
}

// Default approval rules for different document types
const defaultApprovalRules: ApprovalRule[] = [
  {
    id: 'medical_clearance',
    name: 'Medical Clearance Approval',
    priority: 100,
    conditions: {
      documentCategory: ['Medical Clearance', 'Health Certificate'],
      requiresMedicalClearance: true
    },
    approvers: [
      { role: 'medical_officer', canDelegate: true, approvalWeight: 2 },
      { role: 'class_teacher', canDelegate: true, approvalWeight: 1 },
      { role: 'head_teacher', canDelegate: false, approvalWeight: 1 }
    ],
    requiredApprovals: 2,
    autoApprove: false,
    escalationDays: 3,
    notificationSettings: {
      immediate: true,
      reminderDays: [2, 1],
      escalationEnabled: true
    }
  },
  {
    id: 'behavior_contract',
    name: 'Behavior Contract Approval',
    priority: 95,
    conditions: {
      documentCategory: ['Behavior Contract', 'Disciplinary Record']
    },
    approvers: [
      { role: 'counselor', canDelegate: true, approvalWeight: 1 },
      { role: 'head_teacher', canDelegate: false, approvalWeight: 2 },
      { role: 'principal', canDelegate: false, approvalWeight: 3 }
    ],
    requiredApprovals: 3,
    autoApprove: false,
    escalationDays: 2,
    notificationSettings: {
      immediate: true,
      reminderDays: [1],
      escalationEnabled: true
    }
  },
  {
    id: 'boarding_consent',
    name: 'Boarding Consent Approval',
    priority: 90,
    conditions: {
      documentCategory: ['Boarding Consent', 'Parent Authorization']
    },
    approvers: [
      { role: 'head_teacher', canDelegate: false, approvalWeight: 2 },
      { role: 'principal', canDelegate: false, approvalWeight: 3 }
    ],
    requiredApprovals: 2,
    autoApprove: false,
    escalationDays: 5,
    notificationSettings: {
      immediate: true,
      reminderDays: [3, 1],
      escalationEnabled: true
    }
  },
  {
    id: 'academic_records',
    name: 'Academic Records Approval',
    priority: 80,
    conditions: {
      documentCategory: ['Academic Transcript', 'Report Card', 'Certificate']
    },
    approvers: [
      { role: 'class_teacher', canDelegate: true, approvalWeight: 1 },
      { role: 'subject_teacher', department: 'class_teacher_dept', canDelegate: true, approvalWeight: 1 },
      { role: 'head_teacher', canDelegate: false, approvalWeight: 2 }
    ],
    requiredApprovals: 2,
    autoApprove: false,
    escalationDays: 7,
    notificationSettings: {
      immediate: false,
      reminderDays: [5, 2],
      escalationEnabled: true
    }
  },
  {
    id: 'financial_documents',
    name: 'Financial Documents Approval',
    priority: 85,
    conditions: {
      documentCategory: ['Fee Payment Receipt', 'Scholarship Award', 'Financial Statement']
    },
    approvers: [
      { role: 'class_teacher', canDelegate: true, approvalWeight: 1 },
      { role: 'super_admin', canDelegate: false, approvalWeight: 3 }
    ],
    requiredApprovals: 2,
    autoApprove: false,
    escalationDays: 3,
    notificationSettings: {
      immediate: true,
      reminderDays: [2, 1],
      escalationEnabled: true
    }
  },
  {
    id: 'auto_approve_minor',
    name: 'Auto-approve Minor Documents',
    priority: 50,
    conditions: {
      documentCategory: ['Admission Form', 'Transport Consent', 'Emergency Contact']
    },
    approvers: [
      { role: 'class_teacher', canDelegate: true, approvalWeight: 1 }
    ],
    requiredApprovals: 1,
    autoApprove: true,
    escalationDays: 14,
    notificationSettings: {
      immediate: false,
      reminderDays: [7, 3],
      escalationEnabled: false
    }
  }
]

// Notification templates
const notificationTemplates: Record<string, NotificationTemplate> = {
  approval_request: {
    type: 'approval_request',
    subject: 'Document Approval Required: {document_name}',
    body: 'Dear {approver_name},\n\nA new document "{document_name}" for student {student_name} requires your approval.\n\nDocument Type: {document_category}\nDue Date: {due_date}\n\nPlease review and approve/reject the document in the system.\n\nBest regards,\nSchool Administration',
    priority: 'high',
    channels: ['email', 'in_app']
  },
  reminder: {
    type: 'reminder',
    subject: 'Reminder: Document Approval Pending - {document_name}',
    body: 'Dear {approver_name},\n\nThis is a reminder that the document "{document_name}" for student {student_name} is still pending your approval.\n\nDue Date: {due_date}\nDays remaining: {days_remaining}\n\nPlease review the document as soon as possible.\n\nBest regards,\nSchool Administration',
    priority: 'medium',
    channels: ['email', 'in_app']
  },
  escalation: {
    type: 'escalation',
    subject: 'URGENT: Document Approval Escalated - {document_name}',
    body: 'Dear {approver_name},\n\nThe document "{document_name}" for student {student_name} has been escalated due to pending approval.\n\nOriginal Due Date: {due_date}\nEscalated to: {escalated_to}\n\nImmediate action is required.\n\nBest regards,\nSchool Administration',
    priority: 'urgent',
    channels: ['email', 'sms', 'in_app']
  }
}

export type {
  ApprovalRule,
  ApproverConfig,
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalRecord,
  NotificationTemplate
}

export { defaultApprovalRules, notificationTemplates }
