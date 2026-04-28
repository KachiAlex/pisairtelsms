/**
 * Real-Time Monitoring Wrapper
 * 
 * Wraps monitoring functions to add real-time broadcasting via WebSocket/polling.
 * This ensures that whenever monitoring data changes, all connected clients are notified.
 */

import {
  updateStudentProgress as baseUpdateStudentProgress,
  recordExamCompletion as baseRecordExamCompletion,
  flagStudent as baseFlagStudent,
  ProgressUpdateInput,
  CompletionInput,
  FlagInput,
  StudentProgress,
} from './monitoring';
import {
  broadcastProgressUpdate,
  broadcastResultSubmission,
} from './realtime-sync';

/**
 * Update student progress with real-time broadcasting
 */
export async function updateStudentProgressWithBroadcast(
  input: ProgressUpdateInput,
  tenantId: string
): Promise<StudentProgress> {
  // Update progress in database
  const progress = await baseUpdateStudentProgress(input, tenantId);

  // Broadcast update to all connected invigilators
  try {
    broadcastProgressUpdate({
      examId: input.examId,
      studentId: input.studentId,
      questionsAnswered: progress.questionsAnswered,
      currentQuestion: progress.currentQuestionIndex,
      timeRemaining: progress.timeRemaining,
      completionPercentage: progress.completionPercentage,
      status: progress.status,
    });
  } catch (error) {
    // Log error but don't fail the update
    console.error('Failed to broadcast progress update:', error);
  }

  return progress;
}

/**
 * Record exam completion with real-time broadcasting
 */
export async function recordExamCompletionWithBroadcast(
  input: CompletionInput,
  tenantId: string
): Promise<void> {
  // Record completion in database
  await baseRecordExamCompletion(input, tenantId);

  // Broadcast completion to all connected invigilators
  try {
    // Get student name from database for the broadcast
    const { getPool } = await import('./db');
    const pool = getPool();

    const studentResult = await pool.query(
      `SELECT u.first_name, u.last_name FROM users u
       WHERE u.id = $1`,
      [input.studentId]
    );

    const studentName = studentResult.rows[0]
      ? `${studentResult.rows[0].first_name} ${studentResult.rows[0].last_name}`
      : 'Unknown Student';

    // Get exam result for score information
    const resultResult = await pool.query(
      `SELECT score, total_marks, percentage, status FROM exam_results
       WHERE exam_id = $1 AND student_id = $2`,
      [input.examId, input.studentId]
    );

    if (resultResult.rows.length > 0) {
      const result = resultResult.rows[0];
      broadcastResultSubmission({
        examId: input.examId,
        studentId: input.studentId,
        studentName,
        score: result.score,
        totalMarks: result.total_marks,
        percentage: result.percentage,
        status: result.status,
        submittedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Log error but don't fail the completion
    console.error('Failed to broadcast exam completion:', error);
  }
}

/**
 * Flag student with real-time broadcasting
 */
export async function flagStudentWithBroadcast(
  input: FlagInput,
  tenantId: string
): Promise<StudentProgress> {
  // Flag student in database
  const flaggedStudent = await baseFlagStudent(input, tenantId);

  // Broadcast flag update to all connected invigilators
  try {
    broadcastProgressUpdate({
      examId: input.examId,
      studentId: input.studentId,
      questionsAnswered: flaggedStudent.questionsAnswered,
      currentQuestion: flaggedStudent.currentQuestionIndex,
      timeRemaining: flaggedStudent.timeRemaining,
      completionPercentage: flaggedStudent.completionPercentage,
      status: 'Flagged',
    });
  } catch (error) {
    // Log error but don't fail the flag
    console.error('Failed to broadcast flag update:', error);
  }

  return flaggedStudent;
}
