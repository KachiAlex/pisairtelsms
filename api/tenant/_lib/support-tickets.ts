import { poolQuery, poolQueryOne } from '../../_lib/pg-pool.js'

export interface SupportTicket {
  id: string
  tenantId: string
  ticketNumber: string
  subject: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  createdBy: string
  createdByName: string
  assignedTo: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  messages?: TicketMessage[]
}

export interface TicketMessage {
  id: string
  ticketId: string
  authorId: string
  authorName: string
  authorRole: string
  message: string
  isInternal: boolean
  createdAt: string
}

function generateTicketNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SUP-${code}`
}

const TICKET_FIELDS = `
  id, tenant_id AS "tenantId", ticket_number AS "ticketNumber",
  subject, description, category, priority, status,
  created_by AS "createdBy", created_by_name AS "createdByName",
  assigned_to AS "assignedTo", resolved_at AS "resolvedAt",
  TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt",
  TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "updatedAt"
`

const MESSAGE_FIELDS = `
  id, ticket_id AS "ticketId", author_id AS "authorId",
  author_name AS "authorName", author_role AS "authorRole",
  message, is_internal AS "isInternal",
  TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt"
`

export const supportTicketsApi = {
  async listTickets(tenantId: string, filters?: { status?: string; priority?: string; limit?: number; offset?: number }) {
    const { status, priority, limit = 50, offset = 0 } = filters || {}
    let query = `SELECT ${TICKET_FIELDS} FROM support_tickets WHERE tenant_id = $1`
    const params: any[] = [tenantId]
    let idx = 2
    if (status) { query += ` AND status = $${idx++}`; params.push(status) }
    if (priority) { query += ` AND priority = $${idx++}`; params.push(priority) }
    query += ` ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`
    params.push(limit, offset)
    const r = await poolQuery(query, params)
    const countR = await poolQuery('SELECT COUNT(*)::int AS total FROM support_tickets WHERE tenant_id = $1', [tenantId])
    return { data: r.rows, total: countR.rows[0]?.total ?? 0 }
  },

  async createTicket(tenantId: string, payload: {
    requester: string
    topic: string
    priority?: string
    channel?: string
    description?: string
    category?: string
    createdByName?: string
  }) {
    const ticketNumber = generateTicketNumber()
    const r = await poolQueryOne(
      `INSERT INTO support_tickets (tenant_id, ticket_number, subject, description, category, priority, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${TICKET_FIELDS}`,
      [
        tenantId, ticketNumber,
        payload.topic,
        payload.description || '',
        payload.category || 'general',
        payload.priority || 'medium',
        payload.requester,
        payload.createdByName || payload.requester,
      ]
    )
    return r
  },

  async getTicketById(tenantId: string, ticketId: string) {
    const ticket = await poolQueryOne(
      `SELECT ${TICKET_FIELDS} FROM support_tickets WHERE id = $1 AND tenant_id = $2`,
      [ticketId, tenantId]
    )
    if (!ticket) throw new Error('Ticket not found')
    const msgR = await poolQuery(
      `SELECT ${MESSAGE_FIELDS} FROM support_ticket_messages WHERE ticket_id = $1 AND is_internal = FALSE ORDER BY created_at ASC`,
      [ticketId]
    )
    return { ...ticket, messages: msgR.rows }
  },

  async updateTicket(tenantId: string, ticketId: string, payload: { status?: string; priority?: string }) {
    const updates: string[] = []
    const values: any[] = []
    let idx = 1
    if (payload.status) {
      updates.push(`status = $${idx++}`)
      values.push(payload.status)
      if (payload.status === 'resolved' || payload.status === 'closed') {
        updates.push(`resolved_at = $${idx++}`)
        values.push(new Date().toISOString())
      }
    }
    if (payload.priority) {
      updates.push(`priority = $${idx++}`)
      values.push(payload.priority)
    }
    if (updates.length === 0) return await this.getTicketById(tenantId, ticketId)
    updates.push(`updated_at = NOW()`)
    values.push(ticketId, tenantId)
    const r = await poolQueryOne(
      `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx++}
       RETURNING ${TICKET_FIELDS}`,
      values
    )
    return r
  },

  async addComment(tenantId: string, ticketId: string, userId: string, text: string, authorName?: string, authorRole?: string) {
    const r = await poolQueryOne(
      `INSERT INTO support_ticket_messages (ticket_id, author_id, author_name, author_role, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${MESSAGE_FIELDS}`,
      [ticketId, userId, authorName || userId, authorRole || 'tenant_admin', text]
    )
    await poolQuery('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [ticketId])
    return r
  },

  async getStatistics(tenantId: string) {
    const openR = await poolQuery('SELECT COUNT(*)::int AS n FROM support_tickets WHERE tenant_id = $1 AND status IN ($2, $3)', [tenantId, 'open', 'in_progress'])
    const resolvedR = await poolQuery('SELECT COUNT(*)::int AS n FROM support_tickets WHERE tenant_id = $1 AND status = $2', [tenantId, 'resolved'])
    const totalR = await poolQuery('SELECT COUNT(*)::int AS n FROM support_tickets WHERE tenant_id = $1', [tenantId])
    return {
      openTickets: openR.rows[0]?.n ?? 0,
      resolvedTickets: resolvedR.rows[0]?.n ?? 0,
      totalTickets: totalR.rows[0]?.n ?? 0,
      withinSLA: '100%',
      breachesToday: 0,
      avgHandleTime: '—',
    }
  },

  async closeTicket(tenantId: string, ticketId: string) {
    return await this.updateTicket(tenantId, ticketId, { status: 'closed' })
  },

  async reopenTicket(tenantId: string, ticketId: string) {
    return await this.updateTicket(tenantId, ticketId, { status: 'open' })
  },

  async listAgents(_tenantId: string) {
    return []
  },

  async listRules(_tenantId: string) {
    return []
  },
}

export default supportTicketsApi;
