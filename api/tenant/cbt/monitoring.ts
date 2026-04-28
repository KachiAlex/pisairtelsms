import { Router, Request, Response } from 'express';
import {
  getExamMonitoring,
  updateStudentProgress,
  recordExamCompletion,
  flagStudent,
  getFilteredMonitoring,
  getStudentProgress,
  pauseStudentExam,
  resumeStudentExam,
  getProgressHistory,
  ProgressUpdateInput,
  CompletionInput,
  FlagInput,
  MonitoringFilter,
} from './_lib/monitoring';

const router = Router();

/**
 * GET /api/tenant/cbt/monitoring/:examId
 * Get all student progress for an exam
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

    const monitoringData = await getExamMonitoring(examId, tenantId);
    res.json(monitoringData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/tenant/cbt/monitoring/:examId/student/:studentId
 * Get individual student progress
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

    const progress = await getStudentProgress(examId, studentId, tenantId);
    res.json(progress);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/progress
 * Update student progress during exam
 */
router.put(
  '/:examId/student/:studentId/progress',
  async (req: Request, res: Response) => {
    try {
      const { examId, studentId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;
      const { questionsAnswered, currentQuestionIndex, timeRemaining } =
        req.body;

      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant ID' });
      }

      if (!examId || !studentId) {
        return res
          .status(400)
          .json({ error: 'Missing exam ID or student ID' });
      }

      // Validate input
      if (
        typeof questionsAnswered !== 'number' ||
        typeof currentQuestionIndex !== 'number' ||
        typeof timeRemaining !== 'number'
      ) {
        return res.status(400).json({
          error:
            'Invalid input: questionsAnswered, currentQuestionIndex, and timeRemaining must be numbers',
        });
      }

      if (questionsAnswered < 0 || currentQuestionIndex < 0 || timeRemaining < 0) {
        return res.status(400).json({
          error: 'Invalid input: values cannot be negative',
        });
      }

      const input: ProgressUpdateInput = {
        examId,
        studentId,
        questionsAnswered,
        currentQuestionIndex,
        timeRemaining,
      };

      const progress = await updateStudentProgress(input, tenantId);
      res.json(progress);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /api/tenant/cbt/monitoring/:examId/student/:studentId/complete
 * Record exam completion
 */
router.post(
  '/:examId/student/:studentId/complete',
  async (req: Request, res: Response) => {
    try {
      const { examId, studentId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;
      const { timeSpent } = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant ID' });
      }

      if (!examId || !studentId) {
        return res
          .status(400)
          .json({ error: 'Missing exam ID or student ID' });
      }

      if (typeof timeSpent !== 'number' || timeSpent < 0) {
        return res.status(400).json({
          error: 'Invalid input: timeSpent must be a non-negative number',
        });
      }

      const input: CompletionInput = {
        examId,
        studentId,
        timeSpent,
      };

      await recordExamCompletion(input, tenantId);
      res.json({ success: true, message: 'Exam completion recorded' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag
 * Flag a student during exam
 */
router.put(
  '/:examId/student/:studentId/flag',
  async (req: Request, res: Response) => {
    try {
      const { examId, studentId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;
      const { reason } = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant ID' });
      }

      if (!examId || !studentId) {
        return res
          .status(400)
          .json({ error: 'Missing exam ID or student ID' });
      }

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({
          error: 'Invalid input: reason must be a non-empty string',
        });
      }

      const input: FlagInput = {
        examId,
        studentId,
        reason,
      };

      const flaggedStudent = await flagStudent(input, tenantId);
      res.json(flaggedStudent);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/pause
 * Pause student exam
 */
router.put(
  '/:examId/student/:studentId/pause',
  async (req: Request, res: Response) => {
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

      const pausedStudent = await pauseStudentExam(examId, studentId, tenantId);
      res.json(pausedStudent);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/resume
 * Resume student exam
 */
router.put(
  '/:examId/student/:studentId/resume',
  async (req: Request, res: Response) => {
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

      const resumedStudent = await resumeStudentExam(examId, studentId, tenantId);
      res.json(resumedStudent);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/tenant/cbt/monitoring/:examId/student/:studentId/history
 * Get progress history for a student
 */
router.get(
  '/:examId/student/:studentId/history',
  async (req: Request, res: Response) => {
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

      const history = await getProgressHistory(examId, studentId, tenantId);
      res.json(history);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/tenant/cbt/monitoring/filtered
 * Get filtered monitoring data
 */
router.get('/filtered', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { examId, class: examClass, status } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }

    const filter: MonitoringFilter = {};

    if (examId && typeof examId === 'string') {
      filter.examId = examId;
    }

    if (examClass && typeof examClass === 'string') {
      filter.class = examClass;
    }

    if (
      status &&
      typeof status === 'string' &&
      ['Active', 'Completed', 'Paused', 'Flagged'].includes(status)
    ) {
      filter.status = status as 'Active' | 'Completed' | 'Paused' | 'Flagged';
    }

    const results = await getFilteredMonitoring(filter, tenantId);
    res.json(results);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

export default router;
