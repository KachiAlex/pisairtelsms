/**
 * CBT & Examinations Database Types
 * TypeScript interfaces for all database entities
 */

// ============================================================================
// QUESTION BANK TYPES
// ============================================================================

export type QuestionType = 'objective' | 'truefalse' | 'essay';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  tenantId: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer?: string;
  difficulty: DifficultyLevel;
  subject: string;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateQuestionInput {
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer?: string;
  difficulty: DifficultyLevel;
  subject: string;
  tags?: string[];
}

export interface UpdateQuestionInput {
  text?: string;
  type?: QuestionType;
  options?: QuestionOption[];
  correctAnswer?: string;
  difficulty?: DifficultyLevel;
  subject?: string;
  tags?: string[];
}

// ============================================================================
// EXAM TYPES
// ============================================================================

export type ExamStatus = 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed';

export interface Exam {
  id: string;
  tenantId: string;
  title: string;
  subject: string;
  class: string;
  description?: string;
  duration: number; // in minutes
  passMark: number;
  totalMarks: number;
  status: ExamStatus;
  scheduledDate?: Date;
  scheduledTime?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateExamInput {
  title: string;
  subject: string;
  class: string;
  description?: string;
  duration: number;
  passMark: number;
  totalMarks: number;
  questionIds: string[];
}

export interface UpdateExamInput {
  title?: string;
  subject?: string;
  class?: string;
  description?: string;
  duration?: number;
  passMark?: number;
  totalMarks?: number;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  questionOrder: number;
  marks: number;
  createdAt: Date;
}

// ============================================================================
// STUDENT PROGRESS TYPES
// ============================================================================

export type ProgressStatus = 'Active' | 'Completed' | 'Paused' | 'Flagged';

export interface StudentExamProgress {
  id: string;
  examId: string;
  studentId: string;
  questionsAnswered: number;
  currentQuestion: number;
  status: ProgressStatus;
  timeRemaining?: number;
  lastActivityTime: Date;
  flagReason?: string;
  flaggedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProgressInput {
  questionsAnswered?: number;
  currentQuestion?: number;
  status?: ProgressStatus;
  timeRemaining?: number;
  flagReason?: string;
}

// ============================================================================
// EXAM RESULTS TYPES
// ============================================================================

export type ResultStatus = 'Pending' | 'Passed' | 'Failed';

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: ResultStatus;
  timeSpent: number; // in seconds
  submittedAt: Date;
  createdAt: Date;
}

export interface StudentAnswer {
  id: string;
  resultId: string;
  questionId: string;
  studentAnswer?: string;
  correctAnswer?: string;
  isCorrect: boolean;
  marksObtained: number;
  totalMarks: number;
  createdAt: Date;
}

export interface ExamResultsSummary {
  examId: string;
  examTitle: string;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
}

// ============================================================================
// SECURITY SETTINGS TYPES
// ============================================================================

export interface SecuritySettings {
  id: string;
  examId: string;
  enableProctoring: boolean;
  disableCopyPaste: boolean;
  disableRightClick: boolean;
  requireCamera: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowedIps?: string[];
  examPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSecuritySettingsInput {
  enableProctoring?: boolean;
  disableCopyPaste?: boolean;
  disableRightClick?: boolean;
  requireCamera?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  allowedIps?: string[];
  examPassword?: string;
}

// ============================================================================
// PROCTORING TYPES
// ============================================================================

export type ProctoringEventType = 
  | 'tab_switch' 
  | 'copy_attempt' 
  | 'right_click' 
  | 'camera_off' 
  | 'suspicious_activity' 
  | 'manual_flag' 
  | 'other';

export interface ProctoringLog {
  id: string;
  examId: string;
  studentId: string;
  eventType: ProctoringEventType;
  eventDetails?: Record<string, any>;
  createdAt: Date;
}

export interface CreateProctoringLogInput {
  examId: string;
  studentId: string;
  eventType: ProctoringEventType;
  eventDetails?: Record<string, any>;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'read' 
  | 'export' 
  | 'import'
  | 'start_exam' 
  | 'pause_exam' 
  | 'resume_exam' 
  | 'complete_exam'
  | 'flag_student' 
  | 'approve_results' 
  | 'sync_offline';

export type AuditEntityType = 
  | 'question' 
  | 'exam' 
  | 'exam_result' 
  | 'security_settings' 
  | 'student_answer';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  changes?: Record<string, any>;
  createdAt: Date;
}

export interface CreateAuditLogInput {
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  changes?: Record<string, any>;
}

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface OfflineSyncQueue {
  id: string;
  studentId: string;
  examId: string;
  answers: StudentAnswer[];
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  syncedAt?: Date;
}

export interface CreateOfflineSyncInput {
  studentId: string;
  examId: string;
  answers: StudentAnswer[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string>;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface QuestionFilter {
  subject?: string;
  difficulty?: DifficultyLevel;
  type?: QuestionType;
  searchText?: string;
  page?: number;
  limit?: number;
}

export interface ExamFilter {
  tenantId: string;
  status?: ExamStatus;
  class?: string;
  subject?: string;
  page?: number;
  limit?: number;
}

export interface ResultsFilter {
  examId?: string;
  studentId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ResultStatus;
  page?: number;
  limit?: number;
}
