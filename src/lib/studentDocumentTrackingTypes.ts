interface StudentProfile {
  id: string
  name: string
  class: string
  admissionNumber: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  guardianName: string
  guardianEmail: string
  guardianPhone: string
  enrollmentStatus: 'active' | 'inactive' | 'graduated' | 'transferred'
  enrollmentDate: string
  medicalInfo?: {
    hasConditions: boolean
    bloodGroup?: string
    genotype?: string
    allergies?: string[]
    medications?: string[]
  }
  specialNeeds?: {
    hasNeeds: boolean
    category?: string
    accommodations?: string[]
  }
}

interface DocumentTrackingRecord {
  id: string
  studentId: string
  documentId: string
  documentName: string
  documentCategory: string
  status: 'required' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'needs_update'
  submissionDate?: string
  approvalDate?: string
  expiryDate?: string
  rejectionReason?: string
  version: number
  workflowId?: string
  assignedTo?: string[] // User IDs currently handling this document
  lastUpdated: string
  notes?: string
  tags: string[]
  complianceStatus: 'compliant' | 'non_compliant' | 'pending' | 'overdue'
}

interface DocumentRequirement {
  id: string
  category: string
  name: string
  description: string
  requiredFor: {
    classes?: string[]
    enrollmentTypes?: string[]
    hasMedicalConditions?: boolean
    hasSpecialNeeds?: boolean
    isInternational?: boolean
  }
  frequency: 'one_time' | 'annual' | 'semesterly' | 'monthly'
  validityPeriodMonths?: number
  isMandatory: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  autoExpire: boolean
  notificationSettings: {
    reminderDays: number[]
    escalationDays: number
  }
}

interface StudentDocumentSummary {
  studentId: string
  totalRequired: number
  totalSubmitted: number
  totalApproved: number
  totalRejected: number
  totalExpired: number
  totalOverdue: number
  compliancePercentage: number
  lastUpdated: string
  criticalMissing: string[] // Names of critical missing documents
  upcomingExpiries: {
    documentName: string
    expiryDate: string
    daysUntilExpiry: number
  }[]
}

interface DocumentTrackingEvent {
  id: string
  studentId: string
  documentId: string
  eventType: 'submitted' | 'approved' | 'rejected' | 'expired' | 'updated' | 'reminder_sent' | 'escalation_sent'
  eventDate: string
  performedBy: string
  details: Record<string, any>
  metadata?: {
    ipAddress?: string
    userAgent?: string
    previousStatus?: string
    newStatus?: string
  }
}

// Default document requirements for different student types
const defaultDocumentRequirements: DocumentRequirement[] = [
  {
    id: 'birth_certificate',
    category: 'Administrative',
    name: 'Birth Certificate',
    description: 'Official birth certificate for age verification',
    requiredFor: {},
    frequency: 'one_time',
    validityPeriodMonths: 120, // 10 years
    isMandatory: true,
    priority: 'critical',
    autoExpire: false,
    notificationSettings: {
      reminderDays: [30, 7, 1],
      escalationDays: 7
    }
  },
  {
    id: 'medical_clearance',
    category: 'Medical',
    name: 'Medical Clearance Certificate',
    description: 'Medical fitness certificate from registered physician',
    requiredFor: {},
    frequency: 'annual',
    validityPeriodMonths: 12,
    isMandatory: true,
    priority: 'high',
    autoExpire: true,
    notificationSettings: {
      reminderDays: [60, 30, 14, 7],
      escalationDays: 14
    }
  },
  {
    id: 'boarding_consent',
    category: 'Administrative',
    name: 'Boarding House Consent Form',
    description: 'Parent/guardian consent for boarding accommodation',
    requiredFor: {},
    frequency: 'annual',
    validityPeriodMonths: 12,
    isMandatory: false, // Only for boarding students
    priority: 'medium',
    autoExpire: true,
    notificationSettings: {
      reminderDays: [30, 14, 7],
      escalationDays: 7
    }
  },
  {
    id: 'transport_consent',
    category: 'Administrative',
    name: 'School Transport Consent',
    description: 'Parent/guardian consent for school transportation',
    requiredFor: {},
    frequency: 'annual',
    validityPeriodMonths: 12,
    isMandatory: false,
    priority: 'medium',
    autoExpire: true,
    notificationSettings: {
      reminderDays: [30, 14, 7],
      escalationDays: 7
    }
  },
  {
    id: 'report_card',
    category: 'Academic',
    name: 'Previous Term Report Card',
    description: 'Academic report from previous school/term',
    requiredFor: {},
    frequency: 'semesterly',
    validityPeriodMonths: 6,
    isMandatory: true,
    priority: 'high',
    autoExpire: false,
    notificationSettings: {
      reminderDays: [14, 7, 3],
      escalationDays: 7
    }
  },
  {
    id: 'behavior_contract',
    category: 'Conduct',
    name: 'Student Behavior Contract',
    description: 'Agreement on school behavior and conduct rules',
    requiredFor: {},
    frequency: 'annual',
    validityPeriodMonths: 12,
    isMandatory: true,
    priority: 'high',
    autoExpire: true,
    notificationSettings: {
      reminderDays: [30, 14, 7],
      escalationDays: 7
    }
  },
  {
    id: 'immunization_record',
    category: 'Medical',
    name: 'Immunization Record',
    description: 'Complete vaccination and immunization records',
    requiredFor: {},
    frequency: 'annual',
    validityPeriodMonths: 12,
    isMandatory: true,
    priority: 'critical',
    autoExpire: true,
    notificationSettings: {
      reminderDays: [60, 30, 14, 7],
      escalationDays: 14
    }
  },
  {
    id: 'sickle_cell_test',
    category: 'Medical',
    name: 'Sickle Cell Status Test',
    description: 'Laboratory confirmation of sickle cell status',
    requiredFor: {},
    frequency: 'one_time',
    validityPeriodMonths: 120, // 10 years
    isMandatory: true,
    priority: 'critical',
    autoExpire: false,
    notificationSettings: {
      reminderDays: [30, 7, 1],
      escalationDays: 7
    }
  }
]

export type {
  StudentProfile,
  DocumentTrackingRecord,
  DocumentRequirement,
  StudentDocumentSummary,
  DocumentTrackingEvent
}

export { defaultDocumentRequirements }
