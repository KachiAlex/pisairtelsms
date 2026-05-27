import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  return tenantId || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  const { report } = req.query

  if (req.method !== 'GET') {
    return methodNotAllowed(res)
  }

  // GET /api/tenant/finance/reports/collection-summary
  if (report === 'collection-summary') {
    try {
      const summary = {
        target: 1000000,
        actual: 750000,
        rate: 75,
        outstanding: 250000,
        byClass: [
          { class: 'JSS 1', target: 100000, actual: 75000, rate: 75 },
          { class: 'JSS 2', target: 100000, actual: 80000, rate: 80 },
          { class: 'JSS 3', target: 100000, actual: 70000, rate: 70 },
        ],
        byPaymentMethod: [
          { method: 'bank_transfer', amount: 400000, count: 150 },
          { method: 'cash', amount: 250000, count: 200 },
          { method: 'online', amount: 100000, count: 50 },
        ],
      }
      return res.status(200).json({ data: summary })
    } catch (error) {
      console.error('Error generating collection summary:', error)
      return res.status(500).json({ error: 'Failed to generate collection summary' })
    }
  }

  // GET /api/tenant/finance/reports/aging-analysis
  if (report === 'aging-analysis') {
    try {
      const aging = {
        current: { count: 100, amount: 50000 },
        thirtyDays: { count: 50, amount: 75000 },
        sixtyDays: { count: 30, amount: 60000 },
        ninetyPlus: { count: 20, amount: 65000 },
        byClass: [
          { class: 'JSS 1', current: 20, thirtyDays: 10, sixtyDays: 5, ninetyPlus: 3 },
          { class: 'JSS 2', current: 30, thirtyDays: 15, sixtyDays: 8, ninetyPlus: 5 },
          { class: 'JSS 3', current: 50, thirtyDays: 25, sixtyDays: 17, ninetyPlus: 12 },
        ],
      }
      return res.status(200).json({ data: aging })
    } catch (error) {
      console.error('Error generating aging analysis:', error)
      return res.status(500).json({ error: 'Failed to generate aging analysis' })
    }
  }

  // GET /api/tenant/finance/reports/defaulters
  if (report === 'defaulters') {
    try {
      const defaulters = {
        total: 100,
        students: [
          { studentId: 'STU001', name: 'John Doe', class: 'JSS 1', amountOwed: 50000, daysOverdue: 45 },
          { studentId: 'STU002', name: 'Jane Smith', class: 'JSS 2', amountOwed: 75000, daysOverdue: 60 },
          { studentId: 'STU003', name: 'Bob Johnson', class: 'JSS 3', amountOwed: 100000, daysOverdue: 90 },
        ],
      }
      return res.status(200).json({ data: defaulters })
    } catch (error) {
      console.error('Error generating defaulters report:', error)
      return res.status(500).json({ error: 'Failed to generate defaulters report' })
    }
  }

  // GET /api/tenant/finance/reports/revenue-forecast
  if (report === 'revenue-forecast') {
    try {
      const forecast = {
        projected: 1000000,
        actual: 750000,
        gap: 250000,
        byMonth: [
          { month: 'January', projected: 100000, actual: 75000 },
          { month: 'February', projected: 100000, actual: 80000 },
          { month: 'March', projected: 100000, actual: 70000 },
        ],
      }
      return res.status(200).json({ data: forecast })
    } catch (error) {
      console.error('Error generating revenue forecast:', error)
      return res.status(500).json({ error: 'Failed to generate revenue forecast' })
    }
  }

  // GET /api/tenant/finance/reports/payment-methods
  if (report === 'payment-methods') {
    try {
      const methods = {
        total: 750000,
        breakdown: [
          { method: 'bank_transfer', amount: 400000, percentage: 53.3, count: 150 },
          { method: 'cash', amount: 250000, percentage: 33.3, count: 200 },
          { method: 'online', amount: 100000, percentage: 13.3, count: 50 },
        ],
      }
      return res.status(200).json({ data: methods })
    } catch (error) {
      console.error('Error generating payment methods report:', error)
      return res.status(500).json({ error: 'Failed to generate payment methods report' })
    }
  }

  // GET /api/tenant/finance/reports/financial-statement
  if (report === 'financial-statement') {
    try {
      const statement = {
        totalRevenue: 750000,
        byClass: [
          { class: 'JSS 1', revenue: 75000 },
          { class: 'JSS 2', revenue: 80000 },
          { class: 'JSS 3', revenue: 70000 },
        ],
        byTerm: [
          { term: 'Term 1', revenue: 250000 },
          { term: 'Term 2', revenue: 250000 },
          { term: 'Term 3', revenue: 250000 },
        ],
        yearOverYear: [
          { year: '2024', revenue: 750000 },
          { year: '2023', revenue: 700000 },
        ],
      }
      return res.status(200).json({ data: statement })
    } catch (error) {
      console.error('Error generating financial statement:', error)
      return res.status(500).json({ error: 'Failed to generate financial statement' })
    }
  }

  return res.status(400).json({ error: 'Invalid report type' })
}
