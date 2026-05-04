/**
 * CBT Database Schema Verification Utility
 * 
 * This utility provides functions to verify that the CBT database schema
 * is correctly set up with all required tables, columns, indexes, and constraints.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Interface for schema verification results
 */
interface SchemaVerificationResult {
  success: boolean;
  timestamp: string;
  checks: {
    tables: TableCheckResult[];
    indexes: IndexCheckResult[];
    constraints: ConstraintCheckResult[];
    foreignKeys: ForeignKeyCheckResult[];
  };
  summary: {
    totalTablesExpected: number;
    totalTablesFound: number;
    totalIndexesExpected: number;
    totalIndexesFound: number;
    allChecksPassed: boolean;
  };
}

interface TableCheckResult {
  tableName: string;
  exists: boolean;
  columnCount: number;
  expectedColumns: string[];
  foundColumns: string[];
  missingColumns: string[];
  extraColumns: string[];
}

interface IndexCheckResult {
  tableName: string;
  indexName: string;
  exists: boolean;
  columns: string[];
}

interface ConstraintCheckResult {
  tableName: string;
  constraintName: string;
  constraintType: string;
  exists: boolean;
}

interface ForeignKeyCheckResult {
  tableName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  exists: boolean;
}

/**
 * Expected schema structure
 */
const EXPECTED_SCHEMA = {
  tables: {
    questions_bank: {
      columns: [
        'id', 'tenantId', 'text', 'type', 'options', 'correctAnswer',
        'difficulty', 'subject', 'tags', 'createdBy', 'createdAt', 'updatedAt', 'deletedAt'
      ],
      indexes: [
        'idx_questions_tenant',
        'idx_questions_subject',
        'idx_questions_difficulty',
        'idx_questions_createdAt'
      ],
      constraints: [
        'questions_bank_pkey',
        'questions_bank_tenantId_fkey',
        'questions_bank_createdBy_fkey'
      ]
    },
    exams: {
      columns: [
        'id', 'tenantId', 'title', 'subject', 'class', 'description',
        'duration', 'passMark', 'totalMarks', 'status', 'scheduledDate',
        'scheduledTime', 'createdBy', 'createdAt', 'updatedAt', 'deletedAt'
      ],
      indexes: [
        'idx_exams_tenant',
        'idx_exams_status',
        'idx_exams_createdAt'
      ],
      constraints: [
        'exams_pkey',
        'exams_tenantId_fkey',
        'exams_createdBy_fkey'
      ]
    },
    exam_questions: {
      columns: [
        'id', 'examId', 'questionId', 'questionOrder', 'marks', 'createdAt'
      ],
      indexes: [
        'idx_exam_questions_exam',
        'idx_exam_questions_questionId'
      ],
      constraints: [
        'exam_questions_pkey',
        'exam_questions_examId_fkey',
        'exam_questions_questionId_fkey',
        'exam_questions_examId_questionId_key'
      ]
    },
    student_exam_progress: {
      columns: [
        'id', 'examId', 'studentId', 'questionsAnswered', 'currentQuestion',
        'status', 'timeRemaining', 'lastActivityTime', 'flagReason', 'flaggedAt',
        'createdAt', 'updatedAt'
      ],
      indexes: [
        'idx_progress_exam',
        'idx_progress_student',
        'idx_progress_status'
      ],
      constraints: [
        'student_exam_progress_pkey',
        'student_exam_progress_examId_fkey',
        'student_exam_progress_studentId_fkey',
        'student_exam_progress_examId_studentId_key'
      ]
    },
    exam_results: {
      columns: [
        'id', 'examId', 'studentId', 'score', 'totalMarks', 'percentage',
        'status', 'timeSpent', 'submittedAt', 'createdAt'
      ],
      indexes: [
        'idx_results_exam',
        'idx_results_student',
        'idx_results_createdAt'
      ],
      constraints: [
        'exam_results_pkey',
        'exam_results_examId_fkey',
        'exam_results_studentId_fkey',
        'exam_results_examId_studentId_key'
      ]
    },
    student_answers: {
      columns: [
        'id', 'resultId', 'questionId', 'studentAnswer', 'correctAnswer',
        'isCorrect', 'marksObtained', 'totalMarks', 'createdAt'
      ],
      indexes: [
        'idx_answers_result',
        'idx_answers_questionId'
      ],
      constraints: [
        'student_answers_pkey',
        'student_answers_resultId_fkey',
        'student_answers_questionId_fkey'
      ]
    },
    security_settings: {
      columns: [
        'id', 'examId', 'enableProctoring', 'disableCopyPaste', 'disableRightClick',
        'requireCamera', 'randomizeQuestions', 'randomizeOptions', 'allowedIps',
        'examPassword', 'createdAt', 'updatedAt'
      ],
      indexes: [
        'idx_security_exam'
      ],
      constraints: [
        'security_settings_pkey',
        'security_settings_examId_fkey',
        'security_settings_examId_key'
      ]
    },
    proctoring_logs: {
      columns: [
        'id', 'examId', 'studentId', 'eventType', 'eventDetails', 'createdAt'
      ],
      indexes: [
        'idx_proctoring_exam',
        'idx_proctoring_studentId',
        'idx_proctoring_createdAt'
      ],
      constraints: [
        'proctoring_logs_pkey',
        'proctoring_logs_examId_fkey',
        'proctoring_logs_studentId_fkey'
      ]
    },
    audit_logs: {
      columns: [
        'id', 'tenantId', 'userId', 'action', 'entityType', 'entityId',
        'changes', 'createdAt'
      ],
      indexes: [
        'idx_audit_tenant',
        'idx_audit_userId',
        'idx_audit_createdAt',
        'idx_audit_entityType'
      ],
      constraints: [
        'audit_logs_pkey',
        'audit_logs_tenantId_fkey',
        'audit_logs_userId_fkey'
      ]
    },
    offline_sync_queue: {
      columns: [
        'id', 'studentId', 'examId', 'tenantId', 'answers', 'syncStatus',
        'createdAt', 'syncedAt'
      ],
      indexes: [
        'idx_sync_student',
        'idx_sync_examId',
        'idx_sync_status',
        'idx_sync_createdAt'
      ],
      constraints: [
        'offline_sync_queue_pkey',
        'offline_sync_queue_studentId_fkey',
        'offline_sync_queue_examId_fkey',
        'offline_sync_queue_tenantId_fkey'
      ]
    }
  }
};

