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
    // Get total students
    const studentsResult = await sql`
      SELECT COUNT(*) as count FROM students WHERE tenant_id = ${tenantId}
    `
    const totalStudents = parseInt(studentsResult.rows[0]?.count || '0')

    // Get total subjects
    const subjectsResult = await sql`
      SELECT COUNT(*) as count FROM subjects WHERE tenant_id = ${tenantId}
    `
    const totalSubjects = parseInt(subjectsResult.rows[0]?.count || '0')

    // Get average score and pass rate from results
    const resultsResult = await sql`
      SELECT 
        AVG(CAST(score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM results 
      WHERE tenant_id = ${tenantId}
    `
    const averageScore = parseFloat(resultsResult.rows[0]?.average_score || '0')
    const passRate = parseFloat(resultsResult.rows[0]?.pass_rate || '0')

    // Get subject performance
    const subjectPerformanceResult = await sql`
      SELECT 
        s.name as subject,
        AVG(CAST(r.score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN r.score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM results r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.tenant_id = ${tenantId} AND s.tenant_id = ${tenantId}
      GROUP BY s.name
      ORDER BY average_score DESC
    `
    const subjectPerformance = subjectPerformanceResult.rows.map(row => ({
      subject: row.subject,
      averageScore: parseFloat(row.average_score || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
    }))

    // Get class performance
    const classPerformanceResult = await sql`
      SELECT 
        c.name as class,
        AVG(CAST(r.score AS NUMERIC)) as average_score,
        COUNT(CASE WHEN r.score >= 50 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
      FROM results r
      JOIN students st ON r.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE r.tenant_id = ${tenantId} AND c.tenant_id = ${tenantId}
      GROUP BY c.name
      ORDER BY average_score DESC
    `
    const classPerformance = classPerformanceResult.rows.map(row => ({
      class: row.class,
      averageScore: parseFloat(row.average_score || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
    }))

    // Get term comparison (current vs previous)
    const currentTermResult = await sql`
      SELECT name FROM academic_terms 
      WHERE tenant_id = ${tenantId} AND is_current = true
      LIMIT 1
    `
    const currentTerm = currentTermResult.rows[0]?.name || 'Current Term'

    const previousTermResult = await sql`
      SELECT name FROM academic_terms 
      WHERE tenant_id = ${tenantId} AND is_current = false
      ORDER BY created_at DESC
      LIMIT 1
    `
    const previousTerm = previousTermResult.rows[0]?.name || 'Previous Term'

    const currentAverage = averageScore
    const previousAverage = averageScore * 0.95 // Mock calculation for demo

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
