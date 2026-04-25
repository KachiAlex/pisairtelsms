import { randomUUID } from 'crypto'

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
  dayOfWeek: number  // 1=Mon … 5=Fri
  createdAt: string
  updatedAt: string
}

const schedulesStore = new Map<string, ClassSchedule>()
const entriesStore = new Map<string, ClassScheduleEntry>()

function initMockData() {
  if (schedulesStore.size > 0) return
  const tenantId = 'demo-tenant-001'
  const now = new Date().toISOString()

  const schedule: ClassSchedule = {
    id: 'cs-jss1a-t1',
    tenantId,
    classId: 'JSS 1A',
    termId: 'term-1',
    createdAt: now,
    updatedAt: now,
  }
  schedulesStore.set(schedule.id, schedule)

  const entries: Omit<ClassScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { scheduleId: 'cs-jss1a-t1', timeSlotId: 'slot-1', subjectId: 'math', subjectName: 'Mathematics', teacherId: 'teacher-femi', teacherName: 'Mr. Femi', dayOfWeek: 1 },
    { scheduleId: 'cs-jss1a-t1', timeSlotId: 'slot-2', subjectId: 'eng', subjectName: 'English', teacherId: 'teacher-ada', teacherName: 'Ms. Ada', dayOfWeek: 1 },
    { scheduleId: 'cs-jss1a-t1', timeSlotId: 'slot-1', subjectId: 'eng', subjectName: 'English', teacherId: 'teacher-ada', teacherName: 'Ms. Ada', dayOfWeek: 2 },
    { scheduleId: 'cs-jss1a-t1', timeSlotId: 'slot-2', subjectId: 'math', subjectName: 'Mathematics', teacherId: 'teacher-femi', teacherName: 'Mr. Femi', dayOfWeek: 2 },
  ]
  for (const e of entries) {
    const id = randomUUID()
    entriesStore.set(id, { id, ...e, createdAt: now, updatedAt: now })
  }
}

export function getClassSchedules(tenantId: string, classId?: string, termId?: string): ClassSchedule[] {
  initMockData()
  let schedules = Array.from(schedulesStore.values()).filter(s => s.tenantId === tenantId)
  if (classId) schedules = schedules.filter(s => s.classId === classId)
  if (termId) schedules = schedules.filter(s => s.termId === termId)
  return schedules
}

export function getClassScheduleById(id: string): (ClassSchedule & { entries: ClassScheduleEntry[] }) | null {
  initMockData()
  const schedule = schedulesStore.get(id)
  if (!schedule) return null
  const entries = Array.from(entriesStore.values()).filter(e => e.scheduleId === id)
  return { ...schedule, entries }
}

export function createClassSchedule(tenantId: string, classId: string, termId: string): ClassSchedule {
  initMockData()
  const now = new Date().toISOString()
  const schedule: ClassSchedule = { id: randomUUID(), tenantId, classId, termId, createdAt: now, updatedAt: now }
  schedulesStore.set(schedule.id, schedule)
  return schedule
}

export function addScheduleEntry(scheduleId: string, data: Omit<ClassScheduleEntry, 'id' | 'scheduleId' | 'createdAt' | 'updatedAt'>): ClassScheduleEntry {
  initMockData()
  const now = new Date().toISOString()
  const entry: ClassScheduleEntry = { id: randomUUID(), scheduleId, ...data, createdAt: now, updatedAt: now }
  entriesStore.set(entry.id, entry)
  return entry
}

export function updateScheduleEntry(entryId: string, data: Partial<ClassScheduleEntry>): ClassScheduleEntry | null {
  initMockData()
  const entry = entriesStore.get(entryId)
  if (!entry) return null
  const updated = { ...entry, ...data, updatedAt: new Date().toISOString() }
  entriesStore.set(entryId, updated)
  return updated
}

export function deleteScheduleEntry(entryId: string): boolean {
  return entriesStore.delete(entryId)
}

export function isTeacherAvailable(teacherId: string, timeSlotId: string, dayOfWeek: number, excludeEntryId?: string): boolean {
  initMockData()
  return !Array.from(entriesStore.values()).some(e => {
    if (excludeEntryId && e.id === excludeEntryId) return false
    return e.teacherId === teacherId && e.timeSlotId === timeSlotId && e.dayOfWeek === dayOfWeek
  })
}
