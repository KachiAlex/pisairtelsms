import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { requireCSRF } from '../_lib/csrf.js'
import supportTicketsApi from '../tenant/_lib/support-tickets.js'

/**
 * /api/student/support — the student's own help tickets.
 * GET            — list own tickets; ?id= returns one with its message thread.
 * POST {subject, description, category?, priority?} — open a ticket.
 * POST {ticketId, message} — add a reply to an own ticket.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student'])
  if (!decoded) return
  const studentId = decoded.studentId || decoded.userId
  const tenantId = decoded.tenantId || 'default-tenant'
  if (!studentId) return res.status(401).json({ error: 'Invalid token payload' })

  try {
    if (req.method === 'GET') {
      const { id } = req.query
      if (id) {
        const ticket = await supportTicketsApi.getTicketById(tenantId, id as string).catch(() => null) as any
        if (!ticket || ticket.createdBy !== studentId) {
          return res.status(404).json({ error: 'Ticket not found' })
        }
        return res.status(200).json(ticket)
      }
      const r = await sql`
        SELECT id, ticket_number AS "ticketNumber", subject, description, category,
               priority, status, created_at::text AS "createdAt", updated_at::text AS "updatedAt"
        FROM support_tickets
        WHERE tenant_id = ${tenantId} AND created_by = ${studentId}
        ORDER BY updated_at DESC LIMIT 50
      `
      return res.status(200).json({ data: r.rows, total: r.rows.length })
    }

    if (req.method === 'POST') {
      if (requireCSRF(req, res, studentId)) return
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { subject, description, category, priority, ticketId, message } = body

      if (ticketId) {
        if (!message || !String(message).trim()) {
          return res.status(400).json({ error: 'message is required' })
        }
        const own = await sql`
          SELECT id, status FROM support_tickets
          WHERE id = ${ticketId} AND tenant_id = ${tenantId} AND created_by = ${studentId}
          LIMIT 1
        `
        if (!own.rows[0]) return res.status(404).json({ error: 'Ticket not found' })
        if (own.rows[0].status === 'closed') {
          return res.status(400).json({ error: 'Ticket is closed' })
        }
        const name = (await sql`SELECT name FROM students WHERE id = ${studentId} LIMIT 1`.catch(() => ({ rows: [] as any[] }))).rows[0]?.name || 'Student'
        const msg = await supportTicketsApi.addComment(tenantId, ticketId, studentId, String(message).trim(), name, 'student')
        return res.status(201).json({ data: msg })
      }

      if (!subject || !String(subject).trim()) {
        return res.status(400).json({ error: 'subject is required' })
      }
      const name = (await sql`SELECT name FROM students WHERE id = ${studentId} LIMIT 1`.catch(() => ({ rows: [] as any[] }))).rows[0]?.name || 'Student'
      const ticket = await supportTicketsApi.createTicket(tenantId, {
        requester: studentId,
        createdByName: name,
        topic: String(subject).trim(),
        description: description || '',
        category: category || 'general',
        priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      })
      return res.status(201).json({ data: ticket })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in student support:', error)
    return res.status(500).json({ error: 'Failed to process support request' })
  }
}
