import { randomUUID } from 'crypto'

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

const schedulesStore = new Map<string, ExamSchedule>()
const hallsStore = new Map<string, ExamHall>()
const assignmentsStore = new Map<string, ExamHallAssignment>()
const invigilatorsStore = new Map<string, Invigilator>()

function initMockData() {
  if (schedulesStore.size > 0) return
  const tenantId = 'demo-tenant-001'
  const now = new Date().toISOString()

  const halls: ExamHall[] = [
    { id: 'hall-1', tenantId, name: 'Hall 1', capacity: 200, createdAt: now, updatedAt: now },
    { id: 'hall-2', tenantId, name: 'Hall 2', capacity: 150, createdAt: now, updatedAt: now },
    { id: 'hall-3', tenantId, name: 'Lab A', capacity: 40, createdAt: now, updatedAt: now },
  ]
  for (const h of halls) hallsStore.set(h.id, h)

  const exams: ExamSchedule[] = [
    { id: 'exam-1', tenantId, examPeriodId: 'ep-1', subjectId: 'math', subjectName: 'Mathematics', examDate: '2024-11-25', startTime: '08:00', endTime: '10:00', durationMinutes: 120, examType: 'written', createdAt: now, updatedAt: now },
    { id: 'exam-2', tenantId, examPeriodId: 'ep-1', subjectId: 'eng', subjectName: 'English Language', examDate: '2024-11-26', startTime: '08:00', endTime: '10:30', durationMinutes: 150, examType: 'written', createdAt: now, updatedAt: now },
    { id: 'exam-3', tenantId, examPeriodId: 'ep-1', subjectId: 'ict', subjectName: 'ICT', examDate: '2024-11-27', startTime: '10:00', endTime: '11:30', durationMinutes: 90, examType: 'cbt', createdAt: now, updatedAt: now },
  ]
  for (const e of exams) schedulesStore.set(e.id, e)

  const assignment: ExamHallAssignment = {
    id: 'assign-1', examScheduleId: 'exam-1', hallId: 'hall-1', hallName: 'Hall 1', studentCount: 180, createdAt: now, updatedAt: now,
  }
  assignmentsStore.set(assignment.id, assignment)

  const invigilator: Invigilator = {
    id: 'inv-1', examScheduleId: 'exam-1', staffId: 'teacher-obasi', staffName: 'Mr. Obasi', hallId: 'hall-1', createdAt: now, updatedAt: now,
  }
  invigilatorsStore.set(invigilator.id, invigilator)
}

export function getExamHalls(tenantId: string): ExamHall[] {
  initMockData()
  return Array.from(hallsStore.values()).filter(h => h.tenantId === tenantId)
}

export function getExamSchedules(tenantId: string, examPeriodId?: string, subjectId?: string): ExamSchedule[] {
  initMockData()
  let schedules = Array.from(schedulesStore.values()).filter(s => s.tenantId === tenantId)
  if (examPeriodId) schedules = schedules.filter(s => s.examPeriodId === examPeriodId)
  if (subjectId) schedules = schedules.filter(s => s.subjectId === subjectId)
  return schedules.sort((a, b) => a.examDate.localeCompare(b.examDate))
}

export function getExamScheduleById(id: string): (ExamSchedule & { hallAssignments: ExamHallAssignment[]; invigilators: Invigilator[] }) | null {
  initMockData()
  const schedule = schedulesStore.get(id)
  if (!schedule) return null
  const hallAssignments = Array.from(assignmentsStore.values()).filter(a => a.examScheduleId === id)
  const invigilators = Array.from(invigilatorsStore.values()).filter(i => i.examScheduleId === id)
  return { ...schedule, hallAssignments, invigilators }
}

export function createExamSchedule(tenantId: string, data: Omit<ExamSchedule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): ExamSchedule {
  initMockData()
  const now = new Date().toISOString()
  const schedule: ExamSchedule = { id: randomUUID(), tenantId, ...data, createdAt: now, updatedAt: now }
  schedulesStore.set(schedule.id, schedule)
  return schedule
}

export function addHallAssignment(examScheduleId: string, hallId: string, studentCount: number): ExamHallAssignment | { error: string } {
  initMockData()
  const hall = hallsStore.get(hallId)
  if (!hall) return { error: 'Hall not found' }
  if (studentCount > hall.capacity) return { error: `Student count (${studentCount}) exceeds hall capacity (${hall.capacity})` }
  const now = new Date().toISOString()
  const assignment: ExamHallAssignment = { id: randomUUID(), examScheduleId, hallId, hallName: hall.name, studentCount, createdAt: now, updatedAt: now }
  assignmentsStore.set(assignment.id, assignment)
  return assignment
}

export function addInvigilator(examScheduleId: string, staffId: string, staffName: string, hallId: string): Invigilator | { error: string } {
  initMockData()
  const exam = schedulesStore.get(examScheduleId)
  if (!exam) return { error: 'Exam schedule not found' }
  // Check for overlapping invigilator assignments on same date/time
  const overlapping = Array.from(invigilatorsStore.values()).some(inv => {
    if (inv.staffId !== staffId || inv.examScheduleId === examScheduleId) return false
    const otherExam = schedulesStore.get(inv.examScheduleId)
    if (!otherExam) return false
    return otherExam.examDate === exam.examDate && otherExam.startTime < exam.endTime && otherExam.endTime > exam.startTime
  })
  if (overlapping) return { error: `${staffName} is already assigned to another exam at this time` }
  const now = new Date().toISOString()
  const invigilator: Invigilator = { id: randomUUID(), examScheduleId, staffId, staffName, hallId, createdAt: now, updatedAt: now }
  invigilatorsStore.set(invigilator.id, invigilator)
  return invigilator
}

export function removeInvigilator(invigilatorId: string): boolean {
  return invigilatorsStore.delete(invigilatorId)
}
