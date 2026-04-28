/**
 * TypeScript Type Definitions for CBT Database Schema
 * Provides type safety for all database operations
 */

/**
 * Question Bank Types
 */
export type QuestionType = 'objective' | 'truefalse' | 'essay'
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard'

export interface Question {
  id: string
  tenantId: string
  text: string
  type: QuestionType
  options: string[] | null
  correctAnswer: string
  difficulty: DifficultyLevel
  subject: string
  tags: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface QuestionCreateInput {
  text: string
  type: QuestionType
  options?: string[]
  correctAnswer: string
  difficulty: DifficultyLevel
  subject: string
  tags?: string[]
}

export interface QuestionUpdateInput {
  text?: string
  type?: QuestionType
  options?: string[]
  correctAnswer?: string
  difficulty?: DifficultyLevel
  subject?: string
  tags?: string[]
}

export interface QuestionFilter {
  subject?: string
  difficulty?: DifficultyLevel
  type?: QuestionType
  searchText?: string
  tags?: string[]
  page?: number
  limit?: number
}

/**
 * Exam Types
 */
export type ExamStatus = 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed'

export interface Exam {
  id: string
  tenantId: string
  title: string
  subject: string
  class: string
  description?: string
  duration: number // in minutes
  passMark: number
  totalMarks: number
  status: ExamStatus
  scheduledDate?: Date
  scheduledTime?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface ExamCreateInput {
  title: string
  subject: string
  class: string
  description?: string
  duration: number
  passMark: number
  totalMarks: number
  scheduledDate?: Date
  scheduledTime?: string
  questionIds: string[]
}

export interface ExamUpdateInput {
  title?: string
  subject?: string
  class?: string
  description?: string
  duration?: number
  passMark?: number
  totalMarks?: number
  status?: ExamStatus
  scheduledDate?: Date
  scheduledTime?: string
}

export interface ExamFilter {
  status?: ExamStatus
  class?: string
  subject?: string
  page?: number
  limit?: number
}

/**
 * Exam Questions Types
 */
export interface ExamQuestion {
  id: string
  examId: string
  questionId: string
  questionOrder: number
  marks: number
  createdAt: Date
}

export interface ExamQuestionCreateInput {
  questionId: string
  questionOrder: number
  marks: number
}

/**
 * Student Exam Progress Types
 */
export type ProgressStatus = 'Active' | 'Completed' | 'Paused' | 'Flagged'

export interface StudentExamProgress {
  id: string
  examId: string
  studentId: string
  questionsAnswered: number
  currentQuestion: number
  status: ProgressStatus
  timeRemaining?: number // in seconds
  lastActivityTime: Date
  flagReason?: string
  flaggedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface StudentExamProgressUpdateInput {
  questionsAnswered?: number
  currentQuestion?: number
  status?: ProgressStatus
  timeRemaining?: number
  flagReason?: string
}

export interface StudentExamProgressFilter {
  examId: string
  status?: ProgressStatus
  page?: number
  limit?: number
}

/**
 * Exam Results Types
 */
export type ResultStatus = 'Passed' | 'Failed'

export interface ExamResult {
  id: string
  examId: string
  studentId: string
  score: number
  totalMarks: number
  percentage: number
  status: ResultStatus
  timeSpent: number // in seconds
  submittedAt: Date
  createdAt: Date
}

export interface ExamResultCreateInput {
  examId: string
  studentId: string
  score: number
  totalMarks: number
  percentage: number
  status: ResultStatus
  timeSpent: number
}

export interface ExamResultFilter {
  examId?: string
  startDate?: Date
  endDate?: Date
  status?: ResultStatus
  page?: number
  limit?: number
}

export interface ExamResultsSummary {
  examId: string
  examTitle: string
  totalStudents: number
  completedStudents: number
  averageScore: number
  passRate: number
  highestScore: number
  lowestScore: number
  results: ExamResult[]
}

/**
 * Student Answers Types
 */
export interface StudentAnswer {
  id: string
  resultId: string
  questionId: string
  studentAnswer?: string
  correctAnswer: string
  isCorrect: boolean
  marksObtained: number
  totalMarks: number
  createdAt: Date
}

export interface StudentAnswerCreateInput {
  resultId: string
  questionId: string
  studentAnswer?: string
  correctAnswer: string
  isCorrect: boolean
  marksObtained: number
  totalMarks: number
}

/**
 * Security Settings Types
 */
export interface SecuritySettings {
  id: string
  examId: string
  enableProctoring: boolean
  disableCopyPaste: boolean
  disableRightClick: boolean
  requireCamera: boolean
  randomizeQuestions: boolean
  randomizeOptions: boolean
  allowedIps: string[] // CIDR notation
  examPassword?: string
  createdAt: Date
  updatedAt: Date
}

export interface SecuritySettingsCreateInput {
  examId: string
  enableProctoring?: boolean
  disableCopyPaste?: boolean
  disableRightClick?: boolean
  requireCamera?: boolean
  randomizeQuestions?: boolean
  randomizeOptions?: boolean
  allowedIps?: string[]
  examPassword?: string
}

export interface SecuritySettingsUpdateInput {
  enableProctoring?: boolean
  disableCopyPaste?: boolean
  disableRightClick?: boolean
  requireCamera?: boolean
  randomizeQuestions?: boolean
  randomizeOptions?: boolean
  allowedIps?: string[]
  examPassword?: string
}

/**
 * Proctoring Logs Types
 */
export type ProctoringEventType =
  | 'camera_on'
  | 'camera_off'
  | 'tab_switch'
  | 'copy_attempt'
  | 'right_click'
  | 'suspicious_activity'
  | 'ip_mismatch'
  | 'password_failed'
  | 'exam_started'
  | 'exam_paused'
  | 'exam_resumed'
  | 'exam_submitted'

export interface ProctoringLog {
  id: string
  examId: string
  studentId: string
  eventType: ProctoringEventType
  eventDetails?: Record<string, any>
  createdAt: Date
}

export interface ProctoringLogCreateInput {
  examId: string
  studentId: string
  eventType: ProctoringEventType
  eventDetails?: Record<string, any>
}

export interface ProctoringLogFilter {
  examId: string
  studentId?: string
  eventType?: ProctoringEventType
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  validationErrors?: Record<string, string>
  requestId?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export interface ValidationError {
  field: string
  message: string
}

/**
 * Dashboard Statistics Types
 */
export interface DashboardStats {
  totalQuestions: number
  totalExams: number
  ongoingExams: number
  activeStudents: number
  averageScore: number
  passRate: number
}

export interface QuestionStats {
  totalCount: number
  byDifficulty: Record<DifficultyLevel, number>
  byType: Record<QuestionType, number>
  bySubject: Record<string, number>
}

export interface ExamStats {
  totalCount: number
  byStatus: Record<ExamStatus, number>
  byClass: Record<string, number>
  bySubject: Record<string, number>
}

/**
 * CSV Import/Export Types
 */
export interface CsvImportResult {
  success: boolean
  imported: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
}

export interface CsvExportOptions {
  questionIds?: string[]
  subject?: string
  difficulty?: DifficultyLevel
  format?: 'csv' | 'json'
}

export interface ResultsExportOptions {
  examId: string
  format?: 'csv' | 'pdf'
  includeAnswers?: boolean
}
