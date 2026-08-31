import { sql } from '@vercel/postgres'
import { v4 as uuid } from 'uuid'

export type CommunicationChannel = 'email' | 'sms' | 'push' | 'in-app'
export type CommunicationType = 'announcement' | 'notification' | 'message'
export type CommunicationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'partial'
export type RecipientStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced'

export interface Communication {
  id: string
  tenantId: string
  type: CommunicationType
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents' | string[]
  channels: CommunicationChannel[]
  scheduledFor: string | null
  sentAt: string | null
  status: CommunicationStatus
  sentBy: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CommunicationRecipient {
  id: string
  communicationId: string
  tenantId: string
  recipientId: string
  recipientType: 'student' | 'parent' | 'staff'
  recipientName: string
  channel: CommunicationChannel
  address: string
  status: RecipientStatus
  providerMessageId: string | null
  attempts: number
  errorMessage: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CommunicationTemplate {
  id: string
  tenantId: string
  name: string
  type: CommunicationType
  title: string
  body: string
  channels: CommunicationChannel[]
  variables: string[]
  createdAt: string
  updatedAt: string
}

function mapCommunication(row: any): Communication {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    title: row.title,
    body: row.body,
    audience: row.audience,
    channels: row.channels || [],
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    status: row.status,
    sentBy: row.sent_by,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRecipient(row: any): CommunicationRecipient {
  return {
    id: row.id,
    communicationId: row.communication_id,
    tenantId: row.tenant_id,
    recipientId: row.recipient_id,
    recipientType: row.recipient_type,
    recipientName: row.recipient_name,
    channel: row.channel,
    address: row.address,
    status: row.status,
    providerMessageId: row.provider_message_id,
    attempts: row.attempts,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTemplate(row: any): CommunicationTemplate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    type: row.type,
    title: row.title,
    body: row.body,
    channels: row.channels || [],
    variables: row.variables || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function ensureCommunicationsTables(): Promise<void> {
  try {
    await sql`CREATE TABLE IF NOT EXISTS communications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      audience TEXT,
      channels TEXT[],
      scheduled_for TIMESTAMP,
      sent_at TIMESTAMP,
      status TEXT DEFAULT 'draft',
      sent_by TEXT,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`

    await sql`ALTER TABLE IF EXISTS communications
      ADD COLUMN IF NOT EXISTS tenant_id TEXT,
      ADD COLUMN IF NOT EXISTS type TEXT,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS body TEXT,
      ADD COLUMN IF NOT EXISTS audience TEXT,
      ADD COLUMN IF NOT EXISTS channels TEXT[],
      ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS status TEXT,
      ADD COLUMN IF NOT EXISTS sent_by TEXT,
      ADD COLUMN IF NOT EXISTS metadata TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`

    await sql`CREATE INDEX IF NOT EXISTS idx_communications_tenant_id ON communications(tenant_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_communications_scheduled_for ON communications(scheduled_for)`
  } catch (error) {
    console.error('Error ensuring communications table:', error)
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS communication_recipients (
      id TEXT PRIMARY KEY,
      communication_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      recipient_id TEXT NOT NULL,
      recipient_type TEXT NOT NULL,
      recipient_name TEXT,
      channel TEXT NOT NULL,
      address TEXT,
      status TEXT DEFAULT 'pending',
      provider_message_id TEXT,
      attempts INTEGER DEFAULT 0,
      error_message TEXT,
      sent_at TIMESTAMP,
      delivered_at TIMESTAMP,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`

    await sql`ALTER TABLE IF EXISTS communication_recipients
      ADD COLUMN IF NOT EXISTS communication_id TEXT,
      ADD COLUMN IF NOT EXISTS tenant_id TEXT,
      ADD COLUMN IF NOT EXISTS recipient_id TEXT,
      ADD COLUMN IF NOT EXISTS recipient_type TEXT,
      ADD COLUMN IF NOT EXISTS recipient_name TEXT,
      ADD COLUMN IF NOT EXISTS channel TEXT,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT,
      ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
      ADD COLUMN IF NOT EXISTS attempts INTEGER,
      ADD COLUMN IF NOT EXISTS error_message TEXT,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`

    await sql`CREATE INDEX IF NOT EXISTS idx_comm_recipients_communication_id ON communication_recipients(communication_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_comm_recipients_tenant_id ON communication_recipients(tenant_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_comm_recipients_status ON communication_recipients(status)`
  } catch (error) {
    console.error('Error ensuring communication_recipients table:', error)
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS communication_templates (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      name TEXT NOT NULL,
      type TEXT,
      title TEXT,
      body TEXT,
      channels TEXT[],
      variables TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`

    await sql`ALTER TABLE IF EXISTS communication_templates
      ADD COLUMN IF NOT EXISTS tenant_id TEXT,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS type TEXT,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS body TEXT,
      ADD COLUMN IF NOT EXISTS channels TEXT[],
      ADD COLUMN IF NOT EXISTS variables TEXT[],
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`

    await sql`CREATE INDEX IF NOT EXISTS idx_comm_templates_tenant_id ON communication_templates(tenant_id)`
  } catch (error) {
    console.error('Error ensuring communication_templates table:', error)
  }
}

export async function createCommunication(
  tenantId: string,
  payload: Omit<Communication, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Communication> {
  await ensureCommunicationsTables()
  const id = `comm_${uuid()}`
  const now = new Date().toISOString()
  const result = await sql`
    INSERT INTO communications
      (id, tenant_id, type, title, body, audience, channels, scheduled_for, sent_at, status, sent_by, metadata, created_at, updated_at)
    VALUES
      (${id}, ${tenantId}, ${payload.type}, ${payload.title}, ${payload.body}, ${JSON.stringify(payload.audience)}, ${JSON.stringify(payload.channels)}, ${payload.scheduledFor}, ${payload.sentAt}, ${payload.status}, ${payload.sentBy}, ${JSON.stringify(payload.metadata)}, ${now}, ${now})
    RETURNING *
  `
  return mapCommunication(result.rows[0])
}

export async function getCommunications(
  tenantId: string,
  options?: { type?: string; status?: string; limit?: number; offset?: number }
): Promise<Communication[]> {
  await ensureCommunicationsTables()
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0
  const conditions: string[] = [`tenant_id = $1`]
  const values: any[] = [tenantId]
  let paramIndex = 2
  if (options?.type) { conditions.push(`type = $${paramIndex++}`); values.push(options.type) }
  if (options?.status) { conditions.push(`status = $${paramIndex++}`); values.push(options.status) }
  values.push(limit, offset)
  const result = await sql.query(`SELECT * FROM communications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`, values)
  return (result.rows || []).map(mapCommunication)
}

export async function getCommunicationById(tenantId: string, id: string): Promise<Communication | null> {
  await ensureCommunicationsTables()
  const result = await sql`SELECT * FROM communications WHERE id = ${id} AND tenant_id = ${tenantId}`
  return result.rows[0] ? mapCommunication(result.rows[0]) : null
}

export async function updateCommunicationStatus(
  tenantId: string,
  id: string,
  status: CommunicationStatus,
  extra?: { sentAt?: string; scheduledFor?: string }
): Promise<void> {
  await ensureCommunicationsTables()
  const fields: string[] = ['status']
  const values: any[] = [status, id, tenantId]
  let p = 2
  if (extra?.sentAt) {
    p++; fields.push(`sent_at = $${p}`); values.splice(-2, 0, extra.sentAt)
  }
  if (extra?.scheduledFor) {
    p++; fields.push(`scheduled_for = $${p}`); values.splice(-2, 0, extra.scheduledFor)
  }
  const setClause = [`status = $1`, ...fields.slice(1)].join(', ')
  await sql.query(`UPDATE communications SET ${setClause}, updated_at = NOW() WHERE id = $${p} AND tenant_id = $${p + 1}`, values)
}

export async function createRecipients(
  tenantId: string,
  communicationId: string,
  recipients: Array<{
    recipientId: string
    recipientType: 'student' | 'parent' | 'staff'
    recipientName: string
    channel: CommunicationChannel
    address: string
  }>
): Promise<void> {
  await ensureCommunicationsTables()
  if (recipients.length === 0) return
  const now = new Date().toISOString()
  for (const r of recipients) {
    const id = `rec_${uuid()}`
    await sql`
      INSERT INTO communication_recipients
        (id, communication_id, tenant_id, recipient_id, recipient_type, recipient_name, channel, address, status, attempts, created_at, updated_at)
      VALUES
        (${id}, ${communicationId}, ${tenantId}, ${r.recipientId}, ${r.recipientType}, ${r.recipientName}, ${r.channel}, ${r.address}, 'pending', 0, ${now}, ${now})
    `
  }
}

export async function getRecipientsByCommunication(
  tenantId: string,
  communicationId: string,
  status?: RecipientStatus
): Promise<CommunicationRecipient[]> {
  await ensureCommunicationsTables()
  let queryText = `SELECT * FROM communication_recipients WHERE communication_id = $1 AND tenant_id = $2`
  const values: any[] = [communicationId, tenantId]
  if (status) { queryText += ` AND status = $3`; values.push(status) }
  queryText += ` ORDER BY created_at ASC`
  const result = await sql.query(queryText, values)
  return (result.rows || []).map(mapRecipient)
}

export async function getPendingRecipients(
  tenantId: string,
  batchSize = 50
): Promise<CommunicationRecipient[]> {
  await ensureCommunicationsTables()
  const result = await sql`
    SELECT * FROM communication_recipients
    WHERE tenant_id = ${tenantId} AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${batchSize}
  `
  return (result.rows || []).map(mapRecipient)
}

export async function updateRecipientStatus(
  recipientId: string,
  updates: Partial<CommunicationRecipient>
): Promise<void> {
  await ensureCommunicationsTables()
  const fields: string[] = []
  const values: any[] = []
  let p = 0

  if (updates.status !== undefined) { p++; fields.push(`status = $${p}`); values.push(updates.status) }
  if (updates.providerMessageId !== undefined) { p++; fields.push(`provider_message_id = $${p}`); values.push(updates.providerMessageId) }
  if (updates.attempts !== undefined) { p++; fields.push(`attempts = $${p}`); values.push(updates.attempts) }
  if (updates.errorMessage !== undefined) { p++; fields.push(`error_message = $${p}`); values.push(updates.errorMessage) }
  if (updates.sentAt !== undefined) { p++; fields.push(`sent_at = $${p}`); values.push(updates.sentAt) }
  if (updates.deliveredAt !== undefined) { p++; fields.push(`delivered_at = $${p}`); values.push(updates.deliveredAt) }
  if (updates.readAt !== undefined) { p++; fields.push(`read_at = $${p}`); values.push(updates.readAt) }
  if (fields.length === 0) return
  p++; fields.push(`updated_at = $${p}`); values.push(new Date().toISOString())
  p++; values.push(recipientId)
  await sql.query(`UPDATE communication_recipients SET ${fields.join(', ')} WHERE id = $${p}`, values)
}

export async function markRecipientRead(
  tenantId: string,
  communicationId: string,
  recipientId: string,
  recipientType: string
): Promise<void> {
  await ensureCommunicationsTables()
  await sql`
    UPDATE communication_recipients
    SET status = 'read', read_at = NOW(), updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND communication_id = ${communicationId}
      AND recipient_id = ${recipientId}
      AND recipient_type = ${recipientType}
  `
}

export async function getDeliveryStats(tenantId: string, communicationId: string): Promise<Record<RecipientStatus, number>> {
  await ensureCommunicationsTables()
  const result = await sql`
    SELECT status, COUNT(*) as count
    FROM communication_recipients
    WHERE tenant_id = ${tenantId} AND communication_id = ${communicationId}
    GROUP BY status
  `
  const stats: Record<string, number> = {
    pending: 0, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, bounced: 0,
  }
  for (const row of result.rows || []) {
    stats[row.status] = parseInt(row.count, 10)
  }
  return stats as Record<RecipientStatus, number>
}

export async function getCommunicationLogs(
  tenantId: string,
  options?: { communicationId?: string; status?: string; limit?: number }
): Promise<CommunicationRecipient[]> {
  await ensureCommunicationsTables()
  const conditions: string[] = [`tenant_id = $1`]
  const values: any[] = [tenantId]
  let paramIndex = 2
  if (options?.communicationId) { conditions.push(`communication_id = $${paramIndex++}`); values.push(options.communicationId) }
  if (options?.status) { conditions.push(`status = $${paramIndex++}`); values.push(options.status) }
  const limit = options?.limit ?? 100
  values.push(limit)
  const result = await sql.query(`SELECT * FROM communication_recipients WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC LIMIT $${paramIndex}`, values)
  return (result.rows || []).map(mapRecipient)
}

export async function createTemplate(
  tenantId: string,
  payload: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CommunicationTemplate> {
  await ensureCommunicationsTables()
  const id = `tmpl_${uuid()}`
  const now = new Date().toISOString()
  const result = await sql`
    INSERT INTO communication_templates
      (id, tenant_id, name, type, title, body, channels, variables, created_at, updated_at)
    VALUES
      (${id}, ${tenantId}, ${payload.name}, ${payload.type}, ${payload.title}, ${payload.body}, ${JSON.stringify(payload.channels)}, ${JSON.stringify(payload.variables)}, ${now}, ${now})
    RETURNING *
  `
  return mapTemplate(result.rows[0])
}

export async function getTemplates(tenantId: string): Promise<CommunicationTemplate[]> {
  await ensureCommunicationsTables()
  const result = await sql`SELECT * FROM communication_templates WHERE tenant_id = ${tenantId} ORDER BY updated_at DESC`
  return (result.rows || []).map(mapTemplate)
}
