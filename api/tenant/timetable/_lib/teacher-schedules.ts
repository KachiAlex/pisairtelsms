import { randomUUID } from 'crypto'

export interface TeacherSchedule {
  id: string
  tenantId: string
  teacherId: string
  teacherName: string
  termId: string
  totalHours: number
  totalClasses: number
  maxHoursLimit: number | null
  createdAt: string
  updatedAt: string
}

export interface TeacherWorkloadEntry {
  id: string
  scheduleId: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  hoursPerWeek: number
  dayOfWeek: number
  timeSlotId: string
  createdAt: string
  updatedAt: string
}

const schedulesStore = new Map<string, TeacherSchedule>()
const workloadStore = new Map<string, TeacherWorkloadEntry>()

function initMockData() {
  if (schedulesStore.size > 0) return
  const tenantId = 'demo-tenant-001'
  const now = new Date().toISOString()

  const teachers = [
    { id: 'teacher-femi', name: 'Mr. Femi', totalHours: 32, totalClasses: 8 },
    { id: 'teacher-obasi', name: 'Mr. Obasi', totalHours: 28, totalClasses: 7 },
    { id: 'teacher-aminat', name: 'Mrs. Aminat', totalHours: 30, totalClasses: 7 },
    { id: 'teacher-ada', name: 'Ms. Ada', totalHours: 24, totalClasses: 6 },
  ]

  for (const t of teachers) {
    const schedule: TeacherSchedule = {
      id: `ts-${t.id}`,
      tenantId,
      teacherId: t.id,
      teacherName: t.name,
      termId: 'term-1',
      totalHours: t.totalHours,
      totalClasses: t.totalClasses,
      maxHoursLimit: 35,
      createdAt: now,
      updatedAt: now,
    }
    schedulesStore.set(schedule.id, schedule)
  }

  // Sample workload entries for Mr. Femi
  const workloadEntries: Omit<TeacherWorkloadEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { scheduleId: 'ts-teacher-femi', classId: 'JSS 1A', className: 'JSS 1A', subjectId: 'math', subjectName: 'Mathematics', hoursPerWeek: 4, dayOfWeek: 1, timeSlotId: 'slot-1' },
    { scheduleId: 'ts-teacher-femi', classId: 'JSS 2A', className: 'JSS 2A', subjectId: 'math', subjectName: 'Mathematics', hoursPerWeek: 4, dayOfWeek: 2, timeSlotId: 'slot-2' },
    { scheduleId: 'ts-teacher-femi', classId: 'SS 1C', className: 'SS 1C', subjectId: 'math', subjectName: 'Mathematics', hoursPerWeek: 4, dayOfWeek: 3, timeSlotId: 'slot-1' },
  ]
  for (const w of workloadEntries) {
    const id = randomUUID()
    workloadStore.set(id, { id, ...w, createdAt: now, updatedAt: now })
  }
}

export function getTeacherSchedules(tenantId: string, teacherId?: string, termId?: string): TeacherSchedule[] {
  initMockData()
  let schedules = Array.from(schedulesStore.values()).filter(s => s.tenantId === tenantId)
  if (teacherId) schedules = schedules.filter(s => s.teacherId === teacherId)
  if (termId) schedules = schedules.filter(s => s.termId === termId)
  return schedules
}

export function getTeacherScheduleById(id: string): (TeacherSchedule & { workload: TeacherWorkloadEntry[] }) | null {
  initMockData()
  const schedule = schedulesStore.get(id)
  if (!schedule) return null
  const workload = Array.from(workloadStore.values()).filter(w => w.scheduleId === id)
  return { ...schedule, workload }
}

export function updateTeacherSchedule(id: string, data: Partial<TeacherSchedule>): TeacherSchedule | null {
  initMockData()
  const schedule = schedulesStore.get(id)
  if (!schedule) return null
  const updated = { ...schedule, ...data, updatedAt: new Date().toISOString() }
  schedulesStore.set(id, updated)
  return updated
}
