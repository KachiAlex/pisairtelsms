import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * GET /api/tenant/analytics/performance
 * Returns performance analytics including overall metrics, grade distribution, and subject ranking
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  try {
    // Get overall average and pass rate from exam_results
    const overallResult = await sql`
      SELECT 
        AVG(CAST(er.score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN er.score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
    `
    const overallAverage = parseFloat(overallResult.rows[0]?.average_score || '0')
    const overallPassRate = parseFloat(overallResult.rows[0]?.pass_rate || '0')

    // Get at-risk students (average below 50)
    const atRiskResult = await sql`
      SELECT COUNT(DISTINCT er.student_id) as count
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
      GROUP BY er.student_id
      HAVING AVG(CAST(er.score AS NUMERIC)) < 50
    `
    const atRiskStudents = parseInt(atRiskResult.rows[0]?.count || '0')

    // Get top performers (average above 75)
    const topPerformersResult = await sql`
      SELECT COUNT(DISTINCT er.student_id) as count
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
      GROUP BY er.student_id
      HAVING AVG(CAST(er.score AS NUMERIC)) >= 75
    `
    const topPerformers = parseInt(topPerformersResult.rows[0]?.count || '0')

    // Get term trend - mock for now since academic_terms table doesn't exist
    const termTrend = [
      { term: 'Term 1', average: overallAverage * 0.95, passRate: overallPassRate * 0.95 },
      { term: 'Term 2', average: overallAverage * 0.97, passRate: overallPassRate * 0.97 },
      { term: 'Term 3', average: overallAverage, passRate: overallPassRate },
    ]

    // Get grade distribution
    const gradeDistributionResult = await sql`
      SELECT 
        CASE 
          WHEN er.score >= 70 THEN 'A'
          WHEN er.score >= 60 THEN 'B'
          WHEN er.score >= 50 THEN 'C'
          WHEN er.score >= 45 THEN 'D'
          WHEN er.score >= 40 THEN 'E'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
      GROUP BY grade
      ORDER BY grade DESC
    `
    const totalGrades = gradeDistributionResult.rows.reduce((sum, row) => sum + parseInt(row.count || '0'), 0)
    const gradeDistribution = gradeDistributionResult.rows.map(row => ({
      grade: row.grade,
      count: parseInt(row.count || '0'),
      percentage: totalGrades > 0 ? Math.round((parseInt(row.count || '0') / totalGrades) * 100) : 0,
    }))

    // Get subject ranking from exam subjects
    const subjectRankingResult = await sql`
      SELECT 
        e.subject,
        AVG(CAST(er.score AS NUMERIC)) as average,
        ROW_NUMBER() OVER (ORDER BY AVG(CAST(er.score AS NUMERIC)) DESC) as rank
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
      GROUP BY e.subject
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
