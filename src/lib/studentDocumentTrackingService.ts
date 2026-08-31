import {
  StudentProfile,
  DocumentTrackingRecord,
  DocumentRequirement,
  StudentDocumentSummary,
  DocumentTrackingEvent,
  defaultDocumentRequirements,
  type StudentProfile as StudentProfileType
} from './studentDocumentTrackingTypes'

class StudentDocumentTrackingService {
  private requirements: DocumentRequirement[] = defaultDocumentRequirements
  private trackingRecords: Map<string, DocumentTrackingRecord[]> = new Map()
  private trackingEvents: DocumentTrackingEvent[] = []

  constructor(customRequirements?: DocumentRequirement[]) {
    if (customRequirements) {
      this.requirements = [...defaultDocumentRequirements, ...customRequirements]
    }
  }

  /**
   * Initializes document tracking for a new student
   */
  async initializeStudentTracking(
    student: StudentProfile,
    existingDocuments: DocumentTrackingRecord[] = []
  ): Promise<DocumentTrackingRecord[]> {
    const studentRequirements = this.getRequirementsForStudent(student)

    // Create tracking records for required documents
    const trackingRecords: DocumentTrackingRecord[] = []

    for (const requirement of studentRequirements) {
      const existingRecord = existingDocuments.find(
        doc => doc.documentCategory === requirement.category &&
               doc.documentName.toLowerCase().includes(requirement.name.toLowerCase())
      )

      if (existingRecord) {
        trackingRecords.push(existingRecord)
      } else {
        const newRecord: DocumentTrackingRecord = {
          id: `tracking_${student.id}_${requirement.id}_${Date.now()}`,
          studentId: student.id,
          documentId: '', // Will be filled when document is submitted
          documentName: requirement.name,
          documentCategory: requirement.category,
          status: 'required',
          version: 1,
          lastUpdated: new Date().toISOString(),
          tags: [requirement.priority, requirement.frequency],
          complianceStatus: 'non_compliant'
        }
        trackingRecords.push(newRecord)
      }
    }

    // Store tracking records
    this.trackingRecords.set(student.id, trackingRecords)

    return trackingRecords
  }

  /**
   * Updates tracking when a document is submitted
   */
  async updateDocumentTracking(
    studentId: string,
    documentId: string,
    documentName: string,
    documentCategory: string,
    submittedBy: string
  ): Promise<DocumentTrackingRecord | null> {
    const studentRecords = this.trackingRecords.get(studentId) || []

    // Find matching tracking record
    const trackingRecord = studentRecords.find(record =>
      this.isMatchingDocument(record, documentName, documentCategory)
    )

    if (!trackingRecord) {
      // Create new tracking record for unexpected document
      const newRecord: DocumentTrackingRecord = {
        id: `tracking_${studentId}_extra_${Date.now()}`,
        studentId,
        documentId,
        documentName,
        documentCategory,
        status: 'submitted',
        submissionDate: new Date().toISOString(),
        version: 1,
        lastUpdated: new Date().toISOString(),
        tags: ['extra'],
        complianceStatus: 'compliant'
      }

      studentRecords.push(newRecord)
      this.trackingRecords.set(studentId, studentRecords)

      // Log event
      this.logTrackingEvent({
        id: `event_${Date.now()}`,
        studentId,
        documentId,
        eventType: 'submitted',
        eventDate: new Date().toISOString(),
        performedBy: submittedBy,
        details: { documentName, documentCategory },
        metadata: { newStatus: 'submitted' }
      })

      return newRecord
    }

    // Update existing record
    const oldStatus = trackingRecord.status
    trackingRecord.documentId = documentId
    trackingRecord.status = 'submitted'
    trackingRecord.submissionDate = new Date().toISOString()
    trackingRecord.lastUpdated = new Date().toISOString()
    trackingRecord.complianceStatus = 'pending'

    // Update expiry date if applicable
    const requirement = this.requirements.find(req =>
      req.category === documentCategory && req.name === documentName
    )
    if (requirement?.validityPeriodMonths) {
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + requirement.validityPeriodMonths)
      trackingRecord.expiryDate = expiryDate.toISOString()
    }

