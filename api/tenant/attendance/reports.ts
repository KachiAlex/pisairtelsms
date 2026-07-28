/**
 * Attendance Report Generation Endpoint
 * POST /api/tenant/attendance/reports - Generate and export attendance reports
 * Validates: Requirements 21
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getReport, type ReportFilter } from '../_lib/report-generator.js'
import { requireRole } from '../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Require tenant context
  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  // POST /api/tenant/attendance/reports - Generate report
  if (req.method === 'POST') {
    try {
      const body = parseBody(req)

      // Validate request body
      if (!body) {
        return res.status(400).json({
          success: false,
          error: 'Request body is required',
        })
      }

      const { format, startDate, endDate, class: className, studentId, term } = body

      // Validate format
      if (!format || !['csv', 'pdf'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'format is required and must be either "csv" or "pdf"',
        })
      }

      // Validate date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'startDate and endDate must be valid ISO date strings',
          })
        }
        if (start > end) {
          return res.status(400).json({
            success: false,
            error: 'startDate must be before endDate',
          })
        }
      }

      // Build report filter
      const reportFilter: ReportFilter = {
        tenantId,
        format: format as 'csv' | 'pdf',
        startDate,
        endDate,
        class: className,
        studentId,
        term,
      }

      // Generate report
      const reportContent = await getReport(reportFilter)

      // Set appropriate headers based on format
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.csv"`)
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.txt"`)
      }

      return res.status(200).send(reportContent)
    } catch (error) {
      console.error('Error generating report:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // Method not allowed
  res.setHeader('Allow', 'POST')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
