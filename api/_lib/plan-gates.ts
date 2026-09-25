/**
 * Route-prefix → plan-feature gate map.
 *
 * Evaluated centrally in server.mjs before handler dispatch. Matching is
 * longest-prefix-wins against req.path. Only authenticated requests are
 * gated — unauthenticated requests pass through (handlers self-authenticate;
 * genuinely public endpoints like lead capture stay public).
 *
 * Core platform surfaces (auth, dashboards, profiles, tenant settings,
 * user accounts) are deliberately ungated.
 */
import type { PlanFeatures } from '../../src/lib/plans.js'

export interface PlanGate {
  category: keyof PlanFeatures
  feature: string
}

/**
 * [pathPrefix, category, feature, methods?] — longest matching prefix wins.
 * When `methods` is present the rule only applies to those HTTP methods;
 * used where an endpoint mixes plan tiers (e.g. inbox reads vs compose).
 */
const GATES: Array<[string, keyof PlanFeatures, string, string[]?]> = [
  // ---------- Tenant admin API ----------
  ['/api/tenant/academics/calendar', 'academicStructure', 'calendar'],
  ['/api/tenant/academics/overview', 'academicStructure', 'overviewDashboard'],
  ['/api/tenant/academics/subjects', 'academicStructure', 'subjects'],
  ['/api/tenant/academics', 'academicStructure', 'setup'],
  ['/api/tenant/schemes', 'academicStructure', 'schemeOfWork'],
  ['/api/tenant/lesson-notes', 'academicStructure', 'lessonNotes'],
  ['/api/tenant/assignments', 'assignments', 'management'],
  ['/api/tenant/submissions', 'assignments', 'management'],
  ['/api/tenant/absence-reasons', 'attendance', 'absenceReason'],
  ['/api/tenant/attendance/analytics', 'analytics', 'attendance'],
  ['/api/tenant/attendance/audit-trail', 'attendance', 'auditTrail'],
  ['/api/tenant/attendance/batch-upload', 'attendance', 'batchUpload'],
  ['/api/tenant/attendance/notifications', 'communication', 'bulkNotifications'],
  ['/api/tenant/attendance-excuses', 'attendance', 'dailyStudent'],
  ['/api/tenant/attendance/reports', 'analytics', 'attendance'],
  ['/api/tenant/attendance', 'attendance', 'dailyStudent'],
  ['/api/tenant/staff-attendance', 'attendance', 'staffTracking'],
  ['/api/tenant/virtual-attendance', 'attendance', 'dailyStudent'],
  ['/api/tenant/behavioral', 'studentManagement', 'behavioral'],
  ['/api/tenant/biometric-devices', 'admin', 'biometricIntegration'],
  ['/api/tenant/cbt/offline-sync', 'exams', 'offlineSync'],
  ['/api/tenant/cbt/sync', 'exams', 'offlineSync'],
  ['/api/tenant/cbt/monitoring', 'exams', 'liveMonitoring'],
  ['/api/tenant/cbt/ws-monitoring', 'exams', 'liveMonitoring'],
  ['/api/tenant/cbt/security', 'exams', 'security'],
  ['/api/tenant/cbt/audit', 'exams', 'security'],
  ['/api/tenant/cbt/questions', 'exams', 'questionBank'],
  ['/api/tenant/cbt/tags', 'exams', 'questionBank'],
  ['/api/tenant/cbt/subjects', 'exams', 'questionBank'],
  ['/api/tenant/cbt/metadata', 'exams', 'questionBank'],
  ['/api/tenant/cbt/results', 'exams', 'autoGrading'],
  ['/api/tenant/cbt', 'exams', 'creation'],
  ['/api/tenant/exams/item-analysis', 'exams', 'itemAnalysis'],
  ['/api/tenant/exam-assignments', 'exams', 'creation'],
  ['/api/tenant/ca-config', 'results', 'caConfig'],
  ['/api/tenant/grading-scales', 'results', 'gradingScales'],
  ['/api/tenant/report-templates', 'results', 'customTemplates'],
  ['/api/tenant/result-publishing-handler', 'results', 'publishing'],
  ['/api/tenant/results', 'results', 'autoComputation'],
  ['/api/tenant/transcript', 'results', 'transcripts'],
  ['/api/tenant/timetable/exam-schedules', 'exams', 'timetabling'],
  ['/api/tenant/timetable/auto-schedule', 'scheduling', 'autoGeneration'],
  ['/api/tenant/timetable/class-schedules', 'scheduling', 'timetables'],
  ['/api/tenant/timetable/teacher-schedules', 'scheduling', 'timetables'],
  ['/api/tenant/timetable', 'scheduling', 'configuration'],
  ['/api/tenant/lessons', 'digitalLearning', 'virtualClassrooms'],
  ['/api/tenant/live-meetings', 'digitalLearning', 'virtualClassrooms'],
  ['/api/tenant/virtual-classrooms', 'digitalLearning', 'virtualClassrooms'],
  ['/api/tenant/virtual-learning', 'digitalLearning', 'consentManagement'],
  ['/api/tenant/course-materials', 'digitalLearning', 'materialsRepository'],
  ['/api/tenant/discussions', 'digitalLearning', 'discussions'],
  ['/api/tenant/private-lesson', 'digitalLearning', 'privateLessons'],
  ['/api/tenant/finance/payment-plans', 'finance', 'paymentPlans'],
  ['/api/tenant/finance/exemptions', 'finance', 'exemptions'],
  ['/api/tenant/finance/reconciliation', 'finance', 'reconciliation'],
  ['/api/tenant/finance/audit-log', 'finance', 'auditLog'],
  ['/api/tenant/finance/reports', 'analytics', 'financial'],
  ['/api/tenant/finance/payments', 'finance', 'collection'],
  ['/api/tenant/finance', 'finance', 'feeStructure'],
  ['/api/tenant/integrations/payment-gateway', 'finance', 'paymentGateway'],
  ['/api/tenant/integrations/biometric', 'admin', 'biometricIntegration'],
  ['/api/tenant/integrations/lms', 'admin', 'lmsIntegration'],
  ['/api/tenant/integrations/api-management', 'admin', 'apiAccess'],
  ['/api/tenant/integrations', 'admin', 'apiAccess'],
  ['/api/tenant/payroll', 'hr', 'payroll'],
  ['/api/tenant/roles', 'hr', 'rolesDepartments'],
  ['/api/tenant/staff', 'hr', 'staffDirectory'],
  ['/api/tenant/teacher-allocation', 'academicStructure', 'teacherAllocation'],
  ['/api/tenant/teacher-workloads', 'academicStructure', 'teacherAllocation'],
  ['/api/tenant/communication-logs', 'communication', 'logs'],
  ['/api/tenant/communications/logs', 'communication', 'logs'],
  ['/api/tenant/communication/logs', 'communication', 'logs'],
  ['/api/tenant/bulk-notifications', 'communication', 'bulkNotifications'],
  ['/api/tenant/parent-messages', 'communication', 'parentTeacherMessaging'],
  ['/api/tenant/staff-messages', 'communication', 'messaging'],
  ['/api/tenant/communication', 'communication', 'announcements'],
  ['/api/tenant/communications', 'communication', 'announcements'],
  ['/api/tenant/email', 'communication', 'emailIntegration'],
  ['/api/tenant/notifications', 'communication', 'inAppNotifications'],
  ['/api/tenant/analytics/academic', 'analytics', 'academic'],
  ['/api/tenant/analytics/financial', 'analytics', 'financial'],
  ['/api/tenant/analytics/student-progress', 'analytics', 'studentProgress'],
  ['/api/tenant/analytics/teacher-performance', 'analytics', 'teacherPerformance'],
  ['/api/tenant/analytics/performance', 'analytics', 'teacherPerformance'],
  ['/api/tenant/analytics', 'analytics', 'academic'],
  ['/api/tenant/student-progress', 'analytics', 'studentProgress'],
  ['/api/tenant/students/risk-alerts', 'analytics', 'predictiveRisk'],
  ['/api/tenant/students', 'studentManagement', 'directory'],
  ['/api/tenant/promotions', 'studentManagement', 'promotion'],
  ['/api/tenant/promotion-rules', 'studentManagement', 'promotion'],
  ['/api/tenant/alerts', 'admin', 'commandCenter'],
  ['/api/tenant/system-alerts', 'admin', 'commandCenter'],
  ['/api/tenant/approvals', 'security', 'approvalCenter'],
  ['/api/tenant/security/backup-restore', 'admin', 'backupRestore'],
  ['/api/tenant/security/session', 'security', 'sessionManagement'],
  ['/api/tenant/security/access-control', 'security', 'rbac'],
  ['/api/tenant/security/encryption', 'security', 'encryption'],
  ['/api/tenant/security/data-encryption', 'security', 'encryption'],
  ['/api/tenant/security/incidents', 'security', 'privacyIncident'],
  ['/api/tenant/security', 'security', 'rbac'],
  ['/api/tenant/audit-logs', 'security', 'systemAuditLogs'],
  ['/api/tenant/tasks', 'security', 'taskManagement'],
  ['/api/tenant/system-health', 'admin', 'opsMonitoring'],
  ['/api/tenant/error-logs', 'admin', 'opsMonitoring'],
  ['/api/tenant/branding', 'admin', 'branding'],
  ['/api/tenant/support-tickets', 'support', 'ticketSystem'],
  ['/api/student-documents', 'studentManagement', 'documents'],
  ['/api/student-health', 'studentManagement', 'healthRecords'],

  // ---------- Staff portal API ----------
  ['/api/staff/assignments', 'assignments', 'management'],
  ['/api/staff/attendance', 'attendance', 'dailyStudent'],
  ['/api/staff/my-attendance', 'attendance', 'staffTracking'],
  ['/api/staff/leave', 'hr', 'leave'],
  ['/api/staff/payslips', 'hr', 'payslips'],
  ['/api/staff/bank-details', 'hr', 'payslips'],
  ['/api/staff/tasks', 'security', 'taskManagement'],
  ['/api/staff/materials', 'digitalLearning', 'materialsRepository'],
  ['/api/staff/virtual-classes', 'digitalLearning', 'virtualClassrooms'],
  // Inbox reads belong to in-app notifications (broadcasts land here);
  // staff POST is genuine compose, so it stays under messaging.
  ['/api/staff/messages', 'communication', 'inAppNotifications', ['GET', 'PUT']],
  ['/api/staff/messages', 'communication', 'messaging', ['POST']],
  ['/api/staff/timetable', 'scheduling', 'timetables'],
  ['/api/staff/announcements', 'communication', 'announcements'],
  ['/api/staff/documents', 'hr', 'documents'],

  // ---------- Student portal API ----------
  ['/api/student/assignments', 'assignments', 'management'],
  ['/api/student/attendance', 'attendance', 'dailyStudent'],
  ['/api/student/exams', 'exams', 'creation'],
  ['/api/student/lesson-notes', 'academicStructure', 'lessonNotes'],
  ['/api/student/materials', 'digitalLearning', 'materialsRepository'],
  ['/api/student/live-meetings', 'digitalLearning', 'virtualClassrooms'],
  // Student inbox + teacher compose are part of the notification loop.
  ['/api/student/messages', 'communication', 'inAppNotifications'],
  ['/api/student/results', 'results', 'publishing'],
  ['/api/student/transcript', 'results', 'transcripts'],
  ['/api/student/timetable', 'scheduling', 'timetables'],
  ['/api/student/fees', 'finance', 'collection'],
  ['/api/student/announcements', 'communication', 'announcements'],
  ['/api/student/notifications', 'communication', 'inAppNotifications'],
  ['/api/student/events', 'academicStructure', 'calendar'],
  ['/api/student/documents', 'studentManagement', 'documents'],
  ['/api/student/behavioral', 'studentManagement', 'behavioral'],
  ['/api/student/discussions', 'digitalLearning', 'discussions'],
  ['/api/student/support', 'communication', 'inAppNotifications'],

  // ---------- Parent portal API ----------
  ['/api/parent/academic', 'results', 'publishing'],
  ['/api/parent/announcements', 'communication', 'announcements'],
  ['/api/parent/assignments', 'assignments', 'management'],
  ['/api/parent/attendance', 'attendance', 'dailyStudent'],
  ['/api/parent/behavioral', 'studentManagement', 'behavioral'],
  ['/api/parent/documents', 'studentManagement', 'documents'],
  ['/api/parent/events', 'academicStructure', 'calendar'],
  ['/api/parent/exams', 'exams', 'creation'],
  ['/api/parent/fees', 'finance', 'collection'],
  ['/api/parent/health', 'studentManagement', 'healthRecords'],
  ['/api/parent/messages', 'communication', 'parentTeacherMessaging'],
  ['/api/parent/support', 'communication', 'inAppNotifications'],
  ['/api/parent/notifications', 'communication', 'inAppNotifications'],
  ['/api/parent/notification-preferences', 'communication', 'inAppNotifications'],
  ['/api/parent/timetable', 'scheduling', 'timetables'],
  ['/api/parent/transcript', 'results', 'transcripts'],
]

/**
 * Exact-shape overrides evaluated before prefix rules — for paths where the
 * feature tier depends on the operation, not just the resource prefix.
 * Mark-read endpoints are inbox operations, not compose.
 */
const GATE_OVERRIDES: Array<[RegExp, keyof PlanFeatures, string]> = [
  [/^\/api\/staff\/messages\/[^/]+\/read$/, 'communication', 'inAppNotifications'],
]

/**
 * Returns the plan gate for a request, or null if ungated.
 * Longest matching prefix wins so specific rules beat general ones.
 * Rules carrying a method list only apply to those methods.
 */
export function matchPlanGate(path: string, method = 'GET'): PlanGate | null {
  for (const [pattern, category, feature] of GATE_OVERRIDES) {
    if (pattern.test(path)) return { category, feature }
  }
  let best: { len: number; gate: PlanGate } | null = null
  for (const [prefix, category, feature, methods] of GATES) {
    if (methods && !methods.includes(method)) continue
    if (path === prefix || path.startsWith(prefix + '/')) {
      if (!best || prefix.length > best.len) {
        best = { len: prefix.length, gate: { category, feature } }
      }
    }
  }
  return best?.gate ?? null
}
