import type { VercelRequest, VercelResponse } from '@vercel/node'
import { poolQuery, poolQueryOne } from '../_lib/pg-pool.js'
import { requireRole } from '../_lib/auth-middleware.js'

const TICKET_FIELDS = `
  st.id, st.tenant_id AS "tenantId", st.ticket_number AS "ticketNumber",
  st.subject, st.description, st.category, st.priority, st.status,
  st.created_by AS "createdBy", st.created_by_name AS "createdByName",
  st.assigned_to AS "assignedTo", st.resolved_at AS "resolvedAt",
  TO_CHAR(st.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt",
  TO_CHAR(st.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "updatedAt",
  t.name AS "tenantName"
`

const MESSAGE_FIELDS = `
  id, ticket_id AS "ticketId", author_id AS "authorId",
  author_name AS "authorName", author_role AS "authorRole",
  message, is_internal AS "isInternal",
  TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt"
`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['super_admin'])
  if (!decoded) return

  const adminId = decoded.sub || decoded.email || 'super_admin'
  const adminName = decoded.email || adminId

  try {
    // GET: list all tickets or single ticket with messages
    if (req.method === 'GET') {
      const { id, status, priority, category, tenantId, limit, offset } = req.query

      if (id) {
        const ticket = await poolQueryOne(
          `SELECT ${TICKET_FIELDS} FROM support_tickets st
           LEFT JOIN tenants t ON t.id::text = st.tenant_id
           WHERE st.id = $1`,
          [id as string]
        )
        if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' })

        const msgR = await poolQuery(
          `SELECT ${MESSAGE_FIELDS} FROM support_ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
          [id as string]
        )
        return res.json({ success: true, data: { ...ticket, messages: msgR.rows } })
      }

      let query = `SELECT ${TICKET_FIELDS} FROM support_tickets st LEFT JOIN tenants t ON t.id::text = st.tenant_id WHERE 1=1`
      const params: any[] = []
      let idx = 1
      if (status) { query += ` AND st.status = $${idx++}`; params.push(status) }
      if (priority) { query += ` AND st.priority = $${idx++}`; params.push(priority) }
      if (category) { query += ` AND st.category = $${idx++}`; params.push(category) }
      if (tenantId) { query += ` AND st.tenant_id = $${idx++}`; params.push(tenantId) }
      query += ` ORDER BY st.updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`
      params.push(limit ? parseInt(limit as string) : 50, offset ? parseInt(offset as string) : 0)

      const r = await poolQuery(query, params)
      const countR = await poolQuery('SELECT COUNT(*)::int AS total FROM support_tickets')
      return res.json({ success: true, data: r.rows, total: countR.rows[0]?.total ?? 0 })
    }

    // POST: respond, add internal note, or assign
    if (req.method === 'POST') {
      const { action, ticketId, message, isInternal } = req.body || {}

      if (action === 'respond') {
        if (!ticketId || !message) {
          return res.status(400).json({ success: false, error: 'ticketId and message are required' })
        }
        const msg = await poolQueryOne(
          `INSERT INTO support_ticket_messages (ticket_id, author_id, author_name, author_role, message, is_internal)
           VALUES ($1, $2, $3, 'super_admin', $4, FALSE)
           RETURNING ${MESSAGE_FIELDS}`,
          [ticketId, adminId, adminName, message]
        )
        await poolQuery(
          `UPDATE support_tickets SET status = 'in_progress', updated_at = NOW(), assigned_to = $2 WHERE id = $1 AND assigned_to IS NULL`,
          [ticketId, adminId]
        )
        await poolQuery('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [ticketId])
        return res.status(201).json({ success: true, data: msg })
      }

      if (action === 'add-internal-note') {
        if (!ticketId || !message) {
          return res.status(400).json({ success: false, error: 'ticketId and message are required' })
        }
        const msg = await poolQueryOne(
          `INSERT INTO support_ticket_messages (ticket_id, author_id, author_name, author_role, message, is_internal)
           VALUES ($1, $2, $3, 'super_admin', $4, TRUE)
           RETURNING ${MESSAGE_FIELDS}`,
          [ticketId, adminId, adminName, message]
        )
        return res.status(201).json({ success: true, data: msg })
      }

      if (action === 'assign') {
        const { ticketId, assignTo } = req.body || {}
        if (!ticketId) {
          return res.status(400).json({ success: false, error: 'ticketId is required' })
        }
        const r = await poolQueryOne(
          `UPDATE support_tickets SET assigned_to = $2, status = 'in_progress', updated_at = NOW()
           WHERE id = $1 RETURNING id, assigned_to AS "assignedTo"`,
          [ticketId, assignTo || adminId]
        )
        return res.json({ success: true, data: r })
      }

      return res.status(400).json({ success: false, error: 'Invalid action' })
    }

    // PATCH: update status, priority
    if (req.method === 'PATCH') {
      const { id, status, priority } = req.body || {}
      if (!id) return res.status(400).json({ success: false, error: 'id is required' })

      const updates: string[] = []
      const values: any[] = []
      let idx = 1
      if (status) {
        updates.push(`status = $${idx++}`)
        values.push(status)
        if (status === 'resolved' || status === 'closed') {
          updates.push(`resolved_at = $${idx++}`)
          values.push(new Date().toISOString())
        }
      }
      if (priority) {
        updates.push(`priority = $${idx++}`)
        values.push(priority)
      }
      if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' })
      updates.push(`updated_at = NOW()`)
      values.push(id)

      const r = await poolQueryOne(
        `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${idx++}
         RETURNING id, status, priority, assigned_to AS "assignedTo"`,
        values
      )
      if (!r) return res.status(404).json({ success: false, error: 'Ticket not found' })
      return res.json({ success: true, data: r })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error: any) {
    console.error('admin support-tickets handler error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}
