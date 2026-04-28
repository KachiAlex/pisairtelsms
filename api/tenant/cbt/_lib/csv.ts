/**
 * CSV Import/Export Service for Questions
 * Handles CSV parsing, validation, and batch operations
 */

import { Pool } from 'pg';
import Papa from 'papaparse';
import { createQuestion, checkDuplicateQuestion, type CreateQuestionInput } from './questions';
import { invalidateStatisticsCache } from './statistics';

export interface CSVRow {
  text?: string;
  type?: string;
  options?: string;
  correct_answer?: string;
  difficulty?: string;
  subject?: string;
  tags?: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  errors: Array<{
    rowNumber: number;
    data: CSVRow;
    error: string;
  }>;
  duplicates: Array<{
    rowNumber: number;
    data: CSVRow;
    existingQuestionId: string;
  }>;
  importedQuestionIds: string[];
  message: string;
}

export interface ExportOptions {
  questionIds?: string[];
  subject?: string;
  difficulty?: string;
  type?: string;
}

/**
 * Parse CSV content
 */
export function parseCSV(csvContent: string): CSVRow[] {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        resolve(results.data);
      },
      error: (error: any) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Validate a single question row
 */
export function validateQuestionRow(row: CSVRow, rowNumber: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.text || row.text.trim().length === 0) {
    errors.push('Question text is required');
  }

  if (!row.type || !['objective', 'truefalse', 'essay'].includes(row.type)) {
    errors.push(`Invalid question type: ${row.type}. Must be one of: objective, truefalse, essay`);
  }

  if (row.type !== 'essay') {
    if (!row.options || row.options.trim().length === 0) {
      errors.push('Options are required for objective and true/false questions');
    } else {
      const optionsArray = row.options.split('|').map(o => o.trim());
      if (optionsArray.length < 2) {
        errors.push('At least 2 options are required');
      }
    }
  }

  if (!row.correct_answer || row.correct_answer.trim().length === 0) {
    errors.push('Correct answer is required');
  }

  if (!row.difficulty || !['Easy', 'Medium', 'Hard'].includes(row.difficulty)) {
    errors.push(`Invalid difficulty: ${row.difficulty}. Must be one of: Easy, Medium, Hard`);
  }

  if (!row.subject || row.subject.trim().length === 0) {
    errors.push('Subject is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert CSV row to CreateQuestionInput
 */
export function rowToQuestionInput(row: CSVRow): CreateQuestionInput {
  const options = row.type !== 'essay' && row.options ? row.options.split('|').map(o => o.trim()) : undefined;
  const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : undefined;

  return {
    text: row.text!.trim(),
    type: row.type as 'objective' | 'truefalse' | 'essay',
    options,
    correct_answer: row.correct_answer!.trim(),
    difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
    subject: row.subject!.trim(),
    tags,
  };
}

/**
 * Import questions from CSV
 */
export async function importQuestionsFromCSV(
  pool: Pool,
  tenantId: string,
  userId: string,
  csvContent: string,
  options?: {
    skipDuplicates?: boolean;
    stopOnError?: boolean;
  }
): Promise<ImportResult> {
  const skipDuplicates = options?.skipDuplicates ?? true;
  const stopOnError = options?.stopOnError ?? false;

  try {
    // Parse CSV
    const rows = await parseCSV(csvContent);

    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errors: [],
      duplicates: [],
      importedQuestionIds: [],
      message: '',
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because of header row and 1-based indexing

      // Validate row
      const validation = validateQuestionRow(row, rowNumber);
      if (!validation.valid) {
        result.failureCount++;
        result.errors.push({
          rowNumber,
          data: row,
          error: validation.errors.join('; '),
        });

        if (stopOnError) {
          result.success = false;
          break;
        }
        continue;
      }

      try {
        // Check for duplicates
        const duplicate = await checkDuplicateQuestion(pool, tenantId, row.text!, row.correct_answer!);
        if (duplicate) {
          result.duplicateCount++;
          result.duplicates.push({
            rowNumber,
            data: row,
            existingQuestionId: duplicate.id,
          });

          if (!skipDuplicates) {
            result.failureCount++;
            result.errors.push({
              rowNumber,
              data: row,
              error: 'Duplicate question already exists',
            });
          }
          continue;
        }

        // Create question
        const input = rowToQuestionInput(row);
        const question = await createQuestion(pool, tenantId, userId, input);
        result.successCount++;
        result.importedQuestionIds.push(question.id);
      } catch (error) {
        result.failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          rowNumber,
          data: row,
          error: errorMessage,
        });

        if (stopOnError) {
          result.success = false;
          break;
        }
      }
    }

    // Invalidate cache
    if (result.successCount > 0) {
      invalidateStatisticsCache(tenantId);
    }

    // Generate message
    result.message = `Import completed: ${result.successCount} questions imported, ${result.duplicateCount} duplicates found, ${result.failureCount} errors`;

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      totalRows: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errors: [
        {
          rowNumber: 0,
          data: {},
          error: errorMessage,
        },
      ],
      duplicates: [],
      importedQuestionIds: [],
      message: `Import failed: ${errorMessage}`,
    };
  }
}

