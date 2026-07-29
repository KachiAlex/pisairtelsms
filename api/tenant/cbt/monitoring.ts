/**
 * Live Monitoring API Endpoints
 * Real-time exam progress tracking
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import {
  getLiveMonitoringData,
  getStudentProgress,
  updateStudentProgress,
  flagStudent,
  completeStudentExam,
  getStudentsByStatus,
} from './_lib/monitoring.js'
import { queryOne } from './_lib/db.js'
import type { ApiResponse } from './_lib/types.js'
import { broadcastToExam } from './ws-monitoring.js'

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
  res.setHeader('Allow', 'GET,PUT,POST')
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
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.staffId || 'system'
  const { id, action } = req.query

  // Validate headers
  if (!validateTenantId(tenantId, res)) {
    return
  }

  if (!validateUserId(userId, res)) {
    return
  }

  // GET /api/tenant/cbt/monitoring/:examId
  if (req.method === 'GET' && id && !action) {
    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [id as string]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }

      const data = await getLiveMonitoringData(tenantId, id as string)

      const response: ApiResponse<any> = {
        success: true,
        data,
      }

      return res.status(200).json(response)
    } catch (error: any) {
      console.error('Error getting live monitoring data:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve monitoring data',
      })
    }
  }

  // GET /api/tenant/cbt/monitoring/:examId/student/:studentId
  if (req.method === 'GET' && id && action === 'student') {
    const studentId = req.query.studentId as string

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'studentId is required',
      })
    }

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [id as string]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }

      // Verify student exists
      const student = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE id = $1',
        [studentId]
      )

      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found' })
      }

      const progress = await getStudentProgress(tenantId, id as string, studentId)

      if (!progress) {
        return res.status(404).json({
          success: false,
          error: 'Student progress not found',
        })
      }

      const response: ApiResponse<any> = {
        success: true,
        data: progress,
      }

      return res.status(200).json(response)
    } catch (error: any) {
      console.error('Error getting student progress:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve student progress',
      })
    }
  }

  // PUT /api/tenant/cbt/monitoring/:examId/student/:studentId
  if (req.method === 'PUT' && id && action === 'student') {
    const studentId = req.query.studentId as string

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'studentId is required',
      })
    }

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { questionsAnswered, currentQuestion, status, timeRemaining } = body

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [id as string]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }

      // Validate input
      if (
        questionsAnswered !== undefined &&
        (typeof questionsAnswered !== 'number' || questionsAnswered < 0)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: {
            questionsAnswered: 'Must be a non-negative number',
          },
        })
      }

      if (
        currentQuestion !== undefined &&
        (typeof currentQuestion !== 'number' || currentQuestion < 0)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: {
            currentQuestion: 'Must be a non-negative number',
          },
        })
      }

      if (
        status !== undefined &&
        !['Active', 'Completed', 'Paused', 'Flagged'].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: {
            status: 'Must be Active, Completed, Paused, or Flagged',
          },
        })
      }

      if (
        timeRemaining !== undefined &&
        (typeof timeRemaining !== 'number' || timeRemaining < 0)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: {
            timeRemaining: 'Must be a non-negative number',
          },
        })
      }

      const updated = await updateStudentProgress(tenantId, id as string, studentId, {
        questionsAnswered,
        currentQuestion,
        status,
        timeRemaining,
      })

      // Broadcast update via WebSocket
      broadcastToExam(id as string, {
        type: 'progress_update',
        data: {
          studentId,
          ...updated,
        },
        timestamp: new Date().toISOString(),
      })

      const response: ApiResponse<any> = {
        success: true,
        data: updated,
      }

      return res.status(200).json(response)
    } catch (error: any) {
      console.error('Error updating student progress:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update student progress',
      })
    }
  }

  // PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag
  if (req.method === 'PUT' && id && action === 'flag') {
    const studentId = req.query.studentId as string

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'studentId is required',
      })
    }

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { reason } = body

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [id as string]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }

      // Validate input
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: {
            reason: 'Reason is required and must be a non-empty string',
          },
        })
      }

      if (reason.length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: {
            reason: 'Reason must not exceed 255 characters',
          },
        })
      }

      const flagged = await flagStudent(tenantId, id as string, studentId, reason.trim())

      // Broadcast flag event via WebSocket
      broadcastToExam(id as string, {
        type: 'student_flagged',
        data: {
          studentId,
          reason: reason.trim(),
          flaggedAt: flagged.flaggedAt,
        },
        timestamp: new Date().toISOString(),
      })

      const response: ApiResponse<any> = {
        success: true,
        data: flagged,
      }

      return res.status(200).json(response)
    } catch (error: any) {
      console.error('Error flagging student:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to flag student',
      })
    }
  }

  // POST /api/tenant/cbt/monitoring/:examId/student/:studentId/complete
  if (req.method === 'POST' && id && action === 'complete') {
    const studentId = req.query.studentId as string

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'studentId is required',
      })
    }

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [id as string]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }

      const completed = await completeStudentExam(tenantId, id as string, studentId)

      // Broadcast completion event via WebSocket
      broadcastToExam(id as string, {
        type: 'student_completed',
        data: {
          studentId,
          completedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })

      const response: ApiResponse<any> = {
        success: true,
        data: completed,
      }

      return res.status(200).json(response)
    } catch (error: any) {
      console.error('Error completing exam:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to complete exam',
      })
    }
  }

  // GET /api/tenant/cbt/monitoring/:examId/students/by-status/:status
  if (req.method === 'GET' && id && action === 'by-status') {
    const status = req.query.status as string

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required',
      })
    }

    try {
      // Verify exam exists and belongs to tenant
      const exam = await queryOne<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM exams WHERE id = $1',
        [id as string]
      )

      if (!exam || exam.tenant_id !== tenantId) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }

      // Validate status
      if (!['Active', 'Completed', 'Paused', 'Flagged'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: {
            status: 'Must be Active, Completed, Paused, or Flagged',
          },
        })
      }

      const students = await getStudentsByStatus(tenantId, id as string, status as any)

      const response: ApiResponse<any> = {
        success: true,
        data: students,
      }

      return res.status(200).json(response)
    } catch (error: any) {
      console.error('Error getting students by status:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve students',
      })
    }
  }

  return methodNotAllowed(res)
}
