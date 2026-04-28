/**
 * Data Encryption Implementation for CBT System
 * Encrypts questions at rest, exam passwords, proctoring logs, and student answers
 * Requirements: 5.1
 */

import {
  encryptData,
  decryptData,
  encryptQuestion,
  decryptQuestion,
  encryptStudentAnswer,
  decryptStudentAnswer,
  encryptStudentAnswers,
  decryptStudentAnswers,
  encryptProctoringLog,
  decryptProctoringLog,
  hashExamPassword,
  verifyExamPassword,
  encryptForTransmission,
  decryptFromTransmission,
  createIntegrityHash,
  verifyIntegrity,
  sanitizeForLogging,
} from './encryption';
import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Encrypt a question before storing in database
 */
export async function encryptQuestionForStorage(
  questionId: string,
  questionText: string,
  options?: string[]
): Promise<{ encryptedText: string; encryptedOptions?: string }> {
  try {
    const encryptedText = encryptQuestion(questionText);

    let encryptedOptions: string | undefined;
    if (options && options.length > 0) {
      const optionsJson = JSON.stringify(options);
      encryptedOptions = encryptData(optionsJson);
    }

    return {
      encryptedText,
      encryptedOptions,
    };
  } catch (error) {
    throw new Error(
      `Failed to encrypt question: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypt a question after retrieving from database
 */
export function decryptQuestionFromStorage(
  encryptedText: string,
  encryptedOptions?: string
): { text: string; options?: string[] } {
  try {
    const text = decryptQuestion(encryptedText);

    let options: string[] | undefined;
    if (encryptedOptions) {
      const optionsJson = decryptData(encryptedOptions);
      options = JSON.parse(optionsJson);
    }

    return {
      text,
      options,
    };
  } catch (error) {
    throw new Error(
      `Failed to decrypt question: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Encrypt student answers before storing
 */
export async function encryptStudentAnswersForStorage(
  answers: Record<string, any>
): Promise<string> {
  try {
    return encryptStudentAnswers(answers);
  } catch (error) {
    throw new Error(
      `Failed to encrypt student answers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypt student answers after retrieving
 */
export function decryptStudentAnswersFromStorage(
  encryptedAnswers: string
): Record<string, any> {
  try {
    return decryptStudentAnswers(encryptedAnswers);
  } catch (error) {
    throw new Error(
      `Failed to decrypt student answers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Encrypt proctoring log details
 */
export async function encryptProctoringLogForStorage(
  logDetails: Record<string, any>
): Promise<string> {
  try {
    return encryptProctoringLog(logDetails);
  } catch (error) {
    throw new Error(
      `Failed to encrypt proctoring log: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypt proctoring log details
 */
export function decryptProctoringLogFromStorage(
  encryptedLog: string
): Record<string, any> {
  try {
    return decryptProctoringLog(encryptedLog);
  } catch (error) {
    throw new Error(
      `Failed to decrypt proctoring log: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Hash an exam password for storage
 */
export async function hashExamPasswordForStorage(
  password: string
): Promise<string> {
  try {
    return await hashExamPassword(password);
  } catch (error) {
    throw new Error(
      `Failed to hash exam password: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Verify an exam password
 */
export async function verifyExamPasswordFromStorage(
  providedPassword: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await verifyExamPassword(providedPassword, storedHash);
  } catch (error) {
    console.error('Failed to verify exam password:', error);
    return false;
  }
}

/**
 * Encrypt data for transmission (in addition to TLS)
 */
export function encryptDataForTransmission(data: string): string {
  try {
    return encryptForTransmission(data);
  } catch (error) {
    throw new Error(
      `Failed to encrypt data for transmission: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypt data received from transmission
 */
export function decryptDataFromTransmission(encryptedData: string): string {
  try {
    return decryptFromTransmission(encryptedData);
  } catch (error) {
    throw new Error(
      `Failed to decrypt data from transmission: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create integrity hash for data verification
 */
export function createDataIntegrityHash(data: string): string {
  try {
    return createIntegrityHash(data);
  } catch (error) {
    throw new Error(
      `Failed to create integrity hash: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Verify data integrity
 */
export function verifyDataIntegrity(data: string, hash: string): boolean {
  try {
    return verifyIntegrity(data, hash);
  } catch (error) {
    console.error('Failed to verify data integrity:', error);
    return false;
  }
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeSensitiveDataForLogging(data: any): any {
  return sanitizeForLogging(data);
}

/**
 * Encrypt all questions in a database for a tenant
 * This is a migration function to encrypt existing questions
 */
export async function encryptAllQuestionsForTenant(
  tenantId: string
): Promise<{ encrypted: number; failed: number; errors: string[] }> {
  const pool = getPool();
  const errors: string[] = [];
  let encrypted = 0;
  let failed = 0;

  try {
    // Get all unencrypted questions
    const result = await pool.query(
      `SELECT id, text, options FROM questions_bank 
       WHERE tenant_id = $1 AND encrypted = false`,
      [tenantId]
    );

    for (const row of result.rows) {
      try {
        const { encryptedText, encryptedOptions } = await encryptQuestionForStorage(
          row.id,
          row.text,
          row.options
        );

        // Update question with encrypted data
        await pool.query(
          `UPDATE questions_bank 
           SET text = $1, options = $2, encrypted = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [encryptedText, encryptedOptions || null, row.id]
        );

        encrypted++;
      } catch (error) {
        failed++;
        errors.push(
          `Failed to encrypt question ${row.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { encrypted, failed, errors };
  } catch (error) {
    throw new Error(
      `Failed to encrypt questions for tenant: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypt all questions in a database for a tenant
 * This is a migration function to decrypt questions (for backup/export)
 */
export async function decryptAllQuestionsForTenant(
  tenantId: string
): Promise<{ decrypted: number; failed: number; errors: string[] }> {
  const pool = getPool();
  const errors: string[] = [];
  let decrypted = 0;
  let failed = 0;

  try {
    // Get all encrypted questions
    const result = await pool.query(
      `SELECT id, text, options FROM questions_bank 
       WHERE tenant_id = $1 AND encrypted = true`,
      [tenantId]
    );

    for (const row of result.rows) {
      try {
        const { text, options } = decryptQuestionFromStorage(row.text, row.options);

        // Update question with decrypted data
        await pool.query(
          `UPDATE questions_bank 
           SET text = $1, options = $2, encrypted = false, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [text, options ? JSON.stringify(options) : null, row.id]
        );

        decrypted++;
      } catch (error) {
        failed++;
        errors.push(
          `Failed to decrypt question ${row.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { decrypted, failed, errors };
  } catch (error) {
    throw new Error(
      `Failed to decrypt questions for tenant: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Encrypt all student answers for an exam
 */
export async function encryptAllStudentAnswersForExam(
  examId: string
): Promise<{ encrypted: number; failed: number; errors: string[] }> {
  const pool = getPool();
  const errors: string[] = [];
  let encrypted = 0;
  let failed = 0;

  try {
    // Get all unencrypted student answers for the exam
    const result = await pool.query(
      `SELECT sa.id, sa.student_answer 
       FROM student_answers sa
       JOIN exam_results er ON sa.result_id = er.id
       WHERE er.exam_id = $1 AND sa.encrypted = false`,
      [examId]
    );

    for (const row of result.rows) {
      try {
        const encryptedAnswer = encryptStudentAnswer(row.student_answer);

        // Update answer with encrypted data
        await pool.query(
          `UPDATE student_answers 
           SET student_answer = $1, encrypted = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [encryptedAnswer, row.id]
        );

        encrypted++;
      } catch (error) {
        failed++;
        errors.push(
          `Failed to encrypt answer ${row.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { encrypted, failed, errors };
  } catch (error) {
    throw new Error(
      `Failed to encrypt student answers for exam: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Encrypt all proctoring logs for an exam
 */
export async function encryptAllProctoringLogsForExam(
  examId: string
): Promise<{ encrypted: number; failed: number; errors: string[] }> {
  const pool = getPool();
  const errors: string[] = [];
  let encrypted = 0;
  let failed = 0;

  try {
    // Get all unencrypted proctoring logs for the exam
    const result = await pool.query(
      `SELECT id, event_details 
       FROM proctoring_logs 
       WHERE exam_id = $1 AND encrypted = false`,
      [examId]
    );

    for (const row of result.rows) {
      try {
        const encryptedDetails = encryptProctoringLog(row.event_details);

        // Update log with encrypted data
        await pool.query(
          `UPDATE proctoring_logs 
           SET event_details = $1, encrypted = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [encryptedDetails, row.id]
        );

        encrypted++;
      } catch (error) {
        failed++;
        errors.push(
          `Failed to encrypt proctoring log ${row.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { encrypted, failed, errors };
  } catch (error) {
    throw new Error(
      `Failed to encrypt proctoring logs for exam: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get encryption status for a tenant
 */
export async function getEncryptionStatus(
  tenantId: string
): Promise<{
  questionsEncrypted: number;
  questionsUnencrypted: number;
  answersEncrypted: number;
  answersUnencrypted: number;
  logsEncrypted: number;
  logsUnencrypted: number;
}> {
  const pool = getPool();

  try {
    // Get question encryption status
    const questionsResult = await pool.query(
      `SELECT 
        SUM(CASE WHEN encrypted = true THEN 1 ELSE 0 END) as encrypted,
        SUM(CASE WHEN encrypted = false THEN 1 ELSE 0 END) as unencrypted
       FROM questions_bank 
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const questionsEncrypted = parseInt(questionsResult.rows[0].encrypted || 0, 10);
    const questionsUnencrypted = parseInt(questionsResult.rows[0].unencrypted || 0, 10);

    // Get answer encryption status
    const answersResult = await pool.query(
      `SELECT 
        SUM(CASE WHEN encrypted = true THEN 1 ELSE 0 END) as encrypted,
        SUM(CASE WHEN encrypted = false THEN 1 ELSE 0 END) as unencrypted
       FROM student_answers 
       WHERE encrypted IS NOT NULL`,
      []
    );

    const answersEncrypted = parseInt(answersResult.rows[0].encrypted || 0, 10);
    const answersUnencrypted = parseInt(answersResult.rows[0].unencrypted || 0, 10);

    // Get log encryption status
    const logsResult = await pool.query(
      `SELECT 
        SUM(CASE WHEN encrypted = true THEN 1 ELSE 0 END) as encrypted,
        SUM(CASE WHEN encrypted = false THEN 1 ELSE 0 END) as unencrypted
       FROM proctoring_logs 
       WHERE encrypted IS NOT NULL`,
      []
    );

    const logsEncrypted = parseInt(logsResult.rows[0].encrypted || 0, 10);
    const logsUnencrypted = parseInt(logsResult.rows[0].unencrypted || 0, 10);

    return {
      questionsEncrypted,
      questionsUnencrypted,
      answersEncrypted,
      answersUnencrypted,
      logsEncrypted,
      logsUnencrypted,
    };
  } catch (error) {
    throw new Error(
      `Failed to get encryption status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
