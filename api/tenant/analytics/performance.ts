import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/analytics/performance
 * Returns performance analytics including overall metrics, grade distribution, and subject ranking
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  try {
    // Get overall average and pass rate
    const overallResult = await sql`
      SELECT 
        AVG(CAST(score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM results 
      WHERE tenant_id = ${tenantId}
    `
    const overallAverage = parseFloat(overallResult.rows[0]?.average_score || '0')
    const overallPassRate = parseFloat(overallResult.rows[0]?.pass_rate || '0')

    // Get at-risk students (average below 50)
    const atRiskResult = await sql`
      SELECT COUNT(DISTINCT student_id) as count
      FROM results 
      WHERE tenant_id = ${tenantId}
      GROUP BY student_id
      HAVING AVG(CAST(score AS NUMERIC)) < 50
    `
    const atRiskStudents = parseInt(atRiskResult.rows[0]?.count || '0')

    // Get top performers (average above 75)
    const topPerformersResult = await sql`
      SELECT COUNT(DISTINCT student_id) as count
      FROM results 
      WHERE tenant_id = ${tenantId}
      GROUP BY student_id
      HAVING AVG(CAST(score AS NUMERIC)) >= 75
    `
    const topPerformers = parseInt(topPerformersResult.rows[0]?.count || '0')

    // Get term trend
    const termTrendResult = await sql`
      SELECT 
        at.name as term,
        AVG(CAST(r.score AS NUMERIC)) as average,
        COUNT(CASE WHEN r.score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM results r
      JOIN academic_terms at ON r.term_id = at.id
      WHERE r.tenant_id = ${tenantId} AND at.tenant_id = ${tenantId}
      GROUP BY at.name
      ORDER BY at.created_at
      LIMIT 5
    `
    const termTrend = termTrendResult.rows.map(row => ({
      term: row.term,
      average: parseFloat(row.average || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
    }))

    // Get grade distribution
    const gradeDistributionResult = await sql`
      SELECT 
        CASE 
          WHEN score >= 70 THEN 'A'
          WHEN score >= 60 THEN 'B'
          WHEN score >= 50 THEN 'C'
          WHEN score >= 45 THEN 'D'
          WHEN score >= 40 THEN 'E'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
      FROM results 
      WHERE tenant_id = ${tenantId}
      GROUP BY grade
      ORDER BY grade DESC
    `
    const totalGrades = gradeDistributionResult.rows.reduce((sum, row) => sum + parseInt(row.count || '0'), 0)
    const gradeDistribution = gradeDistributionResult.rows.map(row => ({
      grade: row.grade,
      count: parseInt(row.count || '0'),
      percentage: Math.round((parseInt(row.count || '0') / totalGrades) * 100),
    }))

    // Get subject ranking
    const subjectRankingResult = await sql`
      SELECT 
        s.name as subject,
        AVG(CAST(r.score AS NUMERIC)) as average,
        ROW_NUMBER() OVER (ORDER BY AVG(CAST(r.score AS NUMERIC)) DESC) as rank
      FROM results r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.tenant_id = ${tenantId} AND s.tenant_id = ${tenantId}
      GROUP BY s.name
      ORDER BY average DESC
    `
    const subjectRanking = subjectRankingResult.rows.map(row => ({
      subject: row.subject,
      average: parseFloat(row.average || '0'),
      rank: parseInt(row.rank || '0'),
    }))

    const data = {
      overallAverage: Math.round(overallAverage * 10) / 10,
      overallPassRate: Math.round(overallPassRate),
      atRiskStudents,
      topPerformers,
      termTrend,
      gradeDistribution,
      subjectRanking,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching performance analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch performance analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