/**
 * Verify all tables exist and have correct structure
 */
async function verifyTables(): Promise<TableCheckResult[]> {
  const results: TableCheckResult[] = [];

  for (const [tableName, expectedSchema] of Object.entries(EXPECTED_SCHEMA.tables)) {
    try {
      // Query to get table columns
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      const foundColumns = columns.map(c => c.column_name);
      const expectedColumns = expectedSchema.columns;
      const missingColumns = expectedColumns.filter(c => !foundColumns.includes(c));
      const extraColumns = foundColumns.filter(c => !expectedColumns.includes(c));

      results.push({
        tableName,
        exists: columns.length > 0,
        columnCount: foundColumns.length,
        expectedColumns,
        foundColumns,
        missingColumns,
        extraColumns
      });
    } catch (error) {
      results.push({
        tableName,
        exists: false,
        columnCount: 0,
        expectedColumns: expectedSchema.columns,
        foundColumns: [],
        missingColumns: expectedSchema.columns,
        extraColumns: []
      });
    }
  }

  return results;
}

/**
 * Verify all indexes exist
 */
async function verifyIndexes(): Promise<IndexCheckResult[]> {
  const results: IndexCheckResult[] = [];

  for (const [tableName, expectedSchema] of Object.entries(EXPECTED_SCHEMA.tables)) {
    for (const indexName of expectedSchema.indexes) {
      try {
        const index = await prisma.$queryRaw<Array<{ indexname: string }>>`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = ${tableName} AND indexname = ${indexName}
        `;

        results.push({
          tableName,
          indexName,
          exists: index.length > 0,
          columns: []
        });
      } catch (error) {
        results.push({
          tableName,
          indexName,
          exists: false,
          columns: []
        });
      }
    }
  }

  return results;
}

/**
 * Verify all constraints exist
 */
