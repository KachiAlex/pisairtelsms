import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

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
  // Require authentication - only staff or tenant_admin can access tenant analytics
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

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
      SELECT SUM(amount) as total FROM student_payments WHERE tenant_id = ${tenantId}
    `
    const totalCollected = parseFloat(collectedResult.rows[0]?.total || '0')

    // Calculate outstanding balance
    const outstandingBalance = totalRevenue - totalCollected

    // Calculate collection rate
    const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0

    // Get monthly revenue (group by month)
    const monthlyRevenueResult = await sql`
      SELECT 
        TO_CHAR(paid_at, 'Mon') as month,
        SUM(amount) as collected
      FROM student_payments 
      WHERE tenant_id = ${tenantId}
      GROUP BY TO_CHAR(paid_at, 'Mon')
      ORDER BY MIN(paid_at)
      LIMIT 5
    `
    const monthlyRevenue = monthlyRevenueResult.rows.map(row => ({
      month: row.month,
      revenue: totalRevenue / 5, // Approximate monthly revenue
      collected: parseFloat(row.collected || '0'),
    }))

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

    // Get payment methods breakdown from student_payments
    const paymentMethodsResult = await sql`
      SELECT 
        payment_method as method,
        SUM(amount) as total,
        COUNT(*) as count
      FROM student_payments 
      WHERE tenant_id = ${tenantId}
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
        COALESCE(SUM(sp.amount), 0) as collected,
        COALESCE(SUM(fa.total_amount), 0) - COALESCE(SUM(sp.amount), 0) as outstanding
      FROM classes c
      LEFT JOIN students s ON c.name = s.class AND c.tenant_id = s.tenant_id
      LEFT JOIN fee_assignments fa ON s.id = fa.student_id AND c.tenant_id = fa.tenant_id
      LEFT JOIN student_payments sp ON fa.id = sp.fee_structure_id AND c.tenant_id = sp.tenant_id
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
