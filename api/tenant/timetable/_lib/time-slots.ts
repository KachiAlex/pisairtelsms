import { randomUUID } from 'crypto'
import { sql } from './db.js'

export interface TimeSlot {
  id: string
  tenantId: string
  name: string
  startTime: string
  endTime: string
  durationMinutes: number
  dayOfWeek: number
  isBreak: boolean
  sequence: number
  createdAt: string
  updatedAt: string
}

function rowToSlot(r: any): TimeSlot {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, startTime: String(r.start_time).slice(0, 5), endTime: String(r.end_time).slice(0, 5), durationMinutes: Number(r.duration_minutes), dayOfWeek: Number(r.day_of_week), isBreak: Boolean(r.is_break), sequence: Number(r.sequence), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}

export async function getTimeSlots(tenantId: string, dayOfWeek?: number): Promise<TimeSlot[]> {
  try {
    const result = dayOfWeek !== undefined
      ? await sql`SELECT * FROM timetable_time_slots WHERE tenant_id = ${tenantId} AND day_of_week = ${dayOfWeek} ORDER BY sequence ASC`
      : await sql`SELECT * FROM timetable_time_slots WHERE tenant_id = ${tenantId} ORDER BY sequence ASC`
    return result.rows.map(rowToSlot)
  } catch { return [] }
}

export async function createTimeSlot(tenantId: string, data: Omit<TimeSlot, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<TimeSlot> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_time_slots (id, tenant_id, name, start_time, end_time, duration_minutes, day_of_week, is_break, sequence) VALUES (${id}, ${tenantId}, ${data.name}, ${data.startTime}, ${data.endTime}, ${data.durationMinutes}, ${data.dayOfWeek}, ${data.isBreak}, ${data.sequence}) RETURNING *`
  return rowToSlot(result.rows[0])
}

export async function updateTimeSlot(id: string, data: Partial<TimeSlot>): Promise<TimeSlot | null> {
  const result = await sql`UPDATE timetable_time_slots SET name = COALESCE(${data.name ?? null}, name), start_time = COALESCE(${data.startTime ?? null}, start_time), end_time = COALESCE(${data.endTime ?? null}, end_time), duration_minutes = COALESCE(${data.durationMinutes ?? null}, duration_minutes), day_of_week = COALESCE(${data.dayOfWeek ?? null}, day_of_week), is_break = COALESCE(${data.isBreak ?? null}, is_break), sequence = COALESCE(${data.sequence ?? null}, sequence), updated_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToSlot(result.rows[0]) : null
}

export async function deleteTimeSlot(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM timetable_time_slots WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

export async function timeSlotsOverlap(tenantId: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
  const result = excludeId
    ? await sql`SELECT 1 FROM timetable_time_slots WHERE tenant_id = ${tenantId} AND day_of_week = ${dayOfWeek} AND id != ${excludeId} AND start_time < ${endTime} AND end_time > ${startTime} LIMIT 1`
    : await sql`SELECT 1 FROM timetable_time_slots WHERE tenant_id = ${tenantId} AND day_of_week = ${dayOfWeek} AND start_time < ${endTime} AND end_time > ${startTime} LIMIT 1`
  return result.rows.length > 0
}
