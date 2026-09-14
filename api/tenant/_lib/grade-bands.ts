/**
 * Shared grade band utilities.
 *
 * Extracted from the duplicated getGradeBands / DEFAULT_BANDS / assignGradeFromBands
 * implementations that previously lived in:
 *   - api/tenant/_lib/results.ts
 *   - api/tenant/transcript.ts
 *   - api/student/transcript.ts
 *   - api/student/results.ts
 *   - api/parent/transcript.ts
 */

import { poolQuery } from '../../_lib/pg-pool.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GradeBand {
  grade: string
  minScore: number
  maxScore: number
  remark: string
  gpaWeight: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_BANDS: GradeBand[] = [
  { grade: 'A1', minScore: 80, maxScore: 100, remark: 'Distinction', gpaWeight: 4.0 },
  { grade: 'B2', minScore: 70, maxScore: 79, remark: 'Very Good', gpaWeight: 3.5 },
  { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good', gpaWeight: 3.0 },
  { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit', gpaWeight: 2.5 },
  { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit', gpaWeight: 2.0 },
  { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Satisfactory', gpaWeight: 1.5 },
  { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass', gpaWeight: 1.0 },
  { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Marginal Pass', gpaWeight: 0.5 },
  { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail', gpaWeight: 0.0 },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map a class name to a broad level: 'primary' | 'jss' | 'sss'.
 */
export function getLevelForClass(className: string): 'primary' | 'jss' | 'sss' {
  const upper = className.toUpperCase()
  // Check JSS/Junior first — 'JSS' contains 'SS', so the SS check would
  // incorrectly classify JSS classes as 'sss' if checked first.
  if (upper.includes('JSS') || upper.includes('JUNIOR') || upper.includes('JS')) return 'jss'
  if (upper.includes('SSS') || upper.includes('SENIOR') || upper.includes('SS')) return 'sss'
  return 'primary'
}

/**
 * Assign a grade/remark/gpaWeight from a score using the supplied bands.
 * Falls back to the first band whose minScore is met, then to F9.
 */
export function assignGradeFromBands(
  score: number,
  bands: GradeBand[]
): { grade: string; remark: string; gpaWeight: number } {
  for (const band of bands) {
    if (score >= band.minScore && score <= band.maxScore) {
      return { grade: band.grade, remark: band.remark, gpaWeight: band.gpaWeight }
    }
  }
  for (const band of bands) {
    if (score >= band.minScore) {
      return { grade: band.grade, remark: band.remark, gpaWeight: band.gpaWeight }
    }
  }
  return { grade: 'F9', remark: 'Fail', gpaWeight: 0 }
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Load grade bands for a tenant, optionally filtered by class level.
 *
 * Resolution order:
 *   1. Live grading scale matching the class-level type (primary / secondary)
 *   2. Any live grading scale for the tenant
 *   3. DEFAULT_BANDS
 *
 * Returns DEFAULT_BANDS on any database error (non-critical fallback).
 */
export async function getGradeBands(
  tenantId: string,
  classLevel?: string
): Promise<GradeBand[]> {
  try {
    let scaleType: string | null = null
    if (classLevel === 'primary') scaleType = 'primary'
    else if (classLevel === 'jss' || classLevel === 'sss') scaleType = 'secondary'

    let scaleRes

    if (scaleType) {
      // Try type-specific live scale first
      scaleRes = await poolQuery(
        `SELECT id FROM grading_scales
         WHERE tenant_id = $1 AND status = 'live' AND type = $2
         ORDER BY updated_at DESC LIMIT 1`,
        [tenantId, scaleType]
      )
      // Fall back to any live scale if no type-specific match
      if (!scaleRes.rows[0]) {
        scaleRes = await poolQuery(
          `SELECT id FROM grading_scales
           WHERE tenant_id = $1 AND status = 'live'
           ORDER BY updated_at DESC LIMIT 1`,
          [tenantId]
        )
      }
    } else {
      scaleRes = await poolQuery(
        `SELECT id FROM grading_scales
         WHERE tenant_id = $1 AND status = 'live'
         ORDER BY updated_at DESC LIMIT 1`,
        [tenantId]
      )
    }

    if (!scaleRes.rows[0]) return DEFAULT_BANDS

    const scaleId = scaleRes.rows[0].id
    const bandsRes = await poolQuery(
      `SELECT grade, min_score, max_score, remark, gpa_weight
       FROM grading_scale_bands
       WHERE scale_id = $1
       ORDER BY min_score DESC`,
      [scaleId]
    )

    if (bandsRes.rows.length === 0) return DEFAULT_BANDS

    return bandsRes.rows.map((r: any) => ({
      grade: r.grade,
      minScore: Number(r.min_score),
      maxScore: Number(r.max_score),
      remark: r.remark || '',
      gpaWeight: Number(r.gpa_weight || 0),
    }))
  } catch {
    return DEFAULT_BANDS
  }
}
