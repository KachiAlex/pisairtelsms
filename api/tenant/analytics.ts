import type { VercelRequest, VercelResponse } from '@vercel/node'
import academicHandler from './analytics/academic.js'
import performanceHandler from './analytics/performance.js'
import studentProgressHandler from './analytics/student-progress.js'
import teacherPerformanceHandler from './analytics/teacher-performance.js'
import financialHandler from './analytics/financial.js'
import attendanceDashboardHandler from './attendance/analytics/dashboard.js'

const METRIC_HANDLERS: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>> = {
  academic: academicHandler,
  performance: performanceHandler,
  'student-progress': studentProgressHandler,
  'teacher-performance': teacherPerformanceHandler,
  attendance: attendanceDashboardHandler,
  financial: financialHandler,
}

interface MockResponse {
  statusCode: number
  body: any
  status: (code: number) => MockResponse
  json: (payload: any) => MockResponse
  send: (payload: any) => MockResponse
  setHeader: (name: string, value: string | string[]) => MockResponse
  end: () => MockResponse
}

function createMockRes(): MockResponse {
  let statusCode = 200
  let body: any = null
  const res: any = {}
  res.status = (code: number) => { statusCode = code; return res }
  res.json = (payload: any) => { body = payload; return res }
  res.send = (payload: any) => { body = payload; return res }
  res.setHeader = () => res
  res.end = () => res
  Object.defineProperty(res, 'statusCode', { get: () => statusCode })
  Object.defineProperty(res, 'body', { get: () => body })
  return res as MockResponse
}

/**
 * GET /api/tenant/analytics?metric=<metric>&...
 * Unified analytics gateway. Delegates to the correct sub-handler and
 * returns the captured response, preserving auth, filters, and errors.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const metric = req.query.metric as string | undefined
  if (!metric || !METRIC_HANDLERS[metric]) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing metric',
      validMetrics: Object.keys(METRIC_HANDLERS),
    })
  }

  const mockRes = createMockRes()

  try {
    const selectedHandler = METRIC_HANDLERS[metric]
    const result = await selectedHandler(req, mockRes as unknown as VercelResponse)

    // If the handler returned a response explicitly, prefer that
    if (result && typeof (result as any).status === 'function' && typeof (result as any).json === 'function') {
      return result as unknown as VercelResponse
    }

    return res.status(mockRes.statusCode).json(mockRes.body ?? { success: false, error: 'No response from metric handler' })
  } catch (error) {
    console.error(`Error routing analytics metric ${metric}:`, error)
    return res.status(500).json({
      success: false,
      error: 'Failed to route analytics request',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
