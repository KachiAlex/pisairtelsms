import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchAttendance, upsertAttendanceBatch, type AttendancePayload, type AttendanceFilter } from './_lib/attendance.js'
import { requireRole } from '../_lib/auth-middleware.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date > today
}

function getTenantId(req: VercelRequest): string | null {
  // Try to get from header first
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  
  // Try to get from query parameter
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  
  return null
}

function getUserId(req: VercelRequest): string | null {
  return (req.headers['x-user-id'] as string | undefined) || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant attendance
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Require tenant context
  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  // GET /api/tenant/attendance - Fetch attendance records with filtering
  if (req.method === 'GET') {
    try {
      const {
        class: className,
        date,
        startDate,
        endDate,
        studentId,
        status,
        source,
        term,
        limit = '100',
        offset = '0',
      } = req.query

      // Parse and validate pagination parameters
      let parsedLimit = parseInt(limit as string, 10)
      let parsedOffset = parseInt(offset as string, 10)

      if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 100
      if (isNaN(parsedOffset) || parsedOffset < 0) parsedOffset = 0
      if (parsedLimit > 1000) parsedLimit = 1000

      const filters: AttendanceFilter = {
        tenantId,
        class: className as string | undefined,
        date: date as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        studentId: studentId as string | undefined,
        status: status as string | undefined,
        source: source as string | undefined,
        term: term as string | undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      }

      const result = await fetchAttendance(filters)

      return res.status(200).json({
        success: true,
        data: result.records,
        pagination: {
          total: result.total,
          limit: parsedLimit,
          offset: parsedOffset,
        },
      })
    } catch (error) {
      console.error('Error fetching attendance:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance records',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // POST /api/tenant/attendance - Submit attendance records
  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required',
      })
    }

    const { records } = body
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'records array is required and must not be empty',
      })
    }

    // Get user ID for audit trail
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User context required (x-user-id header)',
      })
    }

    // Validate all records
    const validationErrors: Array<{ index: number; error: string }> = []

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const errors: string[] = []

      // Check required fields
      if (!record.studentId) errors.push('studentId is required')
      if (!record.class) errors.push('class is required')
      if (!record.date) errors.push('date is required')
      if (!record.status) errors.push('status is required')
      if (!record.academicSession) errors.push('academicSession is required')
      if (!record.term) errors.push('term is required')

      // Validate status
      if (record.status && !['present', 'absent', 'late'].includes(record.status)) {
        errors.push(`status must be one of: present, absent, late`)
      }

      // Validate date format
      if (record.date && !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        errors.push('date must be in YYYY-MM-DD format')
      }

      // Validate date is not in future
      if (record.date && isFutureDate(record.date)) {
        errors.push('date cannot be in the future')
      }

      // Validate academic session format
      if (record.academicSession && !/^\d{4}\/\d{4}$/.test(record.academicSession)) {
        errors.push('academicSession must be in YYYY/YYYY format')
      }

      if (errors.length > 0) {
        validationErrors.push({ index: i, error: errors.join('; ') })
      }
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed for one or more records',
        details: validationErrors,
      })
    }

    try {
      // Add userId and source to each record
      const enrichedRecords: AttendancePayload[] = records.map((record: any) => ({
        ...record,
        userId,
        source: record.source || 'teacher_entry',
        createdBy: userId,
      }))

      const result = await upsertAttendanceBatch(tenantId, enrichedRecords)

      // If there were errors during upsert, return them
      if (result.errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Some records failed to save',
          data: {
            inserted: result.inserted,
            updated: result.updated,
            failed: result.errors.length,
          },
          details: result.errors,
        })
      }

      const totalCount = result.inserted + result.updated
      return res.status(200).json({
        success: true,
        data: {
          count: totalCount,
          inserted: result.inserted,
          updated: result.updated,
          message: `${totalCount} attendance records saved (${result.inserted} inserted, ${result.updated} updated)`,
        },
      })
    } catch (error) {
      console.error('Error saving attendance:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to save attendance records',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return methodNotAllowed(res)
}
