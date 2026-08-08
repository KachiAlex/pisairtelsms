import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware.js'
import { initializeDatabase, runMigrations } from '../../cbt/_lib/db.js'
import {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  getFeeStructureWithItems,
  updateFeeStructure,
  copyFeeStructure,
  getFeeStructureHistory,
} from './_lib/fee-structures.js'

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

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
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
  await ensureMigrations()

  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { id, action } = req.query
  const tenantId = decoded.tenantId || 'default-tenant'
  console.log('Fee structures request:', { method: req.method, id, action, tenantId })

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' })
  }

  // GET /api/tenant/finance/fee-structures
  if (req.method === 'GET' && !id) {
    const { academicSession, term, status } = req.query
    try {
      const structures = await getFeeStructures(
        tenantId,
        academicSession as string | undefined,
        term as string | undefined,
        status as string | undefined
      )
      return res.status(200).json({ data: structures })
    } catch (error) {
      console.error('Error fetching fee structures:', error)
      return res.status(500).json({ error: 'Failed to fetch fee structures' })
    }
  }

  // GET /api/tenant/finance/fee-structures/:id
  if (req.method === 'GET' && id && !action) {
    try {
      const structure = await getFeeStructureWithItems(id as string)
      if (!structure) {
        return res.status(404).json({ error: 'Fee structure not found' })
      }
      return res.status(200).json({ data: structure })
    } catch (error) {
      console.error('Error fetching fee structure:', error)
      return res.status(500).json({ error: 'Failed to fetch fee structure' })
    }
  }

  // GET /api/tenant/finance/fee-structures/:id/history
  if (req.method === 'GET' && id && action === 'history') {
    try {
      const history = await getFeeStructureHistory(id as string)
      return res.status(200).json({ data: history })
    } catch (error) {
      console.error('Error fetching fee structure history:', error)
      return res.status(500).json({ error: 'Failed to fetch fee structure history' })
    }
  }

  // POST /api/tenant/finance/fee-structures
  if (req.method === 'POST' && !id) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { name, academicSession, term, effectiveFrom, effectiveTo, createdBy, feeItems } = body

    const missing: string[] = []
    if (!name) missing.push('name')
    if (!academicSession) missing.push('academicSession')
    if (!term) missing.push('term')
    if (!effectiveFrom) missing.push('effectiveFrom')
    if (!createdBy) missing.push('createdBy')
    if (!feeItems || !Array.isArray(feeItems) || feeItems.length === 0) missing.push('feeItems')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    try {
      const structure = await createFeeStructure(
        tenantId,
        name,
        academicSession,
        term,
        effectiveFrom,
        effectiveTo || null,
        createdBy,
        feeItems
      )
      return res.status(201).json({ data: structure })
    } catch (error) {
      console.error('Error creating fee structure:', error)
      return res.status(500).json({ error: 'Failed to create fee structure' })
    }
  }

  // PUT /api/tenant/finance/fee-structures/:id
  if (req.method === 'PUT' && id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { name, effectiveFrom, effectiveTo, status } = body

    try {
      const updated = await updateFeeStructure(id as string, {
        name,
        effectiveFrom,
        effectiveTo,
        status,
      })

      if (!updated) {
        return res.status(404).json({ error: 'Fee structure not found' })
      }

      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error updating fee structure:', error)
      return res.status(500).json({ error: 'Failed to update fee structure' })
    }
  }

  // POST /api/tenant/finance/fee-structures/:id/copy
  if (req.method === 'POST' && id && action === 'copy') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { newName, newAcademicSession, newTerm, newEffectiveFrom, createdBy } = body

    const missing: string[] = []
    if (!newName) missing.push('newName')
    if (!newAcademicSession) missing.push('newAcademicSession')
    if (!newTerm) missing.push('newTerm')
    if (!newEffectiveFrom) missing.push('newEffectiveFrom')
    if (!createdBy) missing.push('createdBy')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    try {
      const copied = await copyFeeStructure(
        id as string,
        newName,
        newAcademicSession,
        newTerm,
        newEffectiveFrom,
        createdBy
      )
      return res.status(201).json({ data: copied })
    } catch (error: any) {
      if (error.message === 'Source fee structure not found') {
        return res.status(404).json({ error: 'Source fee structure not found' })
      }
      console.error('Error copying fee structure:', error)
      return res.status(500).json({ error: 'Failed to copy fee structure' })
    }
  }

  // DELETE /api/tenant/finance/fee-structures/:id
  if (req.method === 'DELETE' && id && !action) {
    try {
      const { sql } = await import('@vercel/postgres')
      
      // Delete fee items first (due to foreign key)
      await sql`DELETE FROM fee_items WHERE fee_structure_id = ${id}`
      
      // Delete fee assignments
      await sql`DELETE FROM fee_assignments WHERE fee_structure_id = ${id}`
      
      // Delete the fee structure
      const result = await sql`DELETE FROM fee_structures WHERE id = ${id} RETURNING id`
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fee structure not found' })
      }
      
      return res.status(200).json({ message: 'Fee structure deleted successfully' })
    } catch (error) {
      console.error('Error deleting fee structure:', error)
      return res.status(500).json({ error: 'Failed to delete fee structure' })
    }
  }

  return methodNotAllowed(res)
}
