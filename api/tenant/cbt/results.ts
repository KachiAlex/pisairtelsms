import { Router, Request, Response } from 'express';
import {
  getResultsSummary,
  getExamResultsSummary,
  getExamResults,
  getStudentResult,
  getFilteredResults,
  getResultsAnalytics,
  ResultsFilter,
  PaginationParams,
} from './_lib/results';
import {
  exportResultsAsCSV,
  exportResultsAsPDF,
  generateExportFilename,
  ExportFormat,
  ExportOptions,
} from './_lib/export';

const router = Router();

/**
 * GET /api/tenant/cbt/results
 * Get all exam results summary with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (page < 1 || pageSize < 1) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const pagination: PaginationParams = { page, pageSize };
    const { results, total } = await getResultsSummary(tenantId, pagination);

    res.json({
      results,
      pagination: { page, pageSize, total },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/tenant/cbt/results/:examId
 * Get exam-specific results summary
 */
router.get('/:examId', async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (!examId) {
      return res.status(400).json({ error: 'Missing exam ID' });
    }

    const summary = await getExamResultsSummary(examId, tenantId);
    res.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/tenant/cbt/results/:examId/students
 * Get all student results for an exam
 */
router.get('/:examId/students', async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (!examId) {
      return res.status(400).json({ error: 'Missing exam ID' });
    }

    if (page < 1 || pageSize < 1) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const pagination: PaginationParams = { page, pageSize };
    const { results, total } = await getExamResults(examId, tenantId, pagination);

    res.json({
      results,
      pagination: { page, pageSize, total },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/tenant/cbt/results/:examId/student/:studentId
 * Get detailed student result with answers
 */
router.get('/:examId/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { examId, studentId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (!examId || !studentId) {
      return res
        .status(400)
        .json({ error: 'Missing exam ID or student ID' });
    }

    const result = await getStudentResult(examId, studentId, tenantId);
    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/tenant/cbt/results/filtered
 * Get filtered results
 */
router.get('/filtered', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (page < 1 || pageSize < 1) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const filter: ResultsFilter = {};

    if (req.query.examId && typeof req.query.examId === 'string') {
      filter.examId = req.query.examId;
    }

    if (req.query.dateFrom && typeof req.query.dateFrom === 'string') {
      filter.dateFrom = req.query.dateFrom;
    }

    if (req.query.dateTo && typeof req.query.dateTo === 'string') {
      filter.dateTo = req.query.dateTo;
    }

    if (req.query.minScore && typeof req.query.minScore === 'string') {
      filter.minScore = parseInt(req.query.minScore, 10);
    }

    if (req.query.maxScore && typeof req.query.maxScore === 'string') {
      filter.maxScore = parseInt(req.query.maxScore, 10);
    }

    if (
      req.query.status &&
      typeof req.query.status === 'string' &&
      ['Pass', 'Fail'].includes(req.query.status)
    ) {
      filter.status = req.query.status as 'Pass' | 'Fail';
    }

    const pagination: PaginationParams = { page, pageSize };
    const { results, total } = await getFilteredResults(filter, tenantId, pagination);

    res.json({
      results,
      pagination: { page, pageSize, total },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/tenant/cbt/results/:examId/analytics
 * Get analytics for exam results
 */
router.get('/:examId/analytics', async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (!examId) {
      return res.status(400).json({ error: 'Missing exam ID' });
    }

    const analytics = await getResultsAnalytics(examId, tenantId);
    res.json(analytics);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/tenant/cbt/results/export
 * Export exam results to CSV or PDF
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const examId = req.query.examId as string;
    const format = (req.query.format as string) || 'csv';
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const status = req.query.status as 'Pass' | 'Fail' | undefined;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    if (!examId) {
      return res.status(400).json({ error: 'Missing exam ID' });
    }

    // Validate format
    if (format !== 'csv' && format !== 'pdf') {
      return res.status(400).json({ error: 'Invalid format. Must be csv or pdf' });
    }

    // Validate status if provided
    if (status && status !== 'Pass' && status !== 'Fail') {
      return res.status(400).json({ error: 'Invalid status. Must be Pass or Fail' });
    }

    const exportOptions: ExportOptions = {
      format: format as ExportFormat,
      examId,
      dateFrom,
      dateTo,
      status,
    };

    const filename = generateExportFilename(format as ExportFormat, examId);

    if (format === 'csv') {
      const csvContent = await exportResultsAsCSV(examId, tenantId, exportOptions);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } else if (format === 'pdf') {
      const pdfBuffer = await exportResultsAsPDF(examId, tenantId, exportOptions);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

export default router;
