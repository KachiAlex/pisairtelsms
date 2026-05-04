/**
 * Exam Management API Endpoints
 * Handles exam CRUD operations, scheduling, and status management
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getExams,
  getExam,
  getExamWithQuestions,
  createExam,
  updateExam,
  deleteExam,
  scheduleExam,
  startExam,
  endExam,
  getExamStats,
} from './_lib/exams.js'
import type { ExamFilter, CreateExamInput, UpdateExamInput } from './_lib/types.js'

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
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
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
  const tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string
  const { id, action } = req.query

  // Validate tenant ID
  if (!validateTenantId(tenantId, res)) {
    return
  }

  // GET /api/tenant/cbt/exams
  if (req.method === 'GET' && !id && action !== 'stats') {
    try {
      const { status, class: examClass, subject, page, limit } = req.query

      const filter: ExamFilter = {
        tenantId,
        status: status as any,
        class: examClass as string | undefined,
        subject: subject as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      }

      const result = await getExams(tenantId, filter)
      return res.status(200).json(result)
    } catch (error) {
      console.error('Error fetching exams:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch exams' })
    }
  }

  // GET /api/tenant/cbt/exams/stats
  if (req.method === 'GET' && action === 'stats') {
    try {
      const stats = await getExamStats(tenantId)
      return res.status(200).json({ success: true, data: stats })
    } catch (error) {
      console.error('Error fetching exam stats:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch exam stats' })
    }
  }

  // GET /api/tenant/cbt/exams/:id
  if (req.method === 'GET' && id && !action) {
    try {
      const exam = await getExamWithQuestions(tenantId, id as string)
      if (!exam) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      return res.status(200).json({ success: true, data: exam })
    } catch (error) {
      console.error('Error fetching exam:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch exam' })
    }
  }

  // POST /api/tenant/cbt/exams
  if (req.method === 'POST' && !id && action !== 'schedule' && action !== 'start' && action !== 'end') {
    if (!validateUserId(userId, res)) {
      return
    }

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { title, subject, class: examClass, description, duration, passMark, totalMarks, questionIds } = body

    // Validate required fields
    const missing: string[] = []
    if (!title) missing.push('title')
    if (!subject) missing.push('subject')
    if (!examClass) missing.push('class')
    if (!duration) missing.push('duration')
    if (passMark === undefined) missing.push('passMark')
    if (!totalMarks) missing.push('totalMarks')
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) missing.push('questionIds')

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        validationErrors: missing.reduce((acc, field) => {
          acc[field] = `${field} is required`
          return acc
        }, {} as Record<string, string>),
      })
    }

    try {
      const input: CreateExamInput = {
        title,
        subject,
        class: examClass,
        description,
        duration,
        passMark,
        totalMarks,
        questionIds,
      }

      const exam = await createExam(tenantId, userId, input)
      return res.status(201).json({ success: true, data: exam })
    } catch (error: any) {
      console.error('Error creating exam:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create exam',
      })
    }
  }

  // PUT /api/tenant/cbt/exams/:id
  if (req.method === 'PUT' && id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { title, subject, class: examClass, description, duration, passMark, totalMarks } = body

    try {
      const input: UpdateExamInput = {
        title,
        subject,
        class: examClass,
        description,
        duration,
        passMark,
        totalMarks,
      }

      const updated = await updateExam(tenantId, id as string, input)
      return res.status(200).json({ success: true, data: updated })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error updating exam:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update exam',
      })
    }
  }

  // DELETE /api/tenant/cbt/exams/:id
  if (req.method === 'DELETE' && id && !action) {
    try {
      await deleteExam(tenantId, id as string)
      return res.status(200).json({ success: true, message: 'Exam deleted successfully' })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error deleting exam:', error)
      return res.status(500).json({ success: false, error: 'Failed to delete exam' })
    }
  }

  // POST /api/tenant/cbt/exams/:id/schedule
  if (req.method === 'POST' && id && action === 'schedule') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { scheduledDate, scheduledTime } = body

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        validationErrors: { scheduledDate: 'scheduledDate is required' },
      })
    }

    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        validationErrors: { scheduledTime: 'scheduledTime is required' },
      })
    }

    try {
      const exam = await scheduleExam(tenantId, id as string, scheduledDate, scheduledTime)
      return res.status(200).json({ success: true, data: exam })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error scheduling exam:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to schedule exam',
      })
    }
  }

  // POST /api/tenant/cbt/exams/:id/start
  if (req.method === 'POST' && id && action === 'start') {
    try {
      const exam = await startExam(tenantId, id as string)
      return res.status(200).json({ success: true, data: exam })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error starting exam:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to start exam',
      })
    }
  }

  // POST /api/tenant/cbt/exams/:id/end
  if (req.method === 'POST' && id && action === 'end') {
    try {
      const exam = await endExam(tenantId, id as string)
      return res.status(200).json({ success: true, data: exam })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error ending exam:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to end exam',
      })
    }
  }

  return methodNotAllowed(res)
}
