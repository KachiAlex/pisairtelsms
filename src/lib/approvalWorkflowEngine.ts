import {
  ApprovalRule,
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalRecord,
  ApproverConfig,
  defaultApprovalRules,
  notificationTemplates,
  type NotificationTemplate
} from './approvalWorkflowTypes'
import { GuardianNotificationEngine, type GuardianContact } from './guardianNotificationEngine'
import { StudentDocumentTrackingService } from './studentDocumentTrackingService'

interface StudentInfo {
  id: string
  name: string
  class: string
  age: number
  hasMedicalConditions: boolean
  isInternational: boolean
  hasSpecialNeeds: boolean
  guardianEmail?: string
  guardianPhone?: string
}

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
  department?: string
  canApprove: boolean
  approvalLevel: number
}

interface DocumentInfo {
  id: string
  name: string
  category: string
  type: string
  requiresMedicalClearance: boolean
  requiresGuardianConsent: boolean
  studentId: string
  uploadedBy: string
  uploadedAt: string
}

class ApprovalWorkflowEngine {
  private rules: ApprovalRule[] = defaultApprovalRules
  private notificationEngine: GuardianNotificationEngine
  private trackingService: StudentDocumentTrackingService

  constructor(customRules?: ApprovalRule[]) {
    if (customRules) {
      this.rules = [...defaultApprovalRules, ...customRules]
      this.rules.sort((a, b) => b.priority - a.priority) // Higher priority first
    }

    this.notificationEngine = new GuardianNotificationEngine()
    this.trackingService = new StudentDocumentTrackingService()
  }

  /**
   * Initiates a new approval workflow for a document
   */
  async initiateWorkflow(
    document: DocumentInfo,
    student: StudentInfo,
    initiator: UserInfo,
    guardian?: GuardianContact
  ): Promise<ApprovalWorkflow> {
    // Find the matching approval rule
    const applicableRule = this.findApplicableRule(document, student)

    if (!applicableRule) {
      throw new Error('No approval rule found for this document type')
    }

    // Check if auto-approval is possible
    if (applicableRule.autoApprove) {
      return this.createAutoApprovedWorkflow(document, student, initiator, applicableRule)
    }

    // Create the workflow with approval steps
    const workflow = await this.createWorkflowWithSteps(document, student, initiator, applicableRule)

    // Send initial notifications
    await this.sendInitialNotifications(workflow)

    // Schedule guardian notifications if guardian contact provided
    if (guardian && document.requiresGuardianConsent) {
      await this.scheduleGuardianNotifications(workflow, document, student, guardian)
    }

    return workflow
  }

  /**
   * Send initial notifications for a workflow
   */
  private async sendInitialNotifications(workflow: ApprovalWorkflow): Promise<void> {
    // TODO: implement notification sending
  }

  /**
   * Finds the most appropriate approval rule for a document
   */
  private findApplicableRule(document: DocumentInfo, student: StudentInfo): ApprovalRule | null {
    for (const rule of this.rules) {
      if (this.ruleMatchesDocument(rule, document, student)) {
        return rule
      }
    }
    return null
  }

  /**
   * Checks if a rule matches the document and student conditions
   */
  private ruleMatchesDocument(rule: ApprovalRule, document: DocumentInfo, student: StudentInfo): boolean {
    const conditions = rule.conditions

    // Check document category
    if (conditions.documentCategory && !conditions.documentCategory.includes(document.category)) {
      return false
    }

    // Check document type
    if (conditions.documentType && !conditions.documentType.includes(document.type)) {
      return false
    }

    // Check student class
    if (conditions.studentClass && !conditions.studentClass.includes(student.class)) {
      return false
    }

    // Check student age
    if (conditions.studentAge) {
      if (conditions.studentAge.min && student.age < conditions.studentAge.min) {
        return false
      }
      if (conditions.studentAge.max && student.age > conditions.studentAge.max) {
        return false
      }
    }

    // Check medical clearance requirement
    if (conditions.requiresMedicalClearance !== undefined &&
        conditions.requiresMedicalClearance !== document.requiresMedicalClearance) {
      return false
    }

    // Check guardian consent requirement
    if (conditions.requiresGuardianConsent !== undefined &&
        conditions.requiresGuardianConsent !== document.requiresGuardianConsent) {
      return false
    }

    // Check international student status
    if (conditions.isInternationalStudent !== undefined &&
        conditions.isInternationalStudent !== student.isInternational) {
      return false
    }

    // Check special needs
    if (conditions.hasSpecialNeeds !== undefined &&
        conditions.hasSpecialNeeds !== student.hasSpecialNeeds) {
      return false
    }

    return true
  }

