import { sql } from '../../_lib/sql.js'

// Academic sessions live in Timetable & Scheduling (academic_years) — the
// single source of truth, same as timetable_terms is for term names.
// Returns null when the lookup can't run (table missing, DB unreachable)
// so callers skip enforcement rather than block writes.
export async function getAcademicSessionNames(tenantId: string): Promise<string[] | null> {
  try {
    const res = await sql`SELECT name FROM academic_years WHERE tenant_id = ${tenantId} ORDER BY start_date DESC`
    return res.rows.map(r => r.name)
  } catch {
    return null
  }
}
