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
 * GET /api/tenant/analytics/financial
 * Returns financial analytics including revenue, collections, and payment methods
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
    // Get total revenue from fee_assignments
    const revenueResult = await sql`
      SELECT SUM(total_amount) as total FROM fee_assignments WHERE tenant_id = ${tenantId}
    `
    const totalRevenue = parseFloat(revenueResult.rows[0]?.total || '0')

    // Get total collected from student_payments
    const collectedResult = await sql`
      SELECT SUM(amount) as total FROM student_payments 
      WHERE student_id IN (SELECT id FROM users WHERE tenant_id = ${tenantId})
    `
    const totalCollected = parseFloat(collectedResult.rows[0]?.total || '0')

    // Calculate outstanding balance
    const outstandingBalance = totalRevenue - totalCollected

    // Calculate collection rate
    const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0

    // Get monthly revenue (mock data for demo - in production, group by month)
    const monthlyRevenue = [
      { month: 'Jan', revenue: totalRevenue / 5, collected: (totalRevenue / 5) * 0.9 },
      { month: 'Feb', revenue: totalRevenue / 5, collected: (totalRevenue / 5) * 0.92 },
      { month: 'Mar', revenue: totalRevenue / 5, collected: (totalRevenue / 5) * 0.84 },
      { month: 'Apr', revenue: totalRevenue / 5, collected: (totalRevenue / 5) * 0.82 },
      { month: 'May', revenue: totalRevenue / 5, collected: (totalRevenue / 5) * 0.82 },
    ]

    // Get fee structure breakdown (mock since fee_structures table doesn't exist)
    const feeStructureBreakdown = [
      { category: 'Tuition', amount: totalRevenue * 0.6, percentage: 60 },
      { category: 'Exam Fees', amount: totalRevenue * 0.2, percentage: 20 },
      { category: 'Development Levy', amount: totalRevenue * 0.1, percentage: 10 },
      { category: 'Other Fees', amount: totalRevenue * 0.1, percentage: 10 },
    ]

    // Get payment methods breakdown from student_payments
    const paymentMethodsResult = await sql`
      SELECT 
        payment_method as method,
        SUM(amount) as total,
        COUNT(*) as count
      FROM student_payments 
      WHERE student_id IN (SELECT id FROM users WHERE tenant_id = ${tenantId})
      GROUP BY payment_method
    `
    const paymentMethods = paymentMethodsResult.rows.map(row => ({
      method: row.method,
      amount: parseFloat(row.total || '0'),
      count: parseInt(row.count || '0'),
    }))

    // Get outstanding by class (mock since classes table doesn't exist)
    const classOutstanding = [
      { class: 'JSS 1', outstanding: totalRevenue * 0.15, collected: totalRevenue * 0.05 },
      { class: 'JSS 2', outstanding: totalRevenue * 0.12, collected: totalRevenue * 0.08 },
      { class: 'JSS 3', outstanding: totalRevenue * 0.10, collected: totalRevenue * 0.10 },
      { class: 'SSS 1', outstanding: totalRevenue * 0.08, collected: totalRevenue * 0.12 },
      { class: 'SSS 2', outstanding: totalRevenue * 0.05, collected: totalRevenue * 0.15 },
    ]

    const data = {
      totalRevenue,
      totalCollected,
      outstandingBalance,
      collectionRate,
      monthlyRevenue,
      feeStructureBreakdown,
      paymentMethods,
      classOutstanding,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching financial analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch financial analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