  /**
   * Creates an auto-approved workflow
   */
  private createAutoApprovedWorkflow(
    document: DocumentInfo,
    student: StudentInfo,
    initiator: UserInfo,
    rule: ApprovalRule
  ): ApprovalWorkflow {
    const now = new Date().toISOString()

    return {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId: document.id,
      studentId: student.id,
      initiatedBy: initiator.id,
      currentStep: 1,
      totalSteps: 1,
      status: 'approved',
      steps: [{
        id: `step_${Date.now()}_auto`,
        stepNumber: 1,
        name: 'Auto Approval',
        description: 'Document automatically approved based on approval rules',
        assignedTo: [],
        status: 'approved',
        requiredApprovals: 1,
        currentApprovals: 1,
        approvals: [{
          id: `approval_${Date.now()}_auto`,
          approverId: 'system',
          approverName: 'System Auto-Approval',
          decision: 'approved',
          comments: `Auto-approved based on rule: ${rule.name}`,
          approvedAt: now
        }],
        assignedAt: now,
        dueDate: now,
        reminderSent: false,
        escalated: false
      }],
      appliedRule: rule,
      createdAt: now,
      updatedAt: now,
      completedAt: now
    }
  }

  /**
   * Creates a workflow with approval steps
   */
  private async createWorkflowWithSteps(
    document: DocumentInfo,
    student: StudentInfo,
    initiator: UserInfo,
    rule: ApprovalRule
  ): Promise<ApprovalWorkflow> {
    const now = new Date().toISOString()
    const dueDate = new Date(Date.now() + (rule.escalationDays * 24 * 60 * 60 * 1000)).toISOString()

    // Resolve approvers for each step
    const steps = await this.createApprovalSteps(rule, student, dueDate)

    return {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId: document.id,
      studentId: student.id,
      initiatedBy: initiator.id,
      currentStep: 1,
      totalSteps: steps.length,
      status: 'in_progress',
      steps,
      appliedRule: rule,
      createdAt: now,
      updatedAt: now,
      dueDate
    }
  }

  /**
   * Creates approval steps based on the rule and student information
   */
  private async createApprovalSteps(
    rule: ApprovalRule,
    student: StudentInfo,
    dueDate: string
  ): Promise<ApprovalStep[]> {
    const steps: ApprovalStep[] = []
    const now = new Date().toISOString()

    // Group approvers by step if needed, or create sequential steps
    // For simplicity, we'll create one step per unique approver role
    const uniqueApprovers = this.deduplicateApprovers(rule.approvers)

    for (let i = 0; i < uniqueApprovers.length; i++) {
      const approver = uniqueApprovers[i]
      const assignedUsers = await this.resolveApprovers(approver, student)

      if (assignedUsers.length > 0) {
        steps.push({
          id: `step_${Date.now()}_${i + 1}`,
          stepNumber: i + 1,
          name: `Approval Step ${i + 1}: ${approver.role.replace('_', ' ').toUpperCase()}`,
          description: `Requires approval from ${approver.role.replace('_', ' ')}`,
          assignedTo: assignedUsers,
          status: 'pending',
          requiredApprovals: Math.min(rule.requiredApprovals, assignedUsers.length),
          currentApprovals: 0,
          approvals: [],
          assignedAt: now,
          dueDate,
          reminderSent: false,
          escalated: false
        })
      }
    }

    return steps
  }

