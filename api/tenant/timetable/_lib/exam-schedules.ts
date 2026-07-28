import { randomUUID } from 'crypto'
import { sql } from '@vercel/postgres'

export interface ExamSchedule {
  id: string
  tenantId: string
  examPeriodId: string
  subjectId: string
  subjectName: string
  examDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  examType: 'written' | 'cbt' | 'practical' | 'oral'
  createdAt: string
  updatedAt: string
}

export interface ExamHall {
  id: string
  tenantId: string
  name: string
  capacity: number
  createdAt: string
  updatedAt: string
}

export interface ExamHallAssignment {
  id: string
  examScheduleId: string
  hallId: string
  hallName: string
  studentCount: number
  createdAt: string
  updatedAt: string
}

export interface Invigilator {
  id: string
  examScheduleId: string
  staffId: string
  staffName: string
  hallId: string
  createdAt: string
  updatedAt: string
}

const ts = (r: any) => r instanceof Date ? r.toISOString() : String(r)
const d = (r: any) => r instanceof Date ? r.toISOString().split('T')[0] : String(r).split('T')[0]

function rowToExam(r: any): ExamSchedule {
  return { id: r.id, tenantId: r.tenant_id, examPeriodId: r.exam_period_id, subjectId: r.subject_id, subjectName: r.subject_name, examDate: d(r.exam_date), startTime: String(r.start_time).slice(0,5), endTime: String(r.end_time).slice(0,5), durationMinutes: Number(r.duration_minutes), examType: r.exam_type, createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }
}
function rowToHall(r: any): ExamHall {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, capacity: Number(r.capacity), createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }
}
function rowToAssignment(r: any): ExamHallAssignment {
  return { id: r.id, examScheduleId: r.exam_schedule_id, hallId: r.hall_id, hallName: r.hall_name, studentCount: Number(r.student_count), createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }
}
function rowToInvigilator(r: any): Invigilator {
  return { id: r.id, examScheduleId: r.exam_schedule_id, staffId: r.staff_id, staffName: r.staff_name, hallId: r.hall_id, createdAt: ts(r.created_at), updatedAt: ts(r.updated_at) }
}

export async function getExamHalls(tenantId: string): Promise<ExamHall[]> {
  try {
    const r = await sql`SELECT * FROM timetable_exam_halls WHERE tenant_id = ${tenantId} ORDER BY name ASC`
    return r.rows.map(rowToHall)
  } catch { return [] }
}

export async function createExamHall(tenantId: string, name: string, capacity: number): Promise<ExamHall> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_exam_halls (id, tenant_id, name, capacity) VALUES (${id}, ${tenantId}, ${name}, ${capacity}) RETURNING *`
  return rowToHall(result.rows[0])
}

export async function getExamSchedules(tenantId: string, examPeriodId?: string, subjectId?: string): Promise<ExamSchedule[]> {
  try {
    if (examPeriodId && subjectId) {
      const r = await sql`SELECT * FROM timetable_exam_schedules WHERE tenant_id = ${tenantId} AND exam_period_id = ${examPeriodId} AND subject_id = ${subjectId} ORDER BY exam_date ASC`
      return r.rows.map(rowToExam)
    } else if (examPeriodId) {
      const r = await sql`SELECT * FROM timetable_exam_schedules WHERE tenant_id = ${tenantId} AND exam_period_id = ${examPeriodId} ORDER BY exam_date ASC`
      return r.rows.map(rowToExam)
    } else {
      const r = await sql`SELECT * FROM timetable_exam_schedules WHERE tenant_id = ${tenantId} ORDER BY exam_date ASC`
      return r.rows.map(rowToExam)
    }
  } catch { return [] }
}

export async function getExamScheduleById(id: string): Promise<(ExamSchedule & { hallAssignments: ExamHallAssignment[]; invigilators: Invigilator[] }) | null> {
  try {
    const sr = await sql`SELECT * FROM timetable_exam_schedules WHERE id = ${id}`
    if (!sr.rows[0]) return null
    const [ar, ir] = await Promise.all([
      sql`SELECT * FROM timetable_exam_hall_assignments WHERE exam_schedule_id = ${id}`,
      sql`SELECT * FROM timetable_invigilators WHERE exam_schedule_id = ${id}`,
    ])
    return { ...rowToExam(sr.rows[0]), hallAssignments: ar.rows.map(rowToAssignment), invigilators: ir.rows.map(rowToInvigilator) }
  } catch { return null }
}

export async function createExamSchedule(tenantId: string, data: Omit<ExamSchedule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ExamSchedule> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_exam_schedules (id, tenant_id, exam_period_id, subject_id, subject_name, exam_date, start_time, end_time, duration_minutes, exam_type) VALUES (${id}, ${tenantId}, ${data.examPeriodId}, ${data.subjectId}, ${data.subjectName}, ${data.examDate}, ${data.startTime}, ${data.endTime}, ${data.durationMinutes}, ${data.examType}) RETURNING *`
  return rowToExam(result.rows[0])
}

export async function addHallAssignment(examScheduleId: string, hallId: string, studentCount: number): Promise<ExamHallAssignment | { error: string }> {
  const hr = await sql`SELECT * FROM timetable_exam_halls WHERE id = ${hallId}`
  if (!hr.rows[0]) return { error: 'Hall not found' }
  const hall = rowToHall(hr.rows[0])
  if (studentCount > hall.capacity) return { error: `Student count (${studentCount}) exceeds hall capacity (${hall.capacity})` }
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_exam_hall_assignments (id, exam_schedule_id, hall_id, hall_name, student_count) VALUES (${id}, ${examScheduleId}, ${hallId}, ${hall.name}, ${studentCount}) RETURNING *`
  return rowToAssignment(result.rows[0])
}

export async function addInvigilator(examScheduleId: string, staffId: string, staffName: string, hallId: string): Promise<Invigilator | { error: string }> {
  const er = await sql`SELECT * FROM timetable_exam_schedules WHERE id = ${examScheduleId}`
  if (!er.rows[0]) return { error: 'Exam schedule not found' }
  const exam = rowToExam(er.rows[0])
  const overlap = await sql`SELECT 1 FROM timetable_invigilators inv JOIN timetable_exam_schedules es ON es.id = inv.exam_schedule_id WHERE inv.staff_id = ${staffId} AND inv.exam_schedule_id != ${examScheduleId} AND es.exam_date = ${exam.examDate} AND es.start_time < ${exam.endTime} AND es.end_time > ${exam.startTime} LIMIT 1`
  if (overlap.rows.length > 0) return { error: `${staffName} is already assigned to another exam at this time` }
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_invigilators (id, exam_schedule_id, staff_id, staff_name, hall_id) VALUES (${id}, ${examScheduleId}, ${staffId}, ${staffName}, ${hallId}) RETURNING *`
  return rowToInvigilator(result.rows[0])
}

export async function removeInvigilator(invigilatorId: string): Promise<boolean> {
  const result = await sql`DELETE FROM timetable_invigilators WHERE id = ${invigilatorId}`
  return (result.rowCount ?? 0) > 0
}
