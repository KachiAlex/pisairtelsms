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
 * GET /api/tenant/analytics/teacher-performance
 * Returns teacher performance analytics including ratings and subject comparisons
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
    // Get total teachers
    const teachersResult = await sql`
      SELECT COUNT(*) as count FROM staff WHERE tenant_id = ${tenantId} AND role = 'teacher'
    `
    const totalTeachers = parseInt(teachersResult.rows[0]?.count || '0')

    // Get average rating (mock calculation - in production, this would come from evaluations)
    const averageRating = 4.2

    // Get top performers (teachers with high student pass rates)
    const topPerformersResult = await sql`
      SELECT COUNT(DISTINCT teacher_id) as count
      FROM results r
      WHERE r.tenant_id = ${tenantId}
      GROUP BY teacher_id
      HAVING AVG(CAST(score AS NUMERIC)) >= 75
    `
    const topPerformers = parseInt(topPerformersResult.rows[0]?.count || '0')

    // Get teachers needing improvement
    const needsImprovement = Math.round(totalTeachers * 0.11)

    // Get teacher ranking
    const teacherRankingResult = await sql`
      SELECT 
        s.full_name as teacher,
        sub.name as subject,
        AVG(CAST(r.score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN r.score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM results r
      JOIN staff s ON r.teacher_id = s.id
      JOIN subjects sub ON r.subject_id = sub.id
      WHERE r.tenant_id = ${tenantId} AND s.tenant_id = ${tenantId} AND sub.tenant_id = ${tenantId}
      GROUP BY s.full_name, sub.name
      ORDER BY average_score DESC
      LIMIT 5
    `
    const teacherRanking = teacherRankingResult.rows.map((row, index) => ({
      teacher: row.teacher,
      subject: row.subject,
      averageScore: parseFloat(row.average_score || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
      rating: (4.8 - index * 0.2).toFixed(1), // Mock rating for demo
    }))

    // Get subject comparison (teacher average vs school average)
    const subjectComparisonResult = await sql`
      SELECT 
        sub.name as subject,
        AVG(CAST(r.score AS NUMERIC)) as school_average
      FROM results r
      JOIN subjects sub ON r.subject_id = sub.id
      WHERE r.tenant_id = ${tenantId} AND sub.tenant_id = ${tenantId}
      GROUP BY sub.name
      ORDER BY school_average DESC
    `
    const subjectComparison = subjectComparisonResult.rows.map(row => ({
      subject: row.subject,
      teacherAverage: parseFloat(row.school_average || '0') * 1.05, // Mock teacher average
      schoolAverage: parseFloat(row.school_average || '0'),
    }))

    // Get performance trend (mock data for demo)
    const performanceTrend = [
      { month: 'Jan', averageRating: 4.1, studentSatisfaction: 85 },
      { month: 'Feb', averageRating: 4.2, studentSatisfaction: 87 },
      { month: 'Mar', averageRating: 4.1, studentSatisfaction: 86 },
      { month: 'Apr', averageRating: 4.3, studentSatisfaction: 88 },
      { month: 'May', averageRating: 4.2, studentSatisfaction: 87 },
    ]

    const data = {
      totalTeachers,
      averageRating,
      topPerformers,
      needsImprovement,
      teacherRanking,
      subjectComparison,
      performanceTrend,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching teacher performance analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch teacher performance analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
