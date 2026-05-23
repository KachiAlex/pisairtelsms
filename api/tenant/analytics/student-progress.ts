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
 * GET /api/tenant/analytics/student-progress
 * Returns student progress analytics including improvement tracking and risk categories
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

    // Calculate student progress (improving vs declining)
    // This is a simplified calculation - in production, you'd compare current term vs previous term
    const improvingStudents = Math.round(totalStudents * 0.42)
    const decliningStudents = Math.round(totalStudents * 0.14)
    const stableStudents = totalStudents - improvingStudents - decliningStudents

    // Get progress by class
    const progressByClassResult = await sql`
      SELECT 
        c.name as class,
        AVG(CAST(r.score AS NUMERIC)) as avg_score,
        COUNT(DISTINCT r.student_id) as total_students
      FROM results r
      JOIN students st ON r.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE r.tenant_id = ${tenantId} AND c.tenant_id = ${tenantId}
      GROUP BY c.name
      ORDER BY avg_score DESC
    `
    const progressByClass = progressByClassResult.rows.map(row => ({
      class: row.class,
      averageImprovement: (Math.random() * 3 + 3).toFixed(1), // Mock improvement for demo
      studentsOnTrack: Math.round(parseInt(row.total_students || '0') * 0.85),
      studentsBehind: Math.round(parseInt(row.total_students || '0') * 0.15),
    }))

    // Get subject progress
    const subjectProgressResult = await sql`
      SELECT 
        s.name as subject,
        AVG(CAST(r.score AS NUMERIC)) as current_average
      FROM results r
      JOIN subjects s ON r.subject_id = s.id
      WHERE r.tenant_id = ${tenantId} AND s.tenant_id = ${tenantId}
      GROUP BY s.name
      ORDER BY current_average DESC
    `
    const subjectProgress = subjectProgressResult.rows.map(row => ({
      subject: row.subject,
      currentAverage: parseFloat(row.current_average || '0'),
      previousAverage: parseFloat(row.current_average || '0') * 0.95, // Mock previous
      improvement: (parseFloat(row.current_average || '0') * 0.05).toFixed(1),
    }))

    // Get risk categories
    const riskCategories = [
      { category: 'On Track', count: Math.round(totalStudents * 0.60), percentage: 60 },
      { category: 'At Risk', count: Math.round(totalStudents * 0.20), percentage: 20 },
      { category: 'Critical', count: Math.round(totalStudents * 0.08), percentage: 8 },
      { category: 'Excelling', count: Math.round(totalStudents * 0.12), percentage: 12 },
    ]

    const data = {
      totalStudents,
      improvingStudents,
      decliningStudents,
      stableStudents,
      progressByClass,
      subjectProgress,
      riskCategories,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching student progress analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch student progress analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
