/**
 * CSV Import/Export API Endpoints
 * POST /api/tenant/cbt/questions/import - Import questions from CSV
 * GET /api/tenant/cbt/questions/export - Export questions to CSV
 * GET /api/tenant/cbt/questions/template - Get CSV template
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  importQuestionsFromCSV,
  generateCSVFromQuestions,
  generateCSVTemplate,
  validateCSVFormat,
  getImportStatistics,
  type ExportOptions,
  type ImportResult,
} from './_lib/csv';

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Get tenant ID from query or headers
  const tenantId = (req.query.tenantId as string) || req.headers['x-tenant-id'] as string;
  const userId = (req.headers['x-user-id'] as string) || 'system';

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID is required',
    });
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'import':
        return handleImport(req, res, tenantId, userId);
      case 'export':
        return handleExport(req, res, tenantId);
      case 'template':
        return handleTemplate(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: import, export, or template',
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('CSV API error:', errorMessage);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Handle CSV import
 */
async function handleImport(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string,
  userId: string
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST',
    });
  }

  const { csvContent, skipDuplicates, stopOnError } = req.body;

  if (!csvContent || typeof csvContent !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'CSV content is required',
    });
  }

  // Validate CSV format
  const formatValidation = validateCSVFormat(csvContent);
  if (!formatValidation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid CSV format',
      data: {
        errors: formatValidation.errors,
      },
    });
  }

  try {
    // Import questions
    const result = await importQuestionsFromCSV(pool, tenantId, userId, csvContent, {
      skipDuplicates: skipDuplicates !== false,
      stopOnError: stopOnError === true,
    });

    // Get statistics
    const stats = getImportStatistics(result);

    const statusCode = result.success ? 200 : 207; // 207 Partial Content for partial success

    return res.status(statusCode).json({
      success: result.success,
      data: {
        ...result,
        statistics: stats,
      },
      message: result.message,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: `Import failed: ${errorMessage}`,
    });
  }
}

/**
 * Handle CSV export
 */
async function handleExport(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  tenantId: string
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET',
    });
  }

  try {
    const options: ExportOptions = {
      questionIds: req.query.questionIds
        ? (req.query.questionIds as string).split(',')
        : undefined,
      subject: req.query.subject as string,
      difficulty: req.query.difficulty as string,
      type: req.query.type as string,
    };

    // Generate CSV
    const csvContent = await generateCSVFromQuestions(pool, tenantId, options);

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="questions.csv"');

    return res.status(200).send(csvContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: `Export failed: ${errorMessage}`,
    });
  }
}

/**
 * Handle CSV template request
 */
async function handleTemplate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET',
    });
  }

  try {
    const template = generateCSVTemplate();

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="questions-template.csv"');

    return res.status(200).send(template);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: `Template generation failed: ${errorMessage}`,
    });
  }
}
