import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import { initializeDatabase, runMigrations } from '../cbt/_lib/db.js'
import {
  generateCollectionSummary,
  generateAgingAnalysis,
  generateDefaulters,
  generateRevenueForecast,
  generatePaymentMethods,
  generateFinancialStatement,
} from './_lib/reports.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}

let migrationsInitialized = false

async function ensureMigrations() {
  if (migrationsInitialized) return
  migrationsInitialized = true
  try {
    initializeDatabase()
    await runMigrations()
  } catch (err) {
    console.error('Migration initialization error:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureMigrations()

  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  const { report } = req.query

  if (req.method !== 'GET') {
    return methodNotAllowed(res)
  }

  try {
    switch (report) {
      case 'collection-summary':
        return res.status(200).json({ data: await generateCollectionSummary(tenantId) })
      case 'aging-analysis':
        return res.status(200).json({ data: await generateAgingAnalysis(tenantId) })
      case 'defaulters':
        return res.status(200).json({ data: await generateDefaulters(tenantId) })
      case 'revenue-forecast':
        return res.status(200).json({ data: await generateRevenueForecast(tenantId) })
      case 'payment-methods':
        return res.status(200).json({ data: await generatePaymentMethods(tenantId) })
      case 'financial-statement':
        return res.status(200).json({ data: await generateFinancialStatement(tenantId) })
      default:
        return res.status(400).json({ error: 'Invalid report type' })
    }
  } catch (error) {
    console.error(`Error generating report ${report}:`, error)
    return res.status(500).json({ error: `Failed to generate ${report} report` })
  }
}
