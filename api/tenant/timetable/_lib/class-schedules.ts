import { randomUUID } from 'crypto'
import { sql } from './db.js'

export interface ClassSchedule {
  id: string
  tenantId: string
  classId: string
  termId: string
  createdAt: string
  updatedAt: string
}

export interface ClassScheduleEntry {
  id: string
  scheduleId: string
  timeSlotId: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  roomId?: string
  dayOfWeek: number
  createdAt: string
  updatedAt: string
}

function rowToSchedule(r: any): ClassSchedule {
  return { id: r.id, tenantId: r.tenant_id, classId: r.class_id, termId: r.term_id, createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}
function rowToEntry(r: any): ClassScheduleEntry {
  return { id: r.id, scheduleId: r.schedule_id, timeSlotId: r.time_slot_id, subjectId: r.subject_id, subjectName: r.subject_name, teacherId: r.teacher_id, teacherName: r.teacher_name, roomId: r.room_id ?? undefined, dayOfWeek: Number(r.day_of_week), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}

export async function getClassSchedules(tenantId: string, classId?: string, termId?: string): Promise<ClassSchedule[]> {
  try {
    if (classId && termId) {
      const r = await sql`SELECT * FROM timetable_class_schedules WHERE tenant_id = ${tenantId} AND class_id = ${classId} AND term_id = ${termId}`
      return r.rows.map(rowToSchedule)
    } else if (classId) {
      const r = await sql`SELECT * FROM timetable_class_schedules WHERE tenant_id = ${tenantId} AND class_id = ${classId}`
      return r.rows.map(rowToSchedule)
    } else if (termId) {
      const r = await sql`SELECT * FROM timetable_class_schedules WHERE tenant_id = ${tenantId} AND term_id = ${termId}`
      return r.rows.map(rowToSchedule)
    } else {
      const r = await sql`SELECT * FROM timetable_class_schedules WHERE tenant_id = ${tenantId}`
      return r.rows.map(rowToSchedule)
    }
  } catch { return [] }
}

export async function getClassScheduleById(id: string): Promise<(ClassSchedule & { entries: ClassScheduleEntry[] }) | null> {
  try {
    const sr = await sql`SELECT * FROM timetable_class_schedules WHERE id = ${id}`
    if (!sr.rows[0]) return null
    const er = await sql`SELECT * FROM timetable_class_schedule_entries WHERE schedule_id = ${id}`
    return { ...rowToSchedule(sr.rows[0]), entries: er.rows.map(rowToEntry) }
  } catch { return null }
}

export async function createClassSchedule(tenantId: string, classId: string, termId: string): Promise<ClassSchedule> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_class_schedules (id, tenant_id, class_id, term_id) VALUES (${id}, ${tenantId}, ${classId}, ${termId}) ON CONFLICT (tenant_id, class_id, term_id) DO UPDATE SET updated_at = NOW() RETURNING *`
  return rowToSchedule(result.rows[0])
}

export async function addScheduleEntry(scheduleId: string, data: Omit<ClassScheduleEntry, 'id' | 'scheduleId' | 'createdAt' | 'updatedAt'>): Promise<ClassScheduleEntry> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_class_schedule_entries (id, schedule_id, time_slot_id, subject_id, subject_name, teacher_id, teacher_name, room_id, day_of_week) VALUES (${id}, ${scheduleId}, ${data.timeSlotId}, ${data.subjectId}, ${data.subjectName}, ${data.teacherId}, ${data.teacherName}, ${data.roomId ?? null}, ${data.dayOfWeek}) RETURNING *`
  return rowToEntry(result.rows[0])
}

export async function updateScheduleEntry(entryId: string, data: Partial<ClassScheduleEntry>): Promise<ClassScheduleEntry | null> {
  const result = await sql`UPDATE timetable_class_schedule_entries SET time_slot_id = COALESCE(${data.timeSlotId ?? null}, time_slot_id), subject_id = COALESCE(${data.subjectId ?? null}, subject_id), subject_name = COALESCE(${data.subjectName ?? null}, subject_name), teacher_id = COALESCE(${data.teacherId ?? null}, teacher_id), teacher_name = COALESCE(${data.teacherName ?? null}, teacher_name), room_id = COALESCE(${data.roomId ?? null}, room_id), day_of_week = COALESCE(${data.dayOfWeek ?? null}, day_of_week), updated_at = NOW() WHERE id = ${entryId} RETURNING *`
  return result.rows[0] ? rowToEntry(result.rows[0]) : null
}

export async function deleteScheduleEntry(entryId: string): Promise<boolean> {
  const result = await sql`DELETE FROM timetable_class_schedule_entries WHERE id = ${entryId}`
  return (result.rowCount ?? 0) > 0
}

export async function isTeacherAvailable(teacherId: string, timeSlotId: string, dayOfWeek: number, excludeEntryId?: string): Promise<boolean> {
  const result = excludeEntryId
    ? await sql`SELECT 1 FROM timetable_class_schedule_entries WHERE teacher_id = ${teacherId} AND time_slot_id = ${timeSlotId} AND day_of_week = ${dayOfWeek} AND id != ${excludeEntryId} LIMIT 1`
    : await sql`SELECT 1 FROM timetable_class_schedule_entries WHERE teacher_id = ${teacherId} AND time_slot_id = ${timeSlotId} AND day_of_week = ${dayOfWeek} LIMIT 1`
  return result.rows.length === 0
}
