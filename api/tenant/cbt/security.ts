/**
 * Security Settings API Endpoints
 * Handles exam security configuration and proctoring logs
 */

import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { queryOne } from './_lib/db.js'
import {
  getSecuritySettings,
  upsertSecuritySettings,
  getProctoringLogs,
  createProctoringLog,
  getStudentProctoringLogs,
  getSuspiciousActivitySummary,
} from './_lib/security.js'
import type { UpdateSecuritySettingsInput, CreateProctoringLogInput } from './_lib/types.js'

/**
 * Parse request body
 */
function parseBody(req: ApiRequest) {
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
function methodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

/**
 * Validate tenant ID
 */
function validateTenantId(tenantId: string | undefined, res: ApiResponse): boolean {
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header is required' })
    return false
  }
  return true
}

/**
 * Main handler
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin', 'student'])
  if (!decoded) return

  const { id, action } = req.query

  // Students may only log proctoring events or upload camera snapshots for
  // their own exam session.
  if (decoded.role === 'student' && action !== 'log-event' && action !== 'snapshot') {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Verify the exam belongs to the caller's tenant (prevents cross-tenant
  // proctoring writes) and return the student's own id for student callers.
  async function verifyExamOwnership(examId: string): Promise<boolean> {
    const tenantId = decoded!.tenantId || 'default-tenant'
    const exam = await queryOne<{ id: string }>(
      'SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [examId, tenantId]
    )
    return Boolean(exam)
  }

  // POST /api/tenant/cbt/security/log-event — body: { examId, eventType, details, studentId? }
  if (req.method === 'POST' && action === 'log-event') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }
    const { examId, eventType, details, eventDetails } = body
    const studentId = decoded.role === 'student'
      ? decoded.studentId || decoded.userId
      : body.studentId || decoded.userId
    if (examId && !UUID_RE.test(String(examId))) {
      return res.status(400).json({ success: false, error: 'examId must be a valid exam id' })
    }
    if (!examId || !eventType || !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        validationErrors: {
          ...(examId ? {} : { examId: 'examId is required' }),
          ...(eventType ? {} : { eventType: 'eventType is required' }),
          ...(studentId ? {} : { studentId: 'studentId is required' }),
        },
      })
    }
    try {
      if (!(await verifyExamOwnership(examId))) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      const log = await createProctoringLog({
        examId,
        studentId,
        eventType,
        eventDetails: eventDetails || details,
      })
      return res.status(201).json({ success: true, data: log })
    } catch (error: any) {
      console.error('Error logging security event:', error)
      return res.status(500).json({ success: false, error: 'Failed to log security event' })
    }
  }

  // POST /api/tenant/cbt/security/snapshot — body: { examId, image }
  // Periodic webcam capture while a student sits a require_camera exam.
  if (req.method === 'POST' && action === 'snapshot') {
    if (decoded.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    const body = parseBody(req)
    const examId = body?.examId
    const image = body?.image
    const studentId = decoded.studentId || decoded.userId
    if (!examId || !UUID_RE.test(String(examId))) {
      return res.status(400).json({ success: false, error: 'examId must be a valid exam id' })
    }
    if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
      return res.status(400).json({ success: false, error: 'image must be a base64 image data URL' })
    }
    if (image.length > 700_000) {
      return res.status(413).json({ success: false, error: 'image too large' })
    }
    try {
      if (!(await verifyExamOwnership(examId))) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      // Only students with an active sitting may upload snapshots
      const sitting = await queryOne<{ status: string }>(
        `SELECT status FROM student_exam_progress
         WHERE exam_id = $1 AND student_id = $2`,
        [examId, studentId]
      )
      if (!sitting || sitting.status !== 'Active') {
        return res.status(409).json({ success: false, error: 'No active exam sitting' })
      }
      // Rate-limit: one snapshot per 15s per student per exam
      const recent = await queryOne<{ id: string }>(
        `SELECT id FROM proctoring_snapshots
         WHERE exam_id = $1 AND student_id = $2
           AND captured_at > now() - interval '15 seconds'
         LIMIT 1`,
        [examId, studentId]
      )
      if (recent) {
        return res.status(429).json({ success: false, error: 'Snapshot rate limit' })
      }
      const row = await queryOne<{ id: string }>(
        `INSERT INTO proctoring_snapshots (exam_id, student_id, image_data)
         VALUES ($1, $2, $3) RETURNING id`,
        [examId, studentId, image]
      )
      return res.status(201).json({ success: true, data: { id: row?.id } })
    } catch (error: any) {
      console.error('Error saving proctoring snapshot:', error)
      return res.status(500).json({ success: false, error: 'Failed to save snapshot' })
    }
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  // Validate tenant ID
  if (!validateTenantId(tenantId, res)) {
    return
  }

  // GET /api/tenant/cbt/security/:examId
  if (req.method === 'GET' && id && !action) {
    try {
      const settings = await getSecuritySettings(tenantId, id as string)
      if (!settings) {
        // Return default settings if none exist
        return res.status(200).json({
          success: true,
          data: {
            examId: id,
            enableProctoring: false,
            disableCopyPaste: false,
            disableRightClick: false,
            requireCamera: false,
            randomizeQuestions: false,
            randomizeOptions: false,
            allowedIps: [],
            examPassword: null,
          },
        })
      }
      return res.status(200).json({ success: true, data: settings })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error fetching security settings:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch security settings' })
    }
  }

  // POST /api/tenant/cbt/security/:examId
  if (req.method === 'POST' && id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const {
      enableProctoring,
      disableCopyPaste,
      disableRightClick,
      requireCamera,
      randomizeQuestions,
      randomizeOptions,
      allowedIps,
      examPassword,
    } = body

    try {
      const input: UpdateSecuritySettingsInput = {
        enableProctoring,
        disableCopyPaste,
        disableRightClick,
        requireCamera,
        randomizeQuestions,
        randomizeOptions,
        allowedIps,
        examPassword,
      }

      const settings = await upsertSecuritySettings(tenantId, id as string, input)
      return res.status(200).json({ success: true, data: settings })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error saving security settings:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to save security settings',
      })
    }
  }

  // GET /api/tenant/cbt/security/:examId/logs
  if (req.method === 'GET' && id && action === 'logs') {
    try {
      const { studentId, eventType, startDate, endDate, page, limit } = req.query

      const result = await getProctoringLogs(tenantId, id as string, {
        studentId: studentId as string | undefined,
        eventType: eventType as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      })

      return res.status(200).json(result)
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error fetching proctoring logs:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch proctoring logs' })
    }
  }

  // GET /api/tenant/cbt/security/:examId/student/:studentId/logs
  if (req.method === 'GET' && id && action === 'student') {
    const studentId = req.query.studentId as string
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId is required' })
    }

    try {
      const logs = await getStudentProctoringLogs(tenantId, id as string, studentId)
      return res.status(200).json({ success: true, data: logs })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error fetching student proctoring logs:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch student proctoring logs' })
    }
  }

  // GET /api/tenant/cbt/security/:examId/summary
  if (req.method === 'GET' && id && action === 'summary') {
    try {
      const summary = await getSuspiciousActivitySummary(tenantId, id as string)
      return res.status(200).json({ success: true, data: summary })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error fetching suspicious activity summary:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch suspicious activity summary' })
    }
  }

  // POST /api/tenant/cbt/security/:examId/log
  if (req.method === 'POST' && id && action === 'log') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { studentId, eventType, eventDetails } = body

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        validationErrors: { studentId: 'studentId is required' },
      })
    }

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        validationErrors: { eventType: 'eventType is required' },
      })
    }

    try {
      const input: CreateProctoringLogInput = {
        examId: id as string,
        studentId,
        eventType,
        eventDetails,
      }

      const log = await createProctoringLog(input)
      return res.status(201).json({ success: true, data: log })
    } catch (error: any) {
      console.error('Error creating proctoring log:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create proctoring log',
      })
    }
  }

  return methodNotAllowed(res)
}