  /**
   * Removes duplicate approver roles
   */
  private deduplicateApprovers(approvers: ApproverConfig[]): ApproverConfig[] {
    const seen = new Set<string>()
    return approvers.filter(approver => {
      const key = `${approver.role}_${approver.department || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Resolves approver roles to actual user IDs
   */
  private async resolveApprovers(approver: ApproverConfig, student: StudentInfo): Promise<string[]> {
    // In production, this would query the user database
    // For now, we'll simulate based on role and student info

    const mockUsers: Record<string, string[]> = {
      class_teacher: ['teacher_john_doe', 'teacher_jane_smith'],
      head_teacher: ['head_teacher_sarah_wilson'],
      principal: ['principal_michael_brown'],
      medical_officer: ['medical_officer_dr_emma_davis'],
      counselor: ['counselor_lisa_johnson'],
      super_admin: ['super_admin_admin_user']
    }

    // Simulate department-specific assignment
    if (approver.role === 'subject_teacher' && approver.department) {
      // Assign based on student's class subject teacher
      return [`subject_teacher_${student.class}_${approver.department}`]
    }

    return mockUsers[approver.role] || []
  }

  /**
   * Schedules guardian notifications for approval workflows
   */
  private async scheduleGuardianNotifications(
    workflow: ApprovalWorkflow,
    document: DocumentInfo,
    student: StudentInfo,
    guardian: GuardianContact
  ): Promise<void> {
    await this.notificationEngine.scheduleWorkflowNotifications(
      workflow.id,
      document.id,
      student.id,
      guardian,
      document.name,
      document.category,
      workflow.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
      true // Approval required
    )
  }

  /**
   * Sends approval request notification
   */
  private async sendApprovalRequestNotification(
    workflow: ApprovalWorkflow,
    step: ApprovalStep
  ): Promise<void> {
    const template = notificationTemplates.approval_request

    // In production, this would send actual notifications
    console.log('Sending approval request notification:', {
      workflowId: workflow.id,
      stepId: step.id,
      assignedTo: step.assignedTo,
      template: template.subject
    })
  }

  /**
   * Processes an approval decision
   */
  async processApproval(
    workflowId: string,
    stepId: string,
    approverId: string,
    decision: 'approved' | 'rejected' | 'delegated',
    comments?: string,
    delegatedTo?: string,
    guardian?: GuardianContact
  ): Promise<ApprovalWorkflow> {
    // In production, this would fetch the workflow from database
    // For now, we'll simulate the workflow update

    const mockWorkflow: ApprovalWorkflow = {
      id: workflowId,
      documentId: 'doc_123',
      studentId: 'student_456',
      initiatedBy: 'user_789',
      currentStep: 1,
      totalSteps: 2,
      status: decision === 'approved' ? 'approved' : 'rejected',
      steps: [],
      appliedRule: defaultApprovalRules[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    }

    // Update the step with the approval
    const approvalRecord: ApprovalRecord = {
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      approverId,
      approverName: 'Approver Name', // Would fetch from user database
      decision,
      delegatedTo,
      comments,
      approvedAt: new Date().toISOString()
    }

    // Logic to update workflow status based on decision
    // This would be more complex in production

    // Update document tracking status
    if (mockWorkflow.documentId) {
      await this.trackingService.updateDocumentStatus(
        mockWorkflow.studentId,
        mockWorkflow.documentId,
        decision === 'approved' ? 'approved' : 'rejected',
        approverId,
        comments,
        decision === 'rejected' ? comments : undefined
      )
    }

    // Send notification to guardian if provided
    if (guardian) {
      await this.notificationEngine.notifyApprovalStatusChange(
        workflowId,
        mockWorkflow.documentId,
        mockWorkflow.studentId,
        guardian,
        decision === 'approved' ? 'approved' : 'rejected',
        'Approver Name',
        comments
      )
    }

    return mockWorkflow
  }

  /**
   * Checks for overdue approvals and sends reminders/escalations
   */
  async checkOverdueApprovals(): Promise<void> {
    // In production, this would query the database for overdue workflows
    // and send appropriate notifications

    const now = new Date()

    // Send due notifications via notification engine
    await this.notificationEngine.sendDueNotifications()

    console.log('Checked for overdue approvals at:', now.toISOString())
  }

  /**
   * Gets workflow statistics
   */
  getWorkflowStatistics(): {
    totalWorkflows: number
    pendingApprovals: number
    overdueApprovals: number
    completedToday: number
  } {
    // Mock statistics
    return {
      totalWorkflows: 150,
      pendingApprovals: 23,
      overdueApprovals: 5,
      completedToday: 12
    }
  }

  /**
   * Gets workflow and notification statistics
   */
  getStatistics(): {
    workflows: {
      totalWorkflows: number
      pendingApprovals: number
      overdueApprovals: number
      completedToday: number
    }
    notifications: {
      totalScheduled: number
      totalSent: number
      totalFailed: number
      pendingNotifications: number
    }
  } {
    const workflowStats = this.getWorkflowStatistics()
    const notificationStats = this.notificationEngine.getNotificationStatistics()

    return {
      workflows: workflowStats,
      notifications: notificationStats
    }
  }

  /**
   * Gets pending notifications for a specific guardian
   */
  getPendingNotificationsForGuardian(guardianId: string) {
    return this.notificationEngine.getPendingNotifications(guardianId)
  }

  /**
   * Cancels all notifications for a document
   */
  cancelDocumentNotifications(documentId: string): void {
    this.notificationEngine.cancelNotifications(documentId)
  }
}

// Export the engine class
export { ApprovalWorkflowEngine }
export type { StudentInfo, UserInfo, DocumentInfo }
