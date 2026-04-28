/**
 * Real-Time Synchronization Service for CBT
 * 
 * Handles broadcasting of real-time updates to connected clients:
 * - Student progress updates
 * - Exam result submissions
 * - Question bank changes
 * - Security setting changes
 */

import { wsManager, WebSocketMessage } from './websocket-manager';

export interface ProgressUpdateEvent {
  examId: string;
  studentId: string;
  questionsAnswered: number;
  currentQuestion: number;
  timeRemaining: number;
  completionPercentage: number;
  status: 'Active' | 'Completed' | 'Paused' | 'Flagged';
}

export interface ResultSubmissionEvent {
  examId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'Passed' | 'Failed';
  submittedAt: string;
}

export interface QuestionBankUpdateEvent {
  type: 'added' | 'deleted' | 'updated';
  questionId: string;
  questionText: string;
  subject: string;
  difficulty: string;
}

export interface SecuritySettingChangeEvent {
  examId: string;
  setting: string;
  oldValue: any;
  newValue: any;
  changedAt: string;
}

/**
 * Broadcast student progress update to all invigilators
 * 
 * This should be called whenever a student submits an answer or their
 * progress changes during an exam.
 */
export function broadcastProgressUpdate(
  event: ProgressUpdateEvent
): void {
  const message: WebSocketMessage = {
    type: 'progress_update',
    data: {
      examId: event.examId,
      studentId: event.studentId,
      questionsAnswered: event.questionsAnswered,
      currentQuestion: event.currentQuestion,
      timeRemaining: event.timeRemaining,
      completionPercentage: event.completionPercentage,
      status: event.status,
    },
  };

  wsManager.broadcastToExam(event.examId, message);
}

/**
 * Broadcast exam result submission to all invigilators
 * 
 * This should be called when a student completes and submits their exam.
 */
export function broadcastResultSubmission(
  event: ResultSubmissionEvent
): void {
  const message: WebSocketMessage = {
    type: 'student_completed',
    data: {
      examId: event.examId,
      studentId: event.studentId,
      studentName: event.studentName,
      score: event.score,
      totalMarks: event.totalMarks,
      percentage: event.percentage,
      status: event.status,
      submittedAt: event.submittedAt,
    },
  };

  wsManager.broadcastToExam(event.examId, message);
}

/**
 * Broadcast exam end event
 * 
 * This should be called when an exam ends (time expires or admin ends it).
 */
export function broadcastExamEnded(examId: string): void {
  const message: WebSocketMessage = {
    type: 'exam_ended',
    data: {
      examId,
      endedAt: new Date().toISOString(),
    },
  };

  wsManager.broadcastToExam(examId, message);
}

/**
 * Broadcast question bank update
 * 
 * This should be called when questions are added, deleted, or updated.
 */
export function broadcastQuestionBankUpdate(
  event: QuestionBankUpdateEvent
): void {
  // Broadcast to all exams (since question bank is global)
  // In a real implementation, you might want to broadcast only to relevant exams
  const message: WebSocketMessage = {
    type: 'progress_update', // Reuse progress_update type for question bank changes
    data: {
      updateType: 'question_bank',
      changeType: event.type,
      questionId: event.questionId,
      questionText: event.questionText,
      subject: event.subject,
      difficulty: event.difficulty,
    },
  };

  // Broadcast to all connected exams
  const stats = wsManager.getStats();
  Object.keys(stats.exams).forEach((examId) => {
    wsManager.broadcastToExam(examId, message);
  });
}

/**
 * Broadcast security setting change
 * 
 * This should be called when security settings are modified.
 */
export function broadcastSecuritySettingChange(
  event: SecuritySettingChangeEvent
): void {
  const message: WebSocketMessage = {
    type: 'progress_update', // Reuse progress_update type for setting changes
    data: {
      updateType: 'security_setting',
      examId: event.examId,
      setting: event.setting,
      oldValue: event.oldValue,
      newValue: event.newValue,
      changedAt: event.changedAt,
    },
  };

  wsManager.broadcastToExam(event.examId, message);
}

/**
 * Get connection statistics
 */
export function getRealtimeStats() {
  return wsManager.getStats();
}

/**
 * Get queued messages for a client that just connected
 */
export function getQueuedMessages(examId: string): WebSocketMessage[] {
  return wsManager.getQueuedMessages(examId);
}

/**
 * Clear message queue for an exam
 */
export function clearMessageQueue(examId: string): void {
  wsManager.clearQueue(examId);
}
