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
    // Get total revenue from fee structures
    const revenueResult = await sql`
      SELECT SUM(amount) as total FROM fee_structures WHERE tenant_id = ${tenantId}
    `
    const totalRevenue = parseFloat(revenueResult.rows[0]?.total || '0')

    // Get total collected from payments
    const collectedResult = await sql`
      SELECT SUM(amount) as total FROM payments 
      WHERE tenant_id = ${tenantId} AND status IN ('success', 'verified')
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

    // Get fee structure breakdown
    const feeBreakdownResult = await sql`
      SELECT 
        category,
        SUM(amount) as total
      FROM fee_structures 
      WHERE tenant_id = ${tenantId}
      GROUP BY category
    `
    const totalFees = feeBreakdownResult.rows.reduce((sum, row) => sum + parseFloat(row.total || '0'), 0)
    const feeStructureBreakdown = feeBreakdownResult.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.total || '0'),
      percentage: totalFees > 0 ? Math.round((parseFloat(row.total || '0') / totalFees) * 100) : 0,
    }))

    // Get payment methods breakdown
    const paymentMethodsResult = await sql`
      SELECT 
        payment_method as method,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments 
      WHERE tenant_id = ${tenantId} AND status IN ('success', 'verified')
      GROUP BY payment_method
    `
    const paymentMethods = paymentMethodsResult.rows.map(row => ({
      method: row.method,
      amount: parseFloat(row.total || '0'),
      count: parseInt(row.count || '0'),
    }))

    // Get outstanding by class
    const classOutstandingResult = await sql`
      SELECT 
        c.name as class,
        COALESCE(SUM(p.amount), 0) as collected,
        COALESCE(SUM(fs.amount), 0) - COALESCE(SUM(p.amount), 0) as outstanding
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id AND c.tenant_id = s.tenant_id
      LEFT JOIN fee_assignments fa ON s.id = fa.student_id AND c.tenant_id = fa.tenant_id
      LEFT JOIN fee_structures fs ON fa.fee_structure_id = fs.id AND c.tenant_id = fs.tenant_id
      LEFT JOIN payments p ON fa.id = p.fee_assignment_id AND c.tenant_id = p.tenant_id 
        AND p.status IN ('success', 'verified')
      WHERE c.tenant_id = ${tenantId}
      GROUP BY c.name
      ORDER BY outstanding DESC
      LIMIT 5
    `
    const classOutstanding = classOutstandingResult.rows.map(row => ({
      class: row.class,
      outstanding: parseFloat(row.outstanding || '0'),
      collected: parseFloat(row.collected || '0'),
    }))

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
