/**
 * CBT Health Check and Database Initialization
 * Ensures database is initialized and migrations are run
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { healthCheck, getDatabaseStats, runMigrations, initializeDatabase } from './_lib/db.js'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Initialize database connection
    initializeDatabase()

    // Note: runMigrations() is intentionally not called here.
    // Tables are managed via direct SQL migrations applied to the database.
    // Check database health
    const isHealthy = await healthCheck()

    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Database health check failed',
      })
    }

    // Get database statistics
    const stats = await getDatabaseStats()

    return res.status(200).json({
      success: true,
      status: 'healthy',
      database: {
        connected: true,
        migrationsRun: true,
        stats,
      },
    })
  } catch (error: any) {
    console.error('Health check error:', error)
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message || 'Database initialization failed',
    })
  }
}
