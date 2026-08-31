/**
 * Offline Sync Service
 * Handles synchronization of offline exam answers with conflict resolution
 */

import { queryAll, queryOne, query } from './db.js';
import { OfflineSyncQueue, StudentAnswer, SyncStatus } from './types.js';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(retryCount: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
}

/**
 * Sync offline answers to database
 * Uses server-as-authoritative conflict resolution strategy
 */
export async function syncOfflineAnswers(
  tenantId: string,
  studentId: string,
  examId: string,
  answers: StudentAnswer[],
  timestamp: Date
): Promise<{
  success: boolean;
  synced: number;
  conflicts: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;
  let conflicts = 0;
  let failed = 0;

  try {
    // Verify exam exists and belongs to tenant
    const exam = await queryOne<{ id: string; tenant_id: string }>(
      'SELECT id, tenant_id FROM exams WHERE id = $1',
      [examId]
    );

    if (!exam || exam.tenant_id !== tenantId) {
      throw new Error('Exam not found or does not belong to tenant');
    }

    // Verify student exists
    const student = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      [studentId]
    );

    if (!student) {
      throw new Error('Student not found');
    }

    // Get or create exam result
    let result = await queryOne<{ id: string }>(
      'SELECT id FROM exam_results WHERE exam_id = $1 AND student_id = $2',
      [examId, studentId]
    );

    if (!result) {
      // Create new result
      result = await queryOne<{ id: string }>(
        `INSERT INTO exam_results (exam_id, student_id, score, total_marks, percentage, status, time_spent)
         VALUES ($1, $2, 0, 0, 0, 'Pending', 0)
         RETURNING id`,
        [examId, studentId]
      );

      if (!result) {
        throw new Error('Failed to create exam result');
      }
    }

    const resultId = result.id;

    // Process each answer
    for (const answer of answers) {
      try {
        // Validate answer data
        if (!answer.questionId) {
          errors.push(`Answer missing questionId`);
          failed++;
          continue;
        }

        // Verify question exists
        const question = await queryOne<{ id: string }>(
          'SELECT id FROM questions_bank WHERE id = $1',
          [answer.questionId]
        );

        if (!question) {
          errors.push(`Question ${answer.questionId} not found`);
          failed++;
          continue;
        }

        // Check for existing answer (conflict detection)
        const existingAnswer = await queryOne<{
          id: string;
          student_answer: string;
          updated_at: Date;
        }>(
          'SELECT id, student_answer, updated_at FROM student_answers WHERE result_id = $1 AND question_id = $2',
          [resultId, answer.questionId]
        );

        if (existingAnswer) {
          // Conflict detected - use server-as-authoritative strategy
          // Server answer takes precedence, offline answer is discarded
          conflicts++;
          continue;
        }

        // Insert new answer
        const inserted = await queryOne<{ id: string }>(
          `INSERT INTO student_answers (
            result_id, question_id, student_answer, correct_answer,
            is_correct, marks_obtained, total_marks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
          [
            resultId,
            answer.questionId,
            answer.studentAnswer || null,
            answer.correctAnswer || null,
            answer.isCorrect || false,
            answer.marksObtained || 0,
            answer.totalMarks || 0,
          ]
        );

        if (inserted) {
          synced++;
        } else {
          errors.push(`Failed to insert answer for question ${answer.questionId}`);
          failed++;
        }
      } catch (error) {
        errors.push(
          `Error processing answer for question ${answer.questionId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        failed++;
      }
    }

    // Update sync queue status
    await updateSyncQueueStatus(studentId, examId, 'synced');

    return {
      success: failed === 0,
      synced,
      conflicts,
      failed,
      errors,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);

    // Update sync queue with error
    await updateSyncQueueStatus(
      studentId,
      examId,
      'failed',
      errorMessage
    );

    return {
      success: false,
      synced: 0,
      conflicts: 0,
      failed: answers.length,
      errors,
    };
  }
}

/**
 * Create offline sync queue entry
 */
export async function createSyncQueueEntry(
  studentId: string,
  examId: string,
  answers: StudentAnswer[]
): Promise<OfflineSyncQueue> {
  const entry = await queryOne<OfflineSyncQueue>(
    `INSERT INTO offline_sync_queue (student_id, exam_id, answers, sync_status, retry_count)
     VALUES ($1, $2, $3, 'pending', 0)
     RETURNING *`,
    [studentId, examId, JSON.stringify(answers)]
  );

  if (!entry) {
    throw new Error('Failed to create sync queue entry');
  }

  return entry;
}

/**
 * Get pending sync queue entries
 */
export async function getPendingSyncEntries(): Promise<OfflineSyncQueue[]> {
  return queryAll<OfflineSyncQueue>(
    `SELECT * FROM offline_sync_queue 
     WHERE sync_status = 'pending' OR (sync_status = 'failed' AND retry_count < $1)
     ORDER BY created_at ASC`,
    [MAX_RETRIES]
  );
}

/**
 * Update sync queue status
 */
export async function updateSyncQueueStatus(
  studentId: string,
  examId: string,
  status: SyncStatus,
  error?: string
): Promise<void> {
  const query_text =
    status === 'synced'
      ? `UPDATE offline_sync_queue SET sync_status = $1, synced_at = CURRENT_TIMESTAMP
         WHERE student_id = $2 AND exam_id = $3`
      : `UPDATE offline_sync_queue SET sync_status = $1, last_error = $4, retry_count = retry_count + 1
         WHERE student_id = $2 AND exam_id = $3`;

  const params =
    status === 'synced'
      ? [status, studentId, examId]
      : [status, studentId, examId, error || null];

  await query(query_text, params);
}

/**
 * Get sync queue entry by student and exam
 */
export async function getSyncQueueEntry(
  studentId: string,
  examId: string
): Promise<OfflineSyncQueue | null> {
  return queryOne<OfflineSyncQueue>(
    `SELECT * FROM offline_sync_queue WHERE student_id = $1 AND exam_id = $2`,
    [studentId, examId]
  );
}

/**
 * Get sync queue entries by status
 */
export async function getSyncEntriesByStatus(
  status: SyncStatus
): Promise<OfflineSyncQueue[]> {
  return queryAll<OfflineSyncQueue>(
    `SELECT * FROM offline_sync_queue WHERE sync_status = $1 ORDER BY created_at ASC`,
    [status]
  );
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics(): Promise<{
  pending: number;
  synced: number;
  failed: number;
  totalRetries: number;
}> {
  const stats = await queryOne<{
    pending: number;
    synced: number;
    failed: number;
    total_retries: number;
  }>(
    `SELECT
      COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced,
      COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed,
      COALESCE(SUM(retry_count), 0) as total_retries
     FROM offline_sync_queue`
  );

  return {
    pending: stats?.pending || 0,
    synced: stats?.synced || 0,
    failed: stats?.failed || 0,
    totalRetries: stats?.total_retries || 0,
  };
}

/**
 * Retry failed sync entries
 */
export async function retryFailedSyncs(
  tenantId: string
): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  let retried = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const failedEntries = await getSyncEntriesByStatus('failed');

    for (const entry of failedEntries) {
      if (entry.retryCount >= MAX_RETRIES) {
        continue; // Skip entries that have exceeded max retries
      }

      try {
        const answers = JSON.parse(entry.answers as any);
        const result = await syncOfflineAnswers(
          tenantId,
          entry.studentId,
          entry.examId,
          answers,
          entry.createdAt
        );

        retried++;

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error(
          `Error retrying sync for student ${entry.studentId}, exam ${entry.examId}:`,
          error
        );
      }
    }

    return {
      retried,
      succeeded,
      failed,
    };
  } catch (error) {
    console.error('Error retrying failed syncs:', error);
    return {
      retried: 0,
      succeeded: 0,
      failed: 0,
    };
  }
}

/**
 * Clean up old sync entries (older than 30 days)
 */
export async function cleanupOldSyncEntries(): Promise<number> {
  const result = await query(
    `DELETE FROM offline_sync_queue 
     WHERE sync_status = 'synced' AND synced_at < NOW() - INTERVAL '30 days'`
  );

  return result.rowCount || 0;
}
