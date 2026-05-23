import { randomUUID } from 'crypto'
import { sql } from '@vercel/postgres'

export interface AcademicYear {
  id: string
  tenantId: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
  createdAt: string
  updatedAt: string
}

export interface SchoolTerm {
  id: string
  tenantId: string
  name: string
  startDate: string
  endDate: string
  academicYear: string
  academicYearId?: string
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

function rowToAcademicYear(r: any): AcademicYear {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, startDate: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date), endDate: r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date), isCurrent: r.is_current, createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}

function rowToTerm(r: any): SchoolTerm {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, startDate: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date), endDate: r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date), academicYear: r.academic_year, academicYearId: r.academic_year_id, createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}
function rowToHoliday(r: any): Holiday {
  return { id: r.id, tenantId: r.tenant_id, termId: r.term_id, name: r.name, startDate: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date), endDate: r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}
function rowToExamPeriod(r: any): ExamPeriod {
  return { id: r.id, tenantId: r.tenant_id, termId: r.term_id, name: r.name, startDate: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date), endDate: r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date), createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at), updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at) }
}

// Academic Years
export async function getAcademicYears(tenantId: string): Promise<AcademicYear[]> {
  try {
    const result = await sql`SELECT * FROM academic_years WHERE tenant_id = ${tenantId} ORDER BY start_date DESC`
    return result.rows.map(rowToAcademicYear)
  } catch { return [] }
}

export async function getAcademicYear(id: string): Promise<AcademicYear | null> {
  try {
    const result = await sql`SELECT * FROM academic_years WHERE id = ${id} LIMIT 1`
    return result.rows[0] ? rowToAcademicYear(result.rows[0]) : null
  } catch { return null }
}

