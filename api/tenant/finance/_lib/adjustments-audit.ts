import { sql } from '@vercel/postgres'
import { v4 as uuidv4 } from 'uuid'

export interface FeeAdjustment {
  id: string
  feeAssignmentId: string
  adjustmentType: 'refund' | 'correction' | 'additional_charge'
  amount: number
  reason: string
  approvedBy: string
  approvalDate: string
  createdBy: string
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  userId: string
  timestamp: string
  ipAddress: string | null
}

interface FeeAdjustmentRow {
  id: string
  fee_assignment_id: string
  adjustment_type: string
  amount: string
  reason: string
  approved_by: string
  approval_date: Date
  created_by: string
  created_at: Date
}

interface AuditLogRow {
  id: string
  entity_type: string
  entity_id: string
  action: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  user_id: string
  timestamp: Date
  ip_address: string | null
}

function rowToFeeAdjustment(row: FeeAdjustmentRow): FeeAdjustment {
  return {
    id: row.id,
    feeAssignmentId: row.fee_assignment_id,
    adjustmentType: row.adjustment_type as 'refund' | 'correction' | 'additional_charge',
    amount: parseFloat(row.amount),
    reason: row.reason,
    approvedBy: row.approved_by,
    approvalDate: row.approval_date.toISOString(),
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  }
}

function rowToAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    oldValues: row.old_values,
    newValues: row.new_values,
    userId: row.user_id,
    timestamp: row.timestamp.toISOString(),
    ipAddress: row.ip_address,
  }
}

export async function ensureAdjustmentAuditTables(): Promise<void> {
  try {
    } catch (error) {
    console.error('Error ensuring adjustment and audit tables:', error)
  }
}

export async function createFeeAdjustment(
  feeAssignmentId: string,
  adjustmentType: 'refund' | 'correction' | 'additional_charge',
  amount: number,
  reason: string,
  approvedBy: string,
  createdBy: string
): Promise<FeeAdjustment> {
  await ensureAdjustmentAuditTables()
  const id = uuidv4()

  const result = await sql<FeeAdjustmentRow>`
    INSERT INTO fee_adjustments
      (id, fee_assignment_id, adjustment_type, amount, reason, approved_by, approval_date, created_by)
    VALUES
      (${id}, ${feeAssignmentId}, ${adjustmentType}, ${amount}, ${reason}, ${approvedBy}, NOW(), ${createdBy})
    RETURNING *
  `

  return rowToFeeAdjustment(result.rows[0])
}

export async function getFeeAdjustments(feeAssignmentId: string): Promise<FeeAdjustment[]> {
  await ensureAdjustmentAuditTables()

  const result = await sql<FeeAdjustmentRow>`
    SELECT * FROM fee_adjustments WHERE fee_assignment_id = ${feeAssignmentId}
    ORDER BY created_at DESC
  `

  return result.rows.map(rowToFeeAdjustment)
}

export async function createAuditLogEntry(
  entityType: string,
  entityId: string,
  action: string,
  oldValues: Record<string, any> | null,
  newValues: Record<string, any> | null,
  userId: string,
  ipAddress?: string
): Promise<AuditLogEntry> {
  await ensureAdjustmentAuditTables()
  const id = uuidv4()

  const result = await sql<AuditLogRow>`
    INSERT INTO audit_log
      (id, entity_type, entity_id, action, old_values, new_values, user_id, ip_address)
    VALUES
      (${id}, ${entityType}, ${entityId}, ${action}, ${JSON.stringify(oldValues)}, ${JSON.stringify(newValues)}, ${userId}, ${ipAddress || null})
    RETURNING *
  `

  return rowToAuditLogEntry(result.rows[0])
}

export async function getAuditLogEntries(
  entityType?: string,
  entityId?: string,
  action?: string
): Promise<AuditLogEntry[]> {
  await ensureAdjustmentAuditTables()

  let query = sql<AuditLogRow>`SELECT * FROM audit_log`

  if (entityType && entityId && action) {
    query = sql<AuditLogRow>`
      SELECT * FROM audit_log
      WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND action = ${action}
      ORDER BY timestamp DESC
    `
  } else if (entityType && entityId) {
    query = sql<AuditLogRow>`
      SELECT * FROM audit_log
      WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      ORDER BY timestamp DESC
    `
  } else if (entityType) {
    query = sql<AuditLogRow>`
      SELECT * FROM audit_log WHERE entity_type = ${entityType}
      ORDER BY timestamp DESC
    `
  } else if (entityId) {
    query = sql<AuditLogRow>`
      SELECT * FROM audit_log WHERE entity_id = ${entityId}
      ORDER BY timestamp DESC
    `
  } else {
    query = sql<AuditLogRow>`SELECT * FROM audit_log ORDER BY timestamp DESC`
  }

  const result = await query
  return result.rows.map(rowToAuditLogEntry)
}

export async function getAuditLogByEntityId(entityId: string): Promise<AuditLogEntry[]> {
  await ensureAdjustmentAuditTables()

  const result = await sql<AuditLogRow>`
    SELECT * FROM audit_log WHERE entity_id = ${entityId}
    ORDER BY timestamp DESC
  `

  return result.rows.map(rowToAuditLogEntry)
}
