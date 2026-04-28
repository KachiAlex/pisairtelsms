/**
 * Duplicate Detection Service
 * Detects duplicate questions before adding to bank
 * Requirements: 8.5
 */

import { Pool } from 'pg';
import crypto from 'crypto';

/**
 * Duplicate detection result
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingQuestion?: {
    id: string;
    text: string;
    subject: string;
    difficulty: string;
    createdAt: Date;
  };
  similarity?: number;
}

/**
 * Calculate hash of question content for exact duplicate detection
 */
export function calculateQuestionHash(
  text: string,
  correctAnswer: string,
  type: string
): string {
  const content = `${text.toLowerCase().trim()}|${correctAnswer.toLowerCase().trim()}|${type}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Calculate similarity between two strings (Levenshtein distance)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return costs[s2.length];
}

/**
 * Check for exact duplicate questions
 */
export async function checkExactDuplicate(
  pool: Pool,
  tenantId: string,
  text: string,
  correctAnswer: string,
  type: string
): Promise<DuplicateCheckResult> {
  try {
    const hash = calculateQuestionHash(text, correctAnswer, type);

    const result = await pool.query(
      `SELECT id, text, subject, difficulty, created_at
       FROM questions_bank
       WHERE tenant_id = $1
       AND text = $2
       AND correct_answer = $3
       AND type = $4
       AND deleted_at IS NULL
       LIMIT 1`,
      [tenantId, text, correctAnswer, type]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        isDuplicate: true,
        existingQuestion: {
          id: row.id,
          text: row.text,
          subject: row.subject,
          difficulty: row.difficulty,
          createdAt: row.created_at,
        },
        similarity: 1,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking for exact duplicate:', error);
    return { isDuplicate: false };
  }
}

/**
 * Check for similar questions (potential duplicates)
 */
export async function checkSimilarQuestions(
  pool: Pool,
  tenantId: string,
  text: string,
  correctAnswer: string,
  similarityThreshold: number = 0.85
): Promise<DuplicateCheckResult[]> {
  try {
    const result = await pool.query(
      `SELECT id, text, subject, difficulty, correct_answer, created_at
       FROM questions_bank
       WHERE tenant_id = $1
       AND deleted_at IS NULL
       LIMIT 100`,
      [tenantId]
    );

    const similarQuestions: DuplicateCheckResult[] = [];

    for (const row of result.rows) {
      const similarity = calculateSimilarity(text, row.text);

      if (similarity >= similarityThreshold) {
        similarQuestions.push({
          isDuplicate: similarity === 1,
          existingQuestion: {
            id: row.id,
            text: row.text,
            subject: row.subject,
            difficulty: row.difficulty,
            createdAt: row.created_at,
          },
          similarity,
        });
      }
    }

    return similarQuestions;
  } catch (error) {
    console.error('Error checking for similar questions:', error);
    return [];
  }
}

/**
 * Check for duplicate questions in exam
 */
export async function checkDuplicateInExam(
  pool: Pool,
  examId: string,
  questionId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM exam_questions
       WHERE exam_id = $1
       AND question_id = $2`,
      [examId, questionId]
    );

    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    console.error('Error checking for duplicate in exam:', error);
    return false;
  }
}

/**
 * Get duplicate questions in question bank
 */
export async function getDuplicateQuestions(
  pool: Pool,
  tenantId: string
): Promise<Array<{ questionId: string; duplicateCount: number }>> {
  try {
    const result = await pool.query(
      `SELECT text, correct_answer, type, COUNT(*) as duplicate_count
       FROM questions_bank
       WHERE tenant_id = $1
       AND deleted_at IS NULL
       GROUP BY text, correct_answer, type
       HAVING COUNT(*) > 1`,
      [tenantId]
    );

    return result.rows.map((row) => ({
      questionId: row.text,
      duplicateCount: parseInt(row.duplicate_count, 10),
    }));
  } catch (error) {
    console.error('Error getting duplicate questions:', error);
    return [];
  }
}

/**
 * Warn user about potential duplicates
 */
export interface DuplicateWarning {
  type: 'exact' | 'similar';
  message: string;
  existingQuestion: {
    id: string;
    text: string;
    subject: string;
    difficulty: string;
  };
  similarity?: number;
}

/**
 * Generate duplicate warning message
 */
export function generateDuplicateWarning(
  checkResult: DuplicateCheckResult
): DuplicateWarning | null {
  if (!checkResult.existingQuestion) {
    return null;
  }

  const type = checkResult.similarity === 1 ? 'exact' : 'similar';
  const similarityPercent = checkResult.similarity
    ? Math.round(checkResult.similarity * 100)
    : 0;

  const message =
    type === 'exact'
      ? `An identical question already exists in the bank (Subject: ${checkResult.existingQuestion.subject}, Difficulty: ${checkResult.existingQuestion.difficulty}). Do you want to add it anyway?`
      : `A similar question (${similarityPercent}% match) already exists in the bank. Do you want to add it anyway?`;

  return {
    type,
    message,
    existingQuestion: {
      id: checkResult.existingQuestion.id,
      text: checkResult.existingQuestion.text,
      subject: checkResult.existingQuestion.subject,
      difficulty: checkResult.existingQuestion.difficulty,
    },
    similarity: checkResult.similarity,
  };
}
