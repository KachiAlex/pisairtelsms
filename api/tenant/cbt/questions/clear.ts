/**
 * POST /api/tenant/cbt/questions/clear
 * Clears all questions from the database for a tenant
 * Destructive operation - use with caution
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { query } from '../_lib/db.js'
import { requireRole } from '../../../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.staffId || 'system'

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }

  if (!userId) {
    return res.status(401).json({ success: false, error: 'x-user-id header is required' })
  }

  try {
    // Require confirmation parameter to prevent accidental deletion
    const body = req.body || {}
    if (body.confirm !== 'CLEAR_ALL_QUESTIONS') {
      return res.status(400).json({ 
        success: false, 
        error: 'Confirmation required. Set confirm=CLEAR_ALL_QUESTIONS in request body to proceed.' 
      })
    }

    // Delete all questions for the tenant (soft delete)
    const result = await query(
      `UPDATE questions_bank 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    )

    const deletedCount = result.rowCount || 0

    // Also clear tag links for this tenant
    await query(
      `DELETE FROM question_tag_links 
       WHERE tenant_id = $1`,
      [tenantId]
    )

    // Also clear tags for this tenant
    await query(
      `UPDATE question_tags 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    )

    return res.status(200).json({
      success: true,
      data: {
        deletedCount,
        message: `Deleted ${deletedCount} questions and associated tags`,
      },
    })
  } catch (error: any) {
    console.error('Error clearing questions:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to clear questions' 
    })
  }
}