    this.trackingRecords.set(studentId, studentRecords)

    // Log event
    this.logTrackingEvent({
      id: `event_${Date.now()}`,
      studentId,
      documentId,
      eventType: 'submitted',
      eventDate: new Date().toISOString(),
      performedBy: submittedBy,
      details: { documentName, documentCategory },
      metadata: { previousStatus: oldStatus, newStatus: 'submitted' }
    })

    return trackingRecord
  }

  /**
   * Updates document status after approval/rejection
   */
  async updateDocumentStatus(
    studentId: string,
    documentId: string,
    status: 'approved' | 'rejected',
    approverId: string,
    comments?: string,
    rejectionReason?: string
  ): Promise<DocumentTrackingRecord | null> {
    const studentRecords = this.trackingRecords.get(studentId) || []
    const trackingRecord = studentRecords.find(record => record.documentId === documentId)

    if (!trackingRecord) return null

    const oldStatus = trackingRecord.status

    if (status === 'approved') {
      trackingRecord.status = 'approved'
      trackingRecord.approvalDate = new Date().toISOString()
      trackingRecord.complianceStatus = 'compliant'
    } else {
      trackingRecord.status = 'rejected'
      trackingRecord.rejectionReason = rejectionReason
      trackingRecord.complianceStatus = 'non_compliant'
      if (comments) trackingRecord.notes = comments
    }

    trackingRecord.lastUpdated = new Date().toISOString()

    this.trackingRecords.set(studentId, studentRecords)

    // Log event
    this.logTrackingEvent({
      id: `event_${Date.now()}`,
      studentId,
      documentId,
      eventType: status,
      eventDate: new Date().toISOString(),
      performedBy: approverId,
      details: { rejectionReason, comments },
      metadata: { previousStatus: oldStatus, newStatus: status }
    })

    return trackingRecord
  }

  /**
   * Gets document summary for a student
   */
  getStudentDocumentSummary(studentId: string): StudentDocumentSummary {
    const records = this.trackingRecords.get(studentId) || []
    const now = new Date()

    const summary: StudentDocumentSummary = {
      studentId,
      totalRequired: records.length,
      totalSubmitted: records.filter(r => ['submitted', 'under_review', 'approved'].includes(r.status)).length,
      totalApproved: records.filter(r => r.status === 'approved').length,
      totalRejected: records.filter(r => r.status === 'rejected').length,
      totalExpired: records.filter(r => r.expiryDate && new Date(r.expiryDate) < now).length,
      totalOverdue: records.filter(r => this.isOverdue(r)).length,
      compliancePercentage: 0,
      lastUpdated: new Date().toISOString(),
      criticalMissing: [],
      upcomingExpiries: []
    }

    // Calculate compliance percentage
    const compliantRecords = records.filter(r =>
      r.status === 'approved' && (!r.expiryDate || new Date(r.expiryDate) > now)
    ).length
    summary.compliancePercentage = summary.totalRequired > 0
      ? Math.round((compliantRecords / summary.totalRequired) * 100)
      : 100

    // Find critical missing documents
    summary.criticalMissing = records
      .filter(r => r.status === 'required' && r.tags.includes('critical'))
      .map(r => r.documentName)

    // Find upcoming expiries (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    summary.upcomingExpiries = records
      .filter(r => r.expiryDate && r.status === 'approved')
      .map(r => ({
        documentName: r.documentName,
        expiryDate: r.expiryDate!,
        daysUntilExpiry: Math.ceil((new Date(r.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }))
      .filter(exp => exp.daysUntilExpiry <= 30 && exp.daysUntilExpiry > 0)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

    return summary
  }

  /**
   * Gets all tracking records for a student
   */
  getStudentTrackingRecords(studentId: string): DocumentTrackingRecord[] {
    return this.trackingRecords.get(studentId) || []
  }

  /**
   * Gets tracking events for a student
   */
  getStudentTrackingEvents(studentId: string, limit = 50): DocumentTrackingEvent[] {
    return this.trackingEvents
      .filter(event => event.studentId === studentId)
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, limit)
  }

  /**
   * Checks if a document is overdue
   */
  private isOverdue(record: DocumentTrackingRecord): boolean {
    if (!record.expiryDate) return false
    const expiryDate = new Date(record.expiryDate)
    const now = new Date()
    return expiryDate < now && record.status === 'approved'
  }

  /**
   * Gets applicable requirements for a student
   */
  private getRequirementsForStudent(student: StudentProfile): DocumentRequirement[] {
    return this.requirements.filter(requirement => {
      const requiredFor = requirement.requiredFor

      // Check class requirements
      if (requiredFor.classes && !requiredFor.classes.includes(student.class)) {
        return false
      }

      // Check medical conditions
      if (requiredFor.hasMedicalConditions !== undefined) {
        const hasConditions = student.medicalInfo?.hasConditions || false
        if (requiredFor.hasMedicalConditions !== hasConditions) {
          return false
        }
      }

      // Check special needs
      if (requiredFor.hasSpecialNeeds !== undefined) {
        const hasNeeds = student.specialNeeds?.hasNeeds || false
        if (requiredFor.hasSpecialNeeds !== hasNeeds) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Checks if a submitted document matches a tracking record
   */
  private isMatchingDocument(
    record: DocumentTrackingRecord,
    documentName: string,
    documentCategory: string
  ): boolean {
    // Check category match
    if (record.documentCategory !== documentCategory) {
      return false
    }

    // Check name similarity (simple string matching)
    const recordName = record.documentName.toLowerCase()
    const docName = documentName.toLowerCase()

    // Exact match or contains key terms
    if (recordName === docName) return true

    // Check if document name contains key terms from requirement
    const keyTerms = recordName.split(' ').filter(word => word.length > 2)
    const docWords = docName.split(' ').filter(word => word.length > 2)

    const matchingTerms = keyTerms.filter(term =>
      docWords.some(docWord => docWord.includes(term) || term.includes(docWord))
    )

    return matchingTerms.length >= Math.min(keyTerms.length, 2)
  }

  /**
   * Logs a tracking event
   */
  private logTrackingEvent(event: DocumentTrackingEvent): void {
    this.trackingEvents.push(event)

    // Keep only last 1000 events to prevent memory issues
    if (this.trackingEvents.length > 1000) {
      this.trackingEvents = this.trackingEvents.slice(-1000)
    }
  }

  /**
   * Gets compliance report for multiple students
   */
  getComplianceReport(studentIds: string[]): {
    overallCompliance: number
    studentSummaries: StudentDocumentSummary[]
    criticalIssues: {
      studentId: string
      studentName: string
      missingCritical: string[]
      overdueDocuments: string[]
    }[]
  } {
    const summaries = studentIds.map(id => this.getStudentDocumentSummary(id))

    const overallCompliance = summaries.length > 0
      ? Math.round(summaries.reduce((sum, s) => sum + s.compliancePercentage, 0) / summaries.length)
      : 100

    const criticalIssues = summaries
      .filter(s => s.criticalMissing.length > 0 || s.totalOverdue > 0)
      .map(s => ({
        studentId: s.studentId,
        studentName: `Student ${s.studentId}`, // Would fetch from student database
        missingCritical: s.criticalMissing,
        overdueDocuments: this.trackingRecords.get(s.studentId)
          ?.filter(r => this.isOverdue(r))
          .map(r => r.documentName) || []
      }))

    return {
      overallCompliance,
      studentSummaries: summaries,
      criticalIssues
    }
  }

  /**
   * Exports student document data for reporting
   */
  exportStudentData(studentId: string): {
    profile: StudentProfile | null
    trackingRecords: DocumentTrackingRecord[]
    events: DocumentTrackingEvent[]
    summary: StudentDocumentSummary
  } {
    // In production, profile would be fetched from database
    const profile = null // Would be: await getStudentProfile(studentId)

    return {
      profile,
      trackingRecords: this.getStudentTrackingRecords(studentId),
      events: this.getStudentTrackingEvents(studentId),
      summary: this.getStudentDocumentSummary(studentId)
    }
  }
}

// Export the service
export { StudentDocumentTrackingService }
