import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

  try {
    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM private_lesson_rates WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
      `
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST') {
      const { rateType, amount, currency, subjectId, paymentMode } = req.body || {}
      if (amount === undefined || amount === null) {
        return res.status(400).json({ error: 'amount is required' })
      }
      const result = await sql`
        INSERT INTO private_lesson_rates (tenant_id, rate_type, amount, currency, subject_id, payment_mode, created_by)
        VALUES (${tenantId}, ${rateType || 'per_session'}, ${amount}, ${currency || 'NGN'}, ${subjectId || null}, ${paymentMode || 'direct_payment'}, ${userId})
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    if (req.method === 'PUT') {
      const { id, rateType, amount, currency, subjectId, paymentMode, isActive } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const result = await sql`
        UPDATE private_lesson_rates SET
          rate_type = COALESCE(${rateType || null}, rate_type),
          amount = COALESCE(${amount !== undefined ? amount : null}, amount),
          currency = COALESCE(${currency || null}, currency),
          subject_id = COALESCE(${subjectId || null}, subject_id),
          payment_mode = COALESCE(${paymentMode || null}, payment_mode),
          is_active = COALESCE(${isActive === undefined ? null : isActive}, is_active),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Rate not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
      }
      await sql`DELETE FROM private_lesson_rates WHERE id = ${id as string} AND tenant_id = ${tenantId}`
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[private-lesson-rates]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