/**
 * Generate CSV content from questions
 */
export async function generateCSVFromQuestions(
  pool: Pool,
  tenantId: string,
  options?: ExportOptions
): Promise<string> {
  let query = `
    SELECT id, text, type, options, correct_answer, difficulty, subject, tags
    FROM questions_bank
    WHERE tenant_id = $1 AND deleted_at IS NULL
  `;

  const params: any[] = [tenantId];
  let paramIndex = 2;

  // Apply filters
  if (options?.questionIds && options.questionIds.length > 0) {
    query += ` AND id = ANY($${paramIndex}::uuid[])`;
    params.push(options.questionIds);
    paramIndex++;
  }

  if (options?.subject) {
    query += ` AND subject = $${paramIndex}`;
    params.push(options.subject);
    paramIndex++;
  }

  if (options?.difficulty) {
    query += ` AND difficulty = $${paramIndex}`;
    params.push(options.difficulty);
    paramIndex++;
  }

  if (options?.type) {
    query += ` AND type = $${paramIndex}`;
    params.push(options.type);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC`;

  const result = await pool.query(query, params);

  // Convert to CSV format
  const rows = result.rows.map(row => ({
    text: row.text,
    type: row.type,
    options: row.options ? JSON.parse(row.options).join('|') : '',
    correct_answer: row.correct_answer,
    difficulty: row.difficulty,
    subject: row.subject,
    tags: row.tags ? JSON.parse(row.tags).join(',') : '',
  }));

  // Generate CSV using Papa Parse
  const csv = Papa.unparse(rows);
  return csv;
}

/**
 * Generate CSV template
 */
export function generateCSVTemplate(): string {
  const template = [
    {
      text: 'What is the capital of France?',
      type: 'objective',
      options: 'Paris|London|Berlin|Madrid',
      correct_answer: 'Paris',
      difficulty: 'Easy',
      subject: 'Geography',
      tags: 'capitals,europe',
    },
    {
      text: 'The Earth is flat.',
      type: 'truefalse',
      options: 'True|False',
      correct_answer: 'False',
      difficulty: 'Easy',
      subject: 'Science',
      tags: 'earth,science',
    },
    {
      text: 'Explain the theory of evolution.',
      type: 'essay',
      options: '',
      correct_answer: 'Sample answer about evolution',
      difficulty: 'Hard',
      subject: 'Biology',
      tags: 'evolution,biology',
    },
  ];

  return Papa.unparse(template);
}

/**
 * Validate CSV format
 */
export function validateCSVFormat(csvContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    errors.push('CSV content is empty');
    return { valid: false, errors };
  }

  // Check for required headers
  const lines = csvContent.split('\n');
  if (lines.length === 0) {
    errors.push('CSV file is empty');
    return { valid: false, errors };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['text', 'type', 'correct_answer', 'difficulty', 'subject'];

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      errors.push(`Missing required column: ${header}`);
    }
  }

  if (lines.length < 2) {
    errors.push('CSV file must contain at least one data row');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get CSV import statistics
 */
export function getImportStatistics(result: ImportResult): {
  successRate: number;
  duplicateRate: number;
  errorRate: number;
} {
  const total = result.totalRows;

  return {
    successRate: total > 0 ? Math.round((result.successCount / total) * 100) : 0,
    duplicateRate: total > 0 ? Math.round((result.duplicateCount / total) * 100) : 0,
    errorRate: total > 0 ? Math.round((result.failureCount / total) * 100) : 0,
  };
}
