/**
 * Pisairtel Schools Subscription Plan Configuration
 * Based on the proposal document: Starter, Standard, Premium
 */

export type PlanType = 'starter' | 'standard' | 'premium';

export interface PlanFeatures {
  admissions: {
    publicPortal: boolean;
    inquiryManagement: boolean;
    enrollmentWorkflow: boolean;
    bulkImport: boolean;
  };
  studentManagement: {
    registration: boolean;
    directory: boolean;
    documents: boolean;
    healthRecords: boolean;
    promotion: boolean;
  };
  academicStructure: {
    setup: boolean;
    subjects: boolean;
    teacherAllocation: boolean;
    calendar: boolean;
    overviewDashboard: boolean;
  };
  attendance: {
    dailyStudent: boolean;
    qrCode: boolean;
    batchUpload: boolean;
    staffTracking: boolean;
    absenceReason: boolean;
    auditTrail: boolean;
    biometric: boolean;
  };
  results: {
    caConfig: boolean;
    autoComputation: boolean;
    approvalWorkflow: boolean;
    broadsheets: boolean;
    transcripts: boolean;
    publishing: boolean;
    gradingScales: boolean;
    customTemplates: boolean;
  };
  exams: {
    timetabling: boolean;
    questionBank: boolean;
    creation: boolean;
    autoGrading: boolean;
    liveMonitoring: boolean;
    security: boolean;
    itemAnalysis: boolean;
    offlineSync: boolean;
    verification: boolean;
  };
  scheduling: {
    timetables: boolean;
    configuration: boolean;
    autoGeneration: boolean;
  };
  digitalLearning: {
    virtualClassrooms: boolean;
    materialsRepository: boolean;
    discussions: boolean;
    privateLessons: boolean;
    consentManagement: boolean;
  };
  finance: {
    feeStructure: boolean;
    collection: boolean;
    invoice: boolean;
    receipt: boolean;
    reminders: boolean;
    paymentPlans: boolean;
    bulkUpload: boolean;
    exemptions: boolean;
    ledger: boolean;
    reversals: boolean;
    paymentGateway: boolean;
    reconciliation: boolean;
    auditLog: boolean;
  };
  hr: {
    staffDirectory: boolean;
    rolesDepartments: boolean;
    documents: boolean;
    payroll: boolean;
    payslips: boolean;
    leave: boolean;
    performance: boolean;
  };
  communication: {
    announcements: boolean;
    smsNotification: boolean;
    bulkNotifications: boolean;
    parentTeacherMessaging: boolean;
    emailIntegration: boolean;
    logs: boolean;
  };
  analytics: {
    academic: boolean;
    attendance: boolean;
    financial: boolean;
    studentProgress: boolean;
    teacherPerformance: boolean;
    predictiveRisk: boolean;
  };
  security: {
    rbac: boolean;
    encryption: boolean;
    sessionManagement: boolean;
    approvalCenter: boolean;
    taskManagement: boolean;
    customRoles: boolean;
    systemAuditLogs: boolean;
    privacyIncident: boolean;
  };
  admin: {
    branding: boolean;
    importExport: boolean;
    biometricIntegration: boolean;
    lmsIntegration: boolean;
    apiAccess: boolean;
    multiSchool: boolean;
  };
  support: {
    helpCenter: boolean;
    ticketSystem: boolean;
    prioritySupport: boolean;
  };
}

export const PLAN_RATES: Record<PlanType, number> = {
  starter: 2000,
  standard: 3000,
  premium: 6000,
};