async function verifyConstraints(): Promise<ConstraintCheckResult[]> {
  const results: ConstraintCheckResult[] = [];

  for (const [tableName, expectedSchema] of Object.entries(EXPECTED_SCHEMA.tables)) {
    for (const constraintName of expectedSchema.constraints) {
      try {
        const constraint = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = ${tableName} AND constraint_name = ${constraintName}
        `;

        results.push({
          tableName,
          constraintName,
          constraintType: constraintName.includes('_pkey') ? 'PRIMARY KEY' : 
                         constraintName.includes('_fkey') ? 'FOREIGN KEY' : 'UNIQUE',
          exists: constraint.length > 0
        });
      } catch (error) {
        results.push({
          tableName,
          constraintName,
          constraintType: 'UNKNOWN',
          exists: false
        });
      }
    }
  }

  return results;
}

/**
 * Verify all foreign keys are properly configured
 */
async function verifyForeignKeys(): Promise<ForeignKeyCheckResult[]> {
  const results: ForeignKeyCheckResult[] = [];

  try {
    const foreignKeys = await prisma.$queryRaw<Array<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>>`
      SELECT
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name IN (
          'questions_bank', 'exams', 'exam_questions', 'student_exam_progress',
          'exam_results', 'student_answers', 'security_settings', 'proctoring_logs',
          'audit_logs', 'offline_sync_queue'
        )
    `;

    for (const fk of foreignKeys) {
      results.push({
        tableName: fk.table_name,
        columnName: fk.column_name,
        referencedTable: fk.foreign_table_name,
        referencedColumn: fk.foreign_column_name,
        exists: true
      });
    }
  } catch (error) {
    console.error('Error verifying foreign keys:', error);
  }

  return results;
}

/**
 * Run complete schema verification
 */
export async function verifySchema(): Promise<SchemaVerificationResult> {
  const startTime = new Date();

  try {
    const [tables, indexes, constraints, foreignKeys] = await Promise.all([
      verifyTables(),
      verifyIndexes(),
      verifyConstraints(),
      verifyForeignKeys()
    ]);

    const allTablesPassed = tables.every(t => t.exists && t.missingColumns.length === 0);
    const allIndexesPassed = indexes.every(i => i.exists);
    const allConstraintsPassed = constraints.every(c => c.exists);

    return {
      success: allTablesPassed && allIndexesPassed && allConstraintsPassed,
      timestamp: startTime.toISOString(),
      checks: {
        tables,
        indexes,
        constraints,
        foreignKeys
      },
      summary: {
        totalTablesExpected: Object.keys(EXPECTED_SCHEMA.tables).length,
        totalTablesFound: tables.filter(t => t.exists).length,
        totalIndexesExpected: Object.values(EXPECTED_SCHEMA.tables).reduce((sum, t) => sum + t.indexes.length, 0),
        totalIndexesFound: indexes.filter(i => i.exists).length,
        allChecksPassed: allTablesPassed && allIndexesPassed && allConstraintsPassed
      }
    };
  } catch (error) {
    console.error('Schema verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Generate verification report
 */
export async function generateVerificationReport(): Promise<string> {
  const result = await verifySchema();

  let report = '# CBT Database Schema Verification Report\n\n';
  report += `Generated: ${result.timestamp}\n\n`;

  report += '## Summary\n';
  report += `- Total Tables Expected: ${result.summary.totalTablesExpected}\n`;
  report += `- Total Tables Found: ${result.summary.totalTablesFound}\n`;
  report += `- Total Indexes Expected: ${result.summary.totalIndexesExpected}\n`;
  report += `- Total Indexes Found: ${result.summary.totalIndexesFound}\n`;
  report += `- All Checks Passed: ${result.summary.allChecksPassed ? '✓ YES' : '✗ NO'}\n\n`;

  report += '## Table Verification\n';
  for (const table of result.checks.tables) {
    report += `\n### ${table.tableName}\n`;
    report += `- Status: ${table.exists ? '✓ EXISTS' : '✗ MISSING'}\n`;
    report += `- Columns: ${table.columnCount}/${table.expectedColumns.length}\n`;
    if (table.missingColumns.length > 0) {
      report += `- Missing Columns: ${table.missingColumns.join(', ')}\n`;
    }
    if (table.extraColumns.length > 0) {
      report += `- Extra Columns: ${table.extraColumns.join(', ')}\n`;
    }
  }

  report += '\n## Index Verification\n';
  const indexesByTable = result.checks.indexes.reduce((acc, idx) => {
    if (!acc[idx.tableName]) acc[idx.tableName] = [];
    acc[idx.tableName].push(idx);
    return acc;
  }, {} as Record<string, IndexCheckResult[]>);

  for (const [tableName, indexes] of Object.entries(indexesByTable)) {
    const passedCount = indexes.filter(i => i.exists).length;
    report += `\n### ${tableName}\n`;
    report += `- Indexes: ${passedCount}/${indexes.length}\n`;
    for (const idx of indexes) {
      report += `  - ${idx.indexName}: ${idx.exists ? '✓' : '✗'}\n`;
    }
  }

  report += '\n## Constraint Verification\n';
  const constraintsByTable = result.checks.constraints.reduce((acc, con) => {
    if (!acc[con.tableName]) acc[con.tableName] = [];
    acc[con.tableName].push(con);
    return acc;
  }, {} as Record<string, ConstraintCheckResult[]>);

  for (const [tableName, constraints] of Object.entries(constraintsByTable)) {
    const passedCount = constraints.filter(c => c.exists).length;
    report += `\n### ${tableName}\n`;
    report += `- Constraints: ${passedCount}/${constraints.length}\n`;
    for (const con of constraints) {
      report += `  - ${con.constraintName} (${con.constraintType}): ${con.exists ? '✓' : '✗'}\n`;
    }
  }

  report += '\n## Foreign Keys\n';
  report += `- Total Foreign Keys: ${result.checks.foreignKeys.length}\n`;
  for (const fk of result.checks.foreignKeys) {
    report += `- ${fk.tableName}.${fk.columnName} → ${fk.referencedTable}.${fk.referencedColumn}\n`;
  }

  return report;
}

// Export for use in API endpoints
export { SchemaVerificationResult, TableCheckResult, IndexCheckResult, ConstraintCheckResult, ForeignKeyCheckResult };
