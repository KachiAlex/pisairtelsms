import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import { getSubjects, getSubjectNames } from './_lib/subjects.js'
import { initializeDatabase } from './_lib/db.js'

/**
 * Diagnostics endpoint for CBT module
 * Helps debug data fetching issues
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = req.headers['x-tenant-id'] as string

  if (!tenantId) {
    return res.status(400).json({ 
      success: false, 
      error: 'x-tenant-id header is required',
      receivedHeaders: Object.keys(req.headers)
    })
  }

  try {
    initializeDatabase()
  } catch (error: any) {
    return res.status(503).json({ 
      success: false, 
      error: 'Database initialization failed: ' + error.message 
    })
  }

  try {
    // Get all subjects
    const allSubjects = await getSubjects(tenantId)
    
    // Get subject names only
    const subjectNames = await getSubjectNames(tenantId)

    return res.status(200).json({
      success: true,
      tenantId,
      diagnostics: {
        totalSubjects: allSubjects.length,
        subjectNames: subjectNames,
        allSubjects: allSubjects.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          type: s.type,
          department: s.department,
          levels: s.levels
        }))
      }
    })
  } catch (error: any) {
    console.error('Diagnostics error:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Diagnostics failed' 
    })
  }
}
