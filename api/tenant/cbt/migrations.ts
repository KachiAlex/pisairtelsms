/**
 * Database Migration Endpoint
 * Triggers database migrations to be run
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase, runMigrations } from './_lib/db.js'
import { requireRole } from '../../_lib/auth-middleware'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['tenant_admin'])
  if (!decoded) return

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Initializing database...')
    initializeDatabase()
    console.log('Database initialized')

    console.log('Starting database migrations...')
    await runMigrations()
    console.log('Database migrations completed successfully')

    return res.status(200).json({
      success: true,
      message: 'Migrations completed successfully',
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Migration failed',
      details: error.toString(),
    })
  }
}
