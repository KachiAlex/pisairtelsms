// In-memory mock storage for attendance records
const attendanceStore = new Map<string, AttendanceRecord>()

export interface AttendanceRecord {
  id: string
  studentId: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
  academicSession: string
  term: string
  createdAt: string
}

export interface AttendancePayload {
  studentId: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
  academicSession: string
  term: string
}

// Initialize with sample attendance data
function initializeMockData() {
  if (attendanceStore.size > 0) return

  const students = ['STU001', 'STU002', 'STU003', 'STU004', 'STU005']
  const classes = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2']
  const statuses: Array<'present' | 'absent' | 'late'> = ['present', 'absent', 'late']
  const today = new Date()

  let id = 1
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    for (const studentId of students) {
      const classIdx = Math.floor(Math.random() * classes.length)
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      const record: AttendanceRecord = {
        id: `att_${id}`,
        studentId,
        class: classes[classIdx],
        date: dateStr,
        status,
        academicSession: '2024/2025',
        term: '1',
        createdAt: new Date().toISOString(),
      }

      attendanceStore.set(`${studentId}_${dateStr}`, record)
      id++
    }
  }
}

export async function fetchAttendance(
  className?: string,
  date?: string,
  term?: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> {
  initializeMockData()

  let records = Array.from(attendanceStore.values())

  if (className) {
    records = records.filter(r => r.class === className)
  }

  if (date) {
    records = records.filter(r => r.date === date)
  }

  if (term) {
    records = records.filter(r => r.term === term)
  }

  if (startDate && endDate) {
    records = records.filter(r => r.date >= startDate && r.date <= endDate)
  }

  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function upsertAttendanceBatch(records: AttendancePayload[]): Promise<number> {
  initializeMockData()

  let count = 0
  for (const record of records) {
    const key = `${record.studentId}_${record.date}`
    const id = attendanceStore.has(key) ? attendanceStore.get(key)!.id : `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    attendanceStore.set(key, {
      id,
      ...record,
      createdAt: new Date().toISOString(),
    })
    count++
  }

  return count
}
