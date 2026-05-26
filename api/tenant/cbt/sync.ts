/**
 * Offline Sync API Endpoints
 * Handles synchronization of offline exam answers
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import { v4 as uuidv4 } from 'uuid'
import {
  syncOfflineAnswers,
  createSyncQueueEntry,
  getSyncQueueEntry,
  getSyncStatistics,
  retryFailedSyncs,
} from './_lib/sync.js'
import { queryOne } from './_lib/db.js'
import type { ApiResponse } from './_lib/types.js'

/**
 * Parse request body
 */
function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
}

/**
 * Method not allowed response
 */
function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

/**
 * Validate tenant ID
 */
function validateTenantId(tenantId: string | undefined, res: VercelResponse): boolean {
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header is required' })
    return false
  }
  return true
}

/**
 * Validate user ID
 */
function validateUserId(userId: string | undefined, res: VercelResponse): boolean {
  if (!userId) {
    res.status(401).json({ error: 'x-user-id header is required' })
    return false
  }
  return true
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string
  const { action, studentId, examId } = req.query

  // Validate headers
  if (!validateTenantId(tenantId, res)) {
    return
  }

  if (!validateUserId(userId, res)) {
    return
  }

  // Verify user exists
  try {
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    )

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      })
    }
  } catch (error) {
    console.error('Error verifying user:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }

  // POST /api/tenant/cbt/sync
  if (req.method === 'POST' && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { studentId: bodyStudentId, examId: bodyExamId, answers, timestamp } = body

    // Validate input
    if (!bodyStudentId || typeof bodyStudentId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          studentId: 'Student ID is required and must be a string',
        },
      })
    }

    if (!bodyExamId || typeof bodyExamId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          examId: 'Exam ID is required and must be a string',
        },
      })
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          answers: 'Answers must be an array',
        },
      })
    }

    if (answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          answers: 'At least one answer is required',
        },
      })
    }

    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          timestamp: 'Valid timestamp is required',
        },
      })
    }

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [bodyExamId]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({
          success: false,
          error: 'Exam not found',
        })
      }

      // Verify student exists
      const student = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE id = $1',
        [bodyStudentId]
      )

      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Student not found',
        })
      }

      // Sync answers
      const result = await syncOfflineAnswers(
        tenantId,
        bodyStudentId,
        bodyExamId,
        answers,
        new Date(timestamp)
      )

      const response: ApiResponse<any> = {
        success: result.success,
        data: {
          synced: result.synced,
          conflicts: result.conflicts,
          failed: result.failed,
          errors: result.errors,
        },
        requestId: uuidv4(),
      }

      return res.status(result.success ? 200 : 207).json(response)
    } catch (error) {
      console.error('Error syncing offline answers:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to sync offline answers',
      })
    }
  }

  // POST /api/tenant/cbt/sync/queue
  if (req.method === 'POST' && action === 'queue') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { studentId: bodyStudentId, examId: bodyExamId, answers } = body

    // Validate input
    if (!bodyStudentId || typeof bodyStudentId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          studentId: 'Student ID is required and must be a string',
        },
      })
    }

    if (!bodyExamId || typeof bodyExamId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          examId: 'Exam ID is required and must be a string',
        },
      })
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          answers: 'Answers must be an array',
        },
      })
    }

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [bodyExamId]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({
          success: false,
          error: 'Exam not found',
        })
      }

      // Create queue entry
      const entry = await createSyncQueueEntry(bodyStudentId, bodyExamId, answers)

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: entry.id,
          status: entry.syncStatus,
          createdAt: entry.createdAt,
        },
        requestId: uuidv4(),
      }

      return res.status(201).json(response)
    } catch (error) {
      console.error('Error creating sync queue entry:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create sync queue entry',
      })
    }
  }

  // GET /api/tenant/cbt/sync/queue/:studentId/:examId
  if (req.method === 'GET' && (action === 'queue' || (studentId && examId && !action))) {
    const queryStudentId = (action === 'queue' ? req.query.studentId : studentId) as string
    const queryExamId = (action === 'queue' ? req.query.examId : examId) as string

    if (!queryStudentId || !queryExamId) {
      return res.status(400).json({
        success: false,
        error: 'studentId and examId are required',
      })
    }

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [queryExamId]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({
          success: false,
          error: 'Exam not found',
        })
      }

      const entry = await getSyncQueueEntry(queryStudentId, queryExamId)

      if (!entry) {
        return res.status(404).json({
          success: false,
          error: 'Sync queue entry not found',
        })
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          id: entry.id,
          status: entry.syncStatus,
          retryCount: entry.retryCount,
          lastError: entry.lastError,
          createdAt: entry.createdAt,
          syncedAt: entry.syncedAt,
        },
        requestId: uuidv4(),
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error getting sync queue entry:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve sync queue entry',
      })
    }
  }

  // GET /api/tenant/cbt/sync/statistics
  if (req.method === 'GET' && action === 'statistics') {
    try {
      const stats = await getSyncStatistics()

      const response: ApiResponse<any> = {
        success: true,
        data: stats,
        requestId: uuidv4(),
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error getting sync statistics:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve sync statistics',
      })
    }
  }

  // POST /api/tenant/cbt/sync/retry
  if (req.method === 'POST' && action === 'retry') {
    try {
      const result = await retryFailedSyncs(tenantId)

      const response: ApiResponse<any> = {
        success: true,
        data: result,
        requestId: uuidv4(),
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error retrying failed syncs:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to retry failed syncs',
      })
    }
  }

  return methodNotAllowed(res)
}
