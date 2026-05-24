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
 * GET /api/tenant/analytics/academic
 * Returns academic analytics including student counts, subject performance, and class performance
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
    // Get total students from users table
    const studentsResult = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE tenant_id = ${tenantId} AND role = 'student'
    `
    const totalStudents = parseInt(studentsResult.rows[0]?.count || '0')

    // Get total subjects from QuestionBank
    const subjectsResult = await sql`
      SELECT COUNT(DISTINCT subject) as count FROM question_bank 
      WHERE tenant_id = ${tenantId}
    `
    const totalSubjects = parseInt(subjectsResult.rows[0]?.count || '0')

    // Get average score and pass rate from exam_results (join through exam for tenant filter)
    const resultsResult = await sql`
      SELECT 
        AVG(CAST(er.score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN er.score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
    `
    const averageScore = parseFloat(resultsResult.rows[0]?.average_score || '0')
    const passRate = parseFloat(resultsResult.rows[0]?.pass_rate || '0')

    // Get subject performance from exam results (group by exam subject)
    const subjectPerformanceResult = await sql`
      SELECT 
        e.subject,
        AVG(CAST(er.score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN er.score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
      GROUP BY e.subject
      ORDER BY average_score DESC
    `
    const subjectPerformance = subjectPerformanceResult.rows.map(row => ({
      subject: row.subject,
      averageScore: parseFloat(row.average_score || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
    }))

    // Get class performance (group by exam class)
    const classPerformanceResult = await sql`
      SELECT 
        e.class,
        AVG(CAST(er.score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN er.score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      WHERE e.tenant_id = ${tenantId}
      GROUP BY e.class
      ORDER BY average_score DESC
    `
    const classPerformance = classPerformanceResult.rows.map(row => ({
      class: row.class,
      averageScore: parseFloat(row.average_score || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
    }))

    // Get term comparison (current vs previous) - mock for now
    const currentTerm = 'Current Term'
    const previousTerm = 'Previous Term'
    const currentAverage = averageScore
    const previousAverage = averageScore * 0.95

    const data = {
      totalStudents,
      totalSubjects,
      averageScore: Math.round(averageScore * 10) / 10,
      passRate: Math.round(passRate),
      termComparison: {
        currentTerm,
        previousTerm,
        currentAverage: Math.round(currentAverage * 10) / 10,
        previousAverage: Math.round(previousAverage * 10) / 10,
      },
      subjectPerformance,
      classPerformance,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching academic analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch academic analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
