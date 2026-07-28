/**
 * Security Settings API Endpoints
 * Handles exam security configuration and proctoring logs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
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
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = req.headers['x-tenant-id'] as string
  const { id, action } = req.query

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
