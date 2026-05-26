/**
 * Exam Results API Endpoints
 * Handles exam results, scoring, analytics, and reporting
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import {
  getResults,
  getResult,
  getResultWithAnswers,
  getExamResultsSummary,
  getStudentAnswers,
  getExamAnalytics,
  getStudentPerformance,
  getClassPerformance,
} from './_lib/results.js'
import type { ResultsFilter } from './_lib/types.js'

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
  res.setHeader('Allow', 'GET')
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
 * Convert results to CSV
 */
function generateResultsCSV(results: any[]): string {
  if (results.length === 0) {
    return 'examId,studentId,score,totalMarks,percentage,status,timeSpent,submittedAt\n'
  }

  const headers = ['examId', 'studentId', 'score', 'totalMarks', 'percentage', 'status', 'timeSpent', 'submittedAt']
  const rows: string[] = [headers.join(',')]

  for (const result of results) {
    const row = headers.map(header => {
      const value = result[header]
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`
      }
      return String(value || '')
    })
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = req.headers['x-tenant-id'] as string
  const { id, action } = req.query

  // Validate tenant ID
  if (!validateTenantId(tenantId, res)) {
    return
  }

  // GET /api/tenant/cbt/results
  if (req.method === 'GET' && !id && action !== 'export') {
    try {
      const { examId, studentId, status, startDate, endDate, page, limit } = req.query

      const filter: ResultsFilter = {
        examId: examId as string | undefined,
        studentId: studentId as string | undefined,
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      }

      const result = await getResults(tenantId, filter)
      return res.status(200).json(result)
    } catch (error) {
      console.error('Error fetching results:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch results' })
    }
  }

  // GET /api/tenant/cbt/results/:id
  if (req.method === 'GET' && id && !action) {
    try {
      const result = await getResultWithAnswers(tenantId, id as string)
      if (!result) {
        return res.status(404).json({ success: false, error: 'Result not found' })
      }
      return res.status(200).json({ success: true, data: result })
    } catch (error) {
      console.error('Error fetching result:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch result' })
    }
  }

  // GET /api/tenant/cbt/results/:id/summary
  if (req.method === 'GET' && id && action === 'summary') {
    try {
      const summary = await getExamResultsSummary(tenantId, id as string)
      if (!summary) {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      return res.status(200).json({ success: true, data: summary })
    } catch (error) {
      console.error('Error fetching results summary:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch results summary' })
    }
  }

  // GET /api/tenant/cbt/results/:id/analytics
  if (req.method === 'GET' && id && action === 'analytics') {
    try {
      const analytics = await getExamAnalytics(tenantId, id as string)
      return res.status(200).json({ success: true, data: analytics })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error fetching analytics:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch analytics' })
    }
  }

  // GET /api/tenant/cbt/results/:id/class-performance
  if (req.method === 'GET' && id && action === 'class-performance') {
    try {
      const performance = await getClassPerformance(tenantId, id as string)
      return res.status(200).json({ success: true, data: performance })
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        return res.status(404).json({ success: false, error: 'Exam not found' })
      }
      console.error('Error fetching class performance:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch class performance' })
    }
  }

  // GET /api/tenant/cbt/results/student/:studentId/performance
  if (req.method === 'GET' && id === 'student' && action) {
    try {
      const performance = await getStudentPerformance(tenantId, action as string)
      return res.status(200).json({ success: true, data: performance })
    } catch (error) {
      console.error('Error fetching student performance:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch student performance' })
    }
  }

  // GET /api/tenant/cbt/results/:id/answers
  if (req.method === 'GET' && id && action === 'answers') {
    try {
      const answers = await getStudentAnswers(tenantId, id as string)
      return res.status(200).json({ success: true, data: answers })
    } catch (error: any) {
      if (error.message === 'Result not found') {
        return res.status(404).json({ success: false, error: 'Result not found' })
      }
      console.error('Error fetching answers:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch answers' })
    }
  }

  // GET /api/tenant/cbt/results/export
  if (req.method === 'GET' && action === 'export') {
    try {
      const { examId, studentId, status, startDate, endDate } = req.query

      const filter: ResultsFilter = {
        examId: examId as string | undefined,
        studentId: studentId as string | undefined,
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: 1,
        limit: 10000,
      }

      const result = await getResults(tenantId, filter)
      const csv = generateResultsCSV(result.data)

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="exam-results.csv"')
      return res.status(200).send(csv)
    } catch (error) {
      console.error('Error exporting results:', error)
      return res.status(500).json({ success: false, error: 'Failed to export results' })
    }
  }

  return methodNotAllowed(res)
}
