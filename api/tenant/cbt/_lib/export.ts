import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Export format type
 */
export type ExportFormat = 'csv' | 'pdf';

/**
 * Export options interface
 */
export interface ExportOptions {
  format: ExportFormat;
  examId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'Pass' | 'Fail';
}

/**
 * Export result interface
 */
export interface ExportResult {
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'Pass' | 'Fail';
  submittedAt: string;
}

/**
 * Export results as CSV
 */
export async function exportResultsAsCSV(
  examId: string,
  tenantId: string,
  options?: Partial<ExportOptions>
): Promise<string> {
  const pool = getPool();

  try {
    // Verify exam exists
    const examResult = await pool.query(
      `SELECT id, title, pass_mark, total_marks FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Build query for results
    let query = `
      SELECT 
        er.student_id, er.student_name, er.score, er.time_spent, er.submitted_at
      FROM exam_results er
      WHERE er.exam_id = $1 AND er.tenant_id = $2
    `;

    const params: any[] = [examId, tenantId];
    let paramIndex = 3;

    // Apply filters if provided
    if (options?.dateFrom) {
      query += ` AND er.submitted_at >= $${paramIndex}`;
      params.push(options.dateFrom);
      paramIndex++;
    }

    if (options?.dateTo) {
      query += ` AND er.submitted_at <= $${paramIndex}`;
      params.push(options.dateTo);
      paramIndex++;
    }

    query += ` ORDER BY er.submitted_at DESC`;

    const resultsResult = await pool.query(query, params);

    // Build CSV content
    const csvLines: string[] = [];

    // Add header
    csvLines.push('Student ID,Student Name,Score,Total Marks,Percentage,Status,Submitted At');

    // Add data rows
    for (const row of resultsResult.rows) {
      const percentage = exam.total_marks > 0 ? Math.round((row.score / exam.total_marks) * 100) : 0;
      const status = row.score >= exam.pass_mark ? 'Pass' : 'Fail';

      // Apply status filter if provided
      if (options?.status && status !== options.status) {
        continue;
      }

      // Escape CSV values
      const studentId = escapeCsvValue(row.student_id);
      const studentName = escapeCsvValue(row.student_name);
      const submittedAt = escapeCsvValue(row.submitted_at);

      csvLines.push(
        `${studentId},${studentName},${row.score},${exam.total_marks},${percentage},${status},${submittedAt}`
      );
    }

    return csvLines.join('\n');
  } catch (error) {
    throw new Error(
      `Failed to export results as CSV: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Export results as PDF
 */
export async function exportResultsAsPDF(
  examId: string,
  tenantId: string,
  options?: Partial<ExportOptions>
): Promise<Buffer> {
  const pool = getPool();

  try {
    // Verify exam exists
    const examResult = await pool.query(
      `SELECT id, title, pass_mark, total_marks FROM exams 
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const exam = examResult.rows[0];

    // Build query for results
    let query = `
      SELECT 
        er.student_id, er.student_name, er.score, er.time_spent, er.submitted_at
      FROM exam_results er
      WHERE er.exam_id = $1 AND er.tenant_id = $2
    `;

    const params: any[] = [examId, tenantId];
    let paramIndex = 3;

    // Apply filters if provided
    if (options?.dateFrom) {
      query += ` AND er.submitted_at >= $${paramIndex}`;
      params.push(options.dateFrom);
      paramIndex++;
    }

    if (options?.dateTo) {
      query += ` AND er.submitted_at <= $${paramIndex}`;
      params.push(options.dateTo);
      paramIndex++;
    }

    query += ` ORDER BY er.submitted_at DESC`;

    const resultsResult = await pool.query(query, params);

    // Filter by status if provided
    let filteredResults = resultsResult.rows;
    if (options?.status) {
      filteredResults = resultsResult.rows.filter((row) => {
        const status = row.score >= exam.pass_mark ? 'Pass' : 'Fail';
        return status === options.status;
      });
    }

    // Generate PDF content as HTML (simple text-based PDF)
    // For a production system, you would use a library like pdfkit or puppeteer
    let pdfContent = generatePDFContent(exam, filteredResults);

    // Convert HTML to Buffer (simplified - in production use pdfkit or similar)
    const buffer = Buffer.from(pdfContent, 'utf-8');

    return buffer;
  } catch (error) {
    throw new Error(
      `Failed to export results as PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate PDF content as HTML
 */
function generatePDFContent(exam: any, results: any[]): string {
  const timestamp = new Date().toLocaleString();

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Exam Results Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .header { margin-bottom: 20px; }
    .info { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Exam Results Report</h1>
    <div class="info"><strong>Exam Title:</strong> ${escapeHtml(exam.title)}</div>
    <div class="info"><strong>Total Marks:</strong> ${exam.total_marks}</div>
    <div class="info"><strong>Pass Mark:</strong> ${exam.pass_mark}</div>
    <div class="info"><strong>Generated:</strong> ${timestamp}</div>
    <div class="info"><strong>Total Results:</strong> ${results.length}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Student ID</th>
        <th>Student Name</th>
        <th>Score</th>
        <th>Percentage</th>
        <th>Status</th>
        <th>Submitted At</th>
      </tr>
    </thead>
    <tbody>
`;

  for (const row of results) {
    const percentage = exam.total_marks > 0 ? Math.round((row.score / exam.total_marks) * 100) : 0;
    const status = row.score >= exam.pass_mark ? 'Pass' : 'Fail';

    html += `
      <tr>
        <td>${escapeHtml(row.student_id)}</td>
        <td>${escapeHtml(row.student_name)}</td>
        <td>${row.score}</td>
        <td>${percentage}%</td>
        <td>${status}</td>
        <td>${escapeHtml(row.submitted_at)}</td>
      </tr>
`;
  }

  html += `
    </tbody>
  </table>
</body>
</html>
`;

  return html;
}

/**
 * Generate export filename
 */
export function generateExportFilename(format: ExportFormat, examId: string): string {
  const date = new Date().toISOString().split('T')[0];
  const extension = format === 'csv' ? 'csv' : 'pdf';
  return `exam-results-${date}.${extension}`;
}

/**
 * Escape CSV value
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Escape HTML value
 */
function escapeHtml(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const stringValue = String(value);

  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