export const PLAN_CONFIG: Record<PlanType, PlanFeatures> = {
  starter: {
    admissions: { publicPortal: false, inquiryManagement: false, enrollmentWorkflow: true, bulkImport: false },
    studentManagement: { registration: true, directory: true, documents: false, healthRecords: false, promotion: false },
    academicStructure: { setup: true, subjects: true, teacherAllocation: false, calendar: false, overviewDashboard: false },
    attendance: { dailyStudent: true, qrCode: false, batchUpload: false, staffTracking: false, absenceReason: false, auditTrail: false, biometric: false },
    results: { caConfig: true, autoComputation: true, approvalWorkflow: false, broadsheets: true, transcripts: false, publishing: true, gradingScales: false, customTemplates: false },
    exams: { timetabling: true, questionBank: true, creation: true, autoGrading: true, liveMonitoring: false, security: false, itemAnalysis: false, offlineSync: false, verification: false },
    scheduling: { timetables: false, configuration: false, autoGeneration: false },
    digitalLearning: { virtualClassrooms: false, materialsRepository: false, discussions: false, privateLessons: false, consentManagement: false },
    finance: { feeStructure: true, collection: true, invoice: true, receipt: true, reminders: false, paymentPlans: false, bulkUpload: false, exemptions: false, ledger: false, reversals: false, paymentGateway: false, reconciliation: false, auditLog: false },
    hr: { staffDirectory: true, rolesDepartments: false, documents: false, payroll: false, payslips: false, leave: false, performance: false },
    communication: { announcements: true, smsNotification: false, bulkNotifications: false, parentTeacherMessaging: false, emailIntegration: false, logs: false },
    analytics: { academic: false, attendance: false, financial: false, studentProgress: false, teacherPerformance: false, predictiveRisk: false },
    security: { rbac: true, encryption: true, sessionManagement: false, approvalCenter: false, taskManagement: false, customRoles: false, systemAuditLogs: false, privacyIncident: false },
    admin: { branding: true, importExport: false, biometricIntegration: false, lmsIntegration: false, apiAccess: false, multiSchool: false },
    support: { helpCenter: true, ticketSystem: false, prioritySupport: false },
  },
  standard: {
    admissions: { publicPortal: true, inquiryManagement: true, enrollmentWorkflow: true, bulkImport: true },
    studentManagement: { registration: true, directory: true, documents: true, healthRecords: true, promotion: true },
    academicStructure: { setup: true, subjects: true, teacherAllocation: true, calendar: true, overviewDashboard: false },
    attendance: { dailyStudent: true, qrCode: true, batchUpload: true, staffTracking: true, absenceReason: true, auditTrail: false, biometric: false },
    results: { caConfig: true, autoComputation: true, approvalWorkflow: true, broadsheets: true, transcripts: true, publishing: true, gradingScales: true, customTemplates: false },
    exams: { timetabling: true, questionBank: true, creation: true, autoGrading: true, liveMonitoring: true, security: true, itemAnalysis: false, offlineSync: false, verification: false },
    scheduling: { timetables: true, configuration: true, autoGeneration: false },
    digitalLearning: { virtualClassrooms: false, materialsRepository: false, discussions: false, privateLessons: false, consentManagement: false },
    finance: { feeStructure: true, collection: true, invoice: true, receipt: true, reminders: true, paymentPlans: true, bulkUpload: true, exemptions: true, ledger: true, reversals: true, paymentGateway: false, reconciliation: false, auditLog: false },
    hr: { staffDirectory: true, rolesDepartments: true, documents: true, payroll: false, payslips: false, leave: false, performance: false },
    communication: { announcements: true, smsNotification: true, bulkNotifications: true, parentTeacherMessaging: true, emailIntegration: true, logs: false },
    analytics: { academic: true, attendance: true, financial: true, studentProgress: true, teacherPerformance: false, predictiveRisk: false },
    security: { rbac: true, encryption: true, sessionManagement: true, approvalCenter: true, taskManagement: false, customRoles: false, systemAuditLogs: false, privacyIncident: false },
    admin: { branding: true, importExport: true, biometricIntegration: false, lmsIntegration: false, apiAccess: false, multiSchool: false },
    support: { helpCenter: true, ticketSystem: true, prioritySupport: false },
  },
  premium: {
    admissions: { publicPortal: true, inquiryManagement: true, enrollmentWorkflow: true, bulkImport: true },
    studentManagement: { registration: true, directory: true, documents: true, healthRecords: true, promotion: true },
    academicStructure: { setup: true, subjects: true, teacherAllocation: true, calendar: true, overviewDashboard: true },
    attendance: { dailyStudent: true, qrCode: true, batchUpload: true, staffTracking: true, absenceReason: true, auditTrail: true, biometric: true },
    results: { caConfig: true, autoComputation: true, approvalWorkflow: true, broadsheets: true, transcripts: true, publishing: true, gradingScales: true, customTemplates: true },
    exams: { timetabling: true, questionBank: true, creation: true, autoGrading: true, liveMonitoring: true, security: true, itemAnalysis: true, offlineSync: true, verification: true },
    scheduling: { timetables: true, configuration: true, autoGeneration: true },
    digitalLearning: { virtualClassrooms: true, materialsRepository: true, discussions: true, privateLessons: true, consentManagement: true },
    finance: { feeStructure: true, collection: true, invoice: true, receipt: true, reminders: true, paymentPlans: true, bulkUpload: true, exemptions: true, ledger: true, reversals: true, paymentGateway: true, reconciliation: true, auditLog: true },
    hr: { staffDirectory: true, rolesDepartments: true, documents: true, payroll: true, payslips: true, leave: true, performance: true },
    communication: { announcements: true, smsNotification: true, bulkNotifications: true, parentTeacherMessaging: true, emailIntegration: true, logs: true },
    analytics: { academic: true, attendance: true, financial: true, studentProgress: true, teacherPerformance: true, predictiveRisk: true },
    security: { rbac: true, encryption: true, sessionManagement: true, approvalCenter: true, taskManagement: true, customRoles: true, systemAuditLogs: true, privacyIncident: true },
    admin: { branding: true, importExport: true, biometricIntegration: true, lmsIntegration: true, apiAccess: true, multiSchool: true },
    support: { helpCenter: true, ticketSystem: true, prioritySupport: true },
  },
};