export async function createAcademicYear(tenantId: string, data: Omit<AcademicYear, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<AcademicYear> {
  const id = randomUUID()
  const result = await sql`INSERT INTO academic_years (id, tenant_id, name, start_date, end_date, is_current) VALUES (${id}, ${tenantId}, ${data.name}, ${data.startDate}, ${data.endDate}, ${data.isCurrent}) RETURNING *`
  return rowToAcademicYear(result.rows[0])
}

export async function updateAcademicYear(id: string, data: Partial<AcademicYear>): Promise<AcademicYear | null> {
  const result = await sql`UPDATE academic_years SET name = COALESCE(${data.name ?? null}, name), start_date = COALESCE(${data.startDate ?? null}, start_date), end_date = COALESCE(${data.endDate ?? null}, end_date), is_current = COALESCE(${data.isCurrent ?? null}, is_current), updated_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToAcademicYear(result.rows[0]) : null
}

export async function deleteAcademicYear(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM academic_years WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

export async function setCurrentAcademicYear(tenantId: string, id: string): Promise<void> {
  await sql`UPDATE academic_years SET is_current = false WHERE tenant_id = ${tenantId}`
  await sql`UPDATE academic_years SET is_current = true WHERE id = ${id}`
}

// Terms
export async function getTerms(tenantId: string, academicYear?: string): Promise<SchoolTerm[]> {
  try {
    const result = academicYear
      ? await sql`SELECT * FROM timetable_terms WHERE tenant_id = ${tenantId} AND academic_year = ${academicYear} ORDER BY start_date ASC`
      : await sql`SELECT * FROM timetable_terms WHERE tenant_id = ${tenantId} ORDER BY start_date ASC`
    return result.rows.map(rowToTerm)
  } catch { return [] }
}

export async function createTerm(tenantId: string, data: Omit<SchoolTerm, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<SchoolTerm> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_terms (id, tenant_id, name, start_date, end_date, academic_year) VALUES (${id}, ${tenantId}, ${data.name}, ${data.startDate}, ${data.endDate}, ${data.academicYear}) RETURNING *`
  return rowToTerm(result.rows[0])
}

export async function updateTerm(id: string, data: Partial<SchoolTerm>): Promise<SchoolTerm | null> {
  const result = await sql`UPDATE timetable_terms SET name = COALESCE(${data.name ?? null}, name), start_date = COALESCE(${data.startDate ?? null}, start_date), end_date = COALESCE(${data.endDate ?? null}, end_date), academic_year = COALESCE(${data.academicYear ?? null}, academic_year), updated_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToTerm(result.rows[0]) : null
}

export async function deleteTerm(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM timetable_terms WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

export async function termsOverlap(tenantId: string, startDate: string, endDate: string, excludeId?: string): Promise<boolean> {
  const result = excludeId
    ? await sql`SELECT 1 FROM timetable_terms WHERE tenant_id = ${tenantId} AND id != ${excludeId} AND start_date <= ${endDate} AND end_date >= ${startDate} LIMIT 1`
    : await sql`SELECT 1 FROM timetable_terms WHERE tenant_id = ${tenantId} AND start_date <= ${endDate} AND end_date >= ${startDate} LIMIT 1`
  return result.rows.length > 0
}

// Holidays
export async function getHolidays(tenantId: string, termId?: string): Promise<Holiday[]> {
  try {
    const result = termId
      ? await sql`SELECT * FROM timetable_holidays WHERE tenant_id = ${tenantId} AND term_id = ${termId} ORDER BY start_date ASC`
      : await sql`SELECT * FROM timetable_holidays WHERE tenant_id = ${tenantId} ORDER BY start_date ASC`
    return result.rows.map(rowToHoliday)
  } catch { return [] }
}

export async function createHoliday(tenantId: string, data: Omit<Holiday, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Holiday> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_holidays (id, tenant_id, term_id, name, start_date, end_date) VALUES (${id}, ${tenantId}, ${data.termId}, ${data.name}, ${data.startDate}, ${data.endDate}) RETURNING *`
  return rowToHoliday(result.rows[0])
}

export async function updateHoliday(id: string, data: Partial<Holiday>): Promise<Holiday | null> {
  const result = await sql`UPDATE timetable_holidays SET name = COALESCE(${data.name ?? null}, name), start_date = COALESCE(${data.startDate ?? null}, start_date), end_date = COALESCE(${data.endDate ?? null}, end_date), updated_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToHoliday(result.rows[0]) : null
}

export async function deleteHoliday(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM timetable_holidays WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

// Exam Periods
export async function getExamPeriods(tenantId: string, termId?: string): Promise<ExamPeriod[]> {
  try {
    const result = termId
      ? await sql`SELECT * FROM timetable_exam_periods WHERE tenant_id = ${tenantId} AND term_id = ${termId} ORDER BY start_date ASC`
      : await sql`SELECT * FROM timetable_exam_periods WHERE tenant_id = ${tenantId} ORDER BY start_date ASC`
    return result.rows.map(rowToExamPeriod)
  } catch { return [] }
}

export async function createExamPeriod(tenantId: string, data: Omit<ExamPeriod, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ExamPeriod> {
  const id = randomUUID()
  const result = await sql`INSERT INTO timetable_exam_periods (id, tenant_id, term_id, name, start_date, end_date) VALUES (${id}, ${tenantId}, ${data.termId}, ${data.name}, ${data.startDate}, ${data.endDate}) RETURNING *`
  return rowToExamPeriod(result.rows[0])
}

export async function updateExamPeriod(id: string, data: Partial<ExamPeriod>): Promise<ExamPeriod | null> {
  const result = await sql`UPDATE timetable_exam_periods SET name = COALESCE(${data.name ?? null}, name), start_date = COALESCE(${data.startDate ?? null}, start_date), end_date = COALESCE(${data.endDate ?? null}, end_date), updated_at = NOW() WHERE id = ${id} RETURNING *`
  return result.rows[0] ? rowToExamPeriod(result.rows[0]) : null
}

export async function deleteExamPeriod(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM timetable_exam_periods WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}
