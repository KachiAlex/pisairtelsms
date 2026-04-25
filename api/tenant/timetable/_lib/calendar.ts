// In-memory mock storage for school calendar data
import { randomUUID } from 'crypto'

export interface SchoolTerm {
  id: string
  tenantId: string
  name: string
  startDate: string
  endDate: string
  academicYear: string
  createdAt: string
  updatedAt: string
}

export interface Holiday {
  id: string
  tenantId: string
  termId: string
  name: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface ExamPeriod {
  id: string
  tenantId: string
  termId: string
  name: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

const termsStore = new Map<string, SchoolTerm>()
const holidaysStore = new Map<string, Holiday>()
const examPeriodsStore = new Map<string, ExamPeriod>()

function initMockData() {
  if (termsStore.size > 0) return
  const tenantId = 'demo-tenant-001'
  const now = new Date().toISOString()

  const term1: SchoolTerm = {
    id: 'term-1',
    tenantId,
    name: 'First Term',
    startDate: '2024-09-09',
    endDate: '2024-12-13',
    academicYear: '2024/2025',
    createdAt: now,
    updatedAt: now,
  }
  const term2: SchoolTerm = {
    id: 'term-2',
    tenantId,
    name: 'Second Term',
    startDate: '2025-01-13',
    endDate: '2025-04-04',
    academicYear: '2024/2025',
    createdAt: now,
    updatedAt: now,
  }
  const term3: SchoolTerm = {
    id: 'term-3',
    tenantId,
    name: 'Third Term',
    startDate: '2025-04-28',
    endDate: '2025-07-25',
    academicYear: '2024/2025',
    createdAt: now,
    updatedAt: now,
  }
  termsStore.set(term1.id, term1)
  termsStore.set(term2.id, term2)
  termsStore.set(term3.id, term3)

  const holiday1: Holiday = {
    id: 'hol-1',
    tenantId,
    termId: 'term-1',
    name: 'Mid-Term Break',
    startDate: '2024-10-28',
    endDate: '2024-11-01',
    createdAt: now,
    updatedAt: now,
  }
  holidaysStore.set(holiday1.id, holiday1)

  const ep1: ExamPeriod = {
    id: 'ep-1',
    tenantId,
    termId: 'term-1',
    name: 'First Term Exams',
    startDate: '2024-11-25',
    endDate: '2024-12-06',
    createdAt: now,
    updatedAt: now,
  }
  examPeriodsStore.set(ep1.id, ep1)
}

// Terms
export function getTerms(tenantId: string, academicYear?: string): SchoolTerm[] {
  initMockData()
  let terms = Array.from(termsStore.values()).filter(t => t.tenantId === tenantId)
  if (academicYear) terms = terms.filter(t => t.academicYear === academicYear)
  return terms.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function createTerm(tenantId: string, data: Omit<SchoolTerm, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): SchoolTerm {
  initMockData()
  const now = new Date().toISOString()
  const term: SchoolTerm = { id: randomUUID(), tenantId, ...data, createdAt: now, updatedAt: now }
  termsStore.set(term.id, term)
  return term
}

export function updateTerm(id: string, data: Partial<SchoolTerm>): SchoolTerm | null {
  initMockData()
  const term = termsStore.get(id)
  if (!term) return null
  const updated = { ...term, ...data, updatedAt: new Date().toISOString() }
  termsStore.set(id, updated)
  return updated
}

export function deleteTerm(id: string): boolean {
  initMockData()
  return termsStore.delete(id)
}

export function termsOverlap(tenantId: string, startDate: string, endDate: string, excludeId?: string): boolean {
  const terms = getTerms(tenantId)
  return terms.some(t => {
    if (excludeId && t.id === excludeId) return false
    return startDate <= t.endDate && endDate >= t.startDate
  })
}

// Holidays
export function getHolidays(tenantId: string, termId?: string): Holiday[] {
  initMockData()
  let holidays = Array.from(holidaysStore.values()).filter(h => h.tenantId === tenantId)
  if (termId) holidays = holidays.filter(h => h.termId === termId)
  return holidays.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function createHoliday(tenantId: string, data: Omit<Holiday, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Holiday {
  initMockData()
  const now = new Date().toISOString()
  const holiday: Holiday = { id: randomUUID(), tenantId, ...data, createdAt: now, updatedAt: now }
  holidaysStore.set(holiday.id, holiday)
  return holiday
}

export function updateHoliday(id: string, data: Partial<Holiday>): Holiday | null {
  initMockData()
  const holiday = holidaysStore.get(id)
  if (!holiday) return null
  const updated = { ...holiday, ...data, updatedAt: new Date().toISOString() }
  holidaysStore.set(id, updated)
  return updated
}

export function deleteHoliday(id: string): boolean {
  return holidaysStore.delete(id)
}

// Exam Periods
export function getExamPeriods(tenantId: string, termId?: string): ExamPeriod[] {
  initMockData()
  let periods = Array.from(examPeriodsStore.values()).filter(e => e.tenantId === tenantId)
  if (termId) periods = periods.filter(e => e.termId === termId)
  return periods.sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function createExamPeriod(tenantId: string, data: Omit<ExamPeriod, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): ExamPeriod {
  initMockData()
  const now = new Date().toISOString()
  const period: ExamPeriod = { id: randomUUID(), tenantId, ...data, createdAt: now, updatedAt: now }
  examPeriodsStore.set(period.id, period)
  return period
}

export function updateExamPeriod(id: string, data: Partial<ExamPeriod>): ExamPeriod | null {
  initMockData()
  const period = examPeriodsStore.get(id)
  if (!period) return null
  const updated = { ...period, ...data, updatedAt: new Date().toISOString() }
  examPeriodsStore.set(id, updated)
  return updated
}

export function deleteExamPeriod(id: string): boolean {
  return examPeriodsStore.delete(id)
}
