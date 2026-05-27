import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseCsvContent, generateCsvTemplate } from '../_lib/csv-parser.js'
import { upsertAttendanceBatch, type AttendancePayload } from '../_lib/attendance.js'
import { requireRole } from '../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

function getUserId(req: VercelRequest): string | null {
  return (req.headers['x-user-id'] as string | undefined) || null
}

/**
 * POST /api/tenant/attendance/batch-upload
 * Accepts CSV content in request body for bulk attendance import.
 *
 * Query params:
 *   ?preview=true  — parse and validate only, do not insert records
 *
 * GET /api/tenant/attendance/batch-upload
 * Returns a CSV template for download.
 *
 * Validates: Requirements 6 (Manual Batch Upload)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  // GET - return CSV template
  if (req.method === 'GET') {
    const template = generateCsvTemplate()
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-template.csv"')
    return res.status(200).send(template)
  }

  // POST - process CSV upload
  if (req.method === 'POST') {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User context required (x-user-id header)' })
    }

    const isPreview = req.query['preview'] === 'true'

    // Get CSV content from body
    let csvContent: string

    if (typeof req.body === 'string') {
      csvContent = req.body
    } else if (req.body && typeof req.body === 'object') {
      // JSON body with csvContent field
      csvContent = req.body.csvContent || req.body.content || ''
    } else {
      return res.status(400).json({
        success: false,
        error: 'CSV content is required. Send CSV text as request body or as { csvContent: "..." }',
      })
    }

    if (!csvContent || !csvContent.trim()) {
      return res.status(400).json({ success: false, error: 'CSV content is empty' })
    }

    // Parse and validate CSV
    const parseResult = parseCsvContent(csvContent)

    if (parseResult.totalRows === 0 && parseResult.errors.length === 0) {
      return res.status(400).json({ success: false, error: 'CSV file has no data rows' })
    }

    // Preview mode: return validation summary without inserting
    if (isPreview) {
      return res.status(200).json({
        success: true,
        data: {
          preview: true,
          totalRecords: parseResult.totalRows,
          validRecords: parseResult.valid.length,
          invalidRecords: parseResult.errors.length,
          inserted: 0,
          skipped: parseResult.errors.length,
          errors: parseResult.errors.slice(0, 50),
          message: `Preview: ${parseResult.valid.length} valid records, ${parseResult.errors.length} invalid records. Submit without ?preview=true to insert.`,
        },
      })
    }

    // If all rows have errors, return without inserting
    if (parseResult.valid.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid records found in CSV',
        data: {
          totalRecords: parseResult.totalRows,
          validRecords: 0,
          invalidRecords: parseResult.errors.length,
          inserted: 0,
          skipped: parseResult.errors.length,
          errors: parseResult.errors.slice(0, 50),
        },
      })
    }

    // Convert to AttendancePayload format
    const payloads: AttendancePayload[] = parseResult.valid.map(record => ({
      studentId: record.studentId,
      class: record.class,
      date: record.date,
      status: record.status as 'present' | 'absent' | 'late',
      source: 'batch_upload' as const,
      userId,
      academicSession: record.academicSession,
      term: record.term,
      createdBy: userId,
    }))

    try {
      const upsertResult = await upsertAttendanceBatch(tenantId, payloads)

      const dbErrors = upsertResult.errors.map(e => ({
        row: -1,
        field: 'record',
        message: e.error,
      }))

      const allErrors = [
        ...parseResult.errors,
        ...dbErrors,
      ]

      const totalInserted = upsertResult.inserted + upsertResult.updated
      const skipped = parseResult.errors.length + upsertResult.errors.length

      return res.status(200).json({
        success: true,
        data: {
          totalRecords: parseResult.totalRows,
          validRecords: parseResult.valid.length,
          invalidRecords: parseResult.errors.length,
          inserted: upsertResult.inserted,
          updated: upsertResult.updated,
          skipped,
          failed: upsertResult.errors.length,
          errors: allErrors.slice(0, 50),
          message: `${totalInserted} records processed (${upsertResult.inserted} inserted, ${upsertResult.updated} updated, ${skipped} skipped)`,
        },
      })
    } catch (error) {
      console.error('Error processing batch upload:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to process batch upload',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
