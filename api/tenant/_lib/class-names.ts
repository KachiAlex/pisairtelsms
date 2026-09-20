/**
 * Class name normalization — single source of truth for class naming.
 *
 * Canonical format: band letters + space + digits, e.g. 'JSS 1', 'SS 3'.
 * An arm suffix may follow, e.g. 'JSS 1 A' or 'SS 1 Science A'.
 *
 * The classes table stores name ('JSS 1') and arm ('A') separately;
 * dependent tables store either the base name or the display form.
 */

/**
 * Normalize a class name to canonical spacing/casing.
 * 'JSS1' → 'JSS 1', 'jss  1' → 'JSS 1', 'JSS1 A' → 'JSS 1 A',
 * 'SS3' → 'SS 3', 'SS 1 Science A' → 'SS 1 Science A'.
 * Names without a letter+digit pattern pass through trimmed.
 */
export function normalizeClassName(raw: string | null | undefined): string {
  if (!raw) return ''
  const cleaned = String(raw).trim().replace(/\s+/g, ' ')
  return cleaned.replace(/^([A-Za-z]+)\s*([0-9]+)/, (_m, band: string, num: string) =>
    `${band.toUpperCase()} ${num}`
  )
}

/**
 * Canonical display label for a classes-table row:
 * ('JSS 1', 'A') → 'JSS 1 A'; ('JSS 1', null) → 'JSS 1'.
 */
export function classDisplayName(name: string, arm?: string | null): string {
  const base = normalizeClassName(name)
  const a = (arm ?? '').trim()
  return a ? `${base} ${a}` : base
}

/**
 * SQL predicate fragment matching a column to a base class name, covering
 * both stored forms: exact 'JSS 1' (students) and arm-suffixed 'JSS 1 A'
 * (student_scores, exams). Placeholder $N must bind the base name.
 * Usage: `AND (${classMatches('ss.class', 3)})`
 */
export function classMatches(column: string, paramIndex: number): string {
  return `${column} = $${paramIndex} OR ${column} LIKE $${paramIndex} || ' %'`
}
