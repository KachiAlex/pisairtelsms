import { randomUUID } from 'crypto'
import { sql } from './db.js'

export interface TeacherSchedule {
  id: string
  tenantId: string
  teacherId: string
  teacherName: string
  termId: string
  classId: string
  subjectId: string
  subjectName: string
  timeSlotId: string
  dayOfWeek: number
  createdAt: string
  updatedAt: string
}

function rowToSchedule(r: any): TeacherSchedule {
  return { id: r.id, tenantId: r.tenant_id, teacherId: r.teacher_id, teacherName: r.teacher_name, termId: r.term_id, classId: r.class_id, subjectId: r.subject_id, subjectName: r.subject_name, timeSlotId: r.time_slot_id, dayOfWeek: Number(r.day_of_week), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}

export async function getTeacherSchedules(tenantId: string, teacherId?: string, termId?: string): Promise<TeacherSchedule[]> {
  try {
    if (teacherId && termId) {
      const r = await sql`SELECT * FROM timetable_teacher_schedules WHERE tenant_id = ${tenantId} AND teacher_id = ${teacherId} AND term_id = ${termId}`
      return r.rows.map(rowToSchedule)
    } else if (teacherId) {
      const r = await sql`SELECT * FROM timetable_teacher_schedules WHERE tenant_id = ${tenantId} AND teacher_id = ${teacherId}`
      return r.rows.map(rowToSchedule)
    } else if (termId) {
      const r = await sql`SELECT * FROM timetable_teacher_schedules WHERE tenant_id = ${tenantId} AND term_id = ${termId}`
      return r.rows.map(rowToSchedule)
    } else {
      const r = await sql`SELECT * FROM timetable_teacher_schedules WHERE tenant_id = ${tenantId}`
      return r.rows.map(rowToSchedule)
    }
  } catch { return [] }
}

export async function getTeacherScheduleById(id: string): Promise<TeacherSchedule | null> {
  try {
    const result = await sql`SELECT * FROM timetable_teacher_schedules WHERE id = ${id}`
    return result.rows[0] ? rowToSchedule(result.rows[0]) : null
  } catch { return null }
}

export async function createTeacherSchedule(tenantId: string, data: Omit<TeacherSchedule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<TeacherSchedule> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_teacher_schedules (id, tenant_id, teacher_id, teacher_name, term_id, class_id, subject_id, subject_name, time_slot_id, day_of_week) VALUES (${id}, ${tenantId}, ${data.teacherId}, ${data.teacherName}, ${data.termId}, ${data.classId}, ${data.subjectId}, ${data.subjectName}, ${data.timeSlotId}, ${data.dayOfWeek}) RETURNING *`
  return rowToSchedule(result.rows[0])
}

export async function updateTeacherSchedule(id: string, data: Partial<TeacherSchedule>): Promise<TeacherSchedule | null> {
  const result = await sql`UPDATE timetable_teacher_schedules SET teacher_name = COALESCE(${data.teacherName ?? null}, teacher_name), class_id = COALESCE(${data.classId ?? null}, class_id), subject_id = COALESCE(${data.subjectId ?? null}, subject_id), subject_name = COALESCE(${data.subjectName ?? null}, subject_name), time_slot_id = COALESCE(${data.timeSlotId ?? null}, time_slot_id), day_of_week = COALESCE(${data.dayOfWeek ?? null}, day_of_week), updated_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToSchedule(result.rows[0]) : null
}

export async function deleteTeacherSchedule(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM timetable_teacher_schedules WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}
