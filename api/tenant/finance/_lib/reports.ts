import { sql } from './db.js'

export interface CollectionSummary {
  target: number
  actual: number
  rate: number
  outstanding: number
  byClass: { class: string; target: number; actual: number; rate: number }[]
  byPaymentMethod: { method: string; amount: number; count: number }[]
}

export async function generateCollectionSummary(tenantId: string): Promise<CollectionSummary> {
  const [targetRows, actualRows, outstandingRows, byClassRows, byMethodRows] = await Promise.all([
    sql<{ total: string }>`
      SELECT COALESCE(SUM(amount), 0) AS total FROM fee_records WHERE tenant_id = ${tenantId}
    `,
    sql<{ total: string }>`
      SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE tenant_id = ${tenantId} AND status = 'verified'
    `,
    sql<{ total: string }>`
      SELECT COALESCE(SUM(balance), 0) AS total FROM fee_records WHERE tenant_id = ${tenantId}
    `,
    sql<{ class: string; target: string; actual: string }>`
      SELECT
        fr.class,
        COALESCE(SUM(fr.amount), 0) AS target,
        COALESCE(SUM(fr.paid), 0) AS actual
      FROM fee_records fr
      WHERE fr.tenant_id = ${tenantId}
      GROUP BY fr.class
      ORDER BY fr.class
    `,
    sql<{ method: string; amount: string; count: string }>`
      SELECT
        COALESCE(NULLIF(p.payment_method, ''), 'unknown') AS method,
        COALESCE(SUM(p.amount), 0) AS amount,
        COUNT(*) AS count
      FROM payments p
      WHERE p.tenant_id = ${tenantId} AND p.status = 'verified'
      GROUP BY COALESCE(NULLIF(p.payment_method, ''), 'unknown')
      ORDER BY amount DESC
    `,
  ])

  const target = parseFloat(targetRows.rows[0]?.total || '0')
  const actual = parseFloat(actualRows.rows[0]?.total || '0')
  const outstanding = parseFloat(outstandingRows.rows[0]?.total || '0')

  return {
    target,
    actual,
    rate: target > 0 ? Math.round((actual / target) * 100 * 100) / 100 : 0,
    outstanding,
    byClass: byClassRows.rows.map(r => ({
      class: r.class,
      target: parseFloat(r.target),
      actual: parseFloat(r.actual),
      rate: parseFloat(r.target) > 0 ? Math.round((parseFloat(r.actual) / parseFloat(r.target)) * 100 * 100) / 100 : 0,
    })),
    byPaymentMethod: byMethodRows.rows.map(r => ({
      method: r.method,
      amount: parseFloat(r.amount),
      count: Number(r.count),
    })),
  }
}

export interface AgingAnalysis {
  current: { count: number; amount: number }
  thirtyDays: { count: number; amount: number }
  sixtyDays: { count: number; amount: number }
  ninetyPlus: { count: number; amount: number }
  byClass: { class: string; current: number; thirtyDays: number; sixtyDays: number; ninetyPlus: number }[]
}

export async function generateAgingAnalysis(tenantId: string): Promise<AgingAnalysis> {
  const rows = await sql<{
    bucket: string
    count: string
    amount: string
  }>`
    SELECT
      CASE
        WHEN NOW() - created_at <= INTERVAL '30 days' THEN 'current'
        WHEN NOW() - created_at <= INTERVAL '60 days' THEN 'thirtyDays'
        WHEN NOW() - created_at <= INTERVAL '90 days' THEN 'sixtyDays'
        ELSE 'ninetyPlus'
      END AS bucket,
      COUNT(*) AS count,
      COALESCE(SUM(balance), 0) AS amount
    FROM fee_records
    WHERE tenant_id = ${tenantId} AND balance > 0
    GROUP BY bucket
  `

  const map = { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyPlus: 0 } as Record<string, { count: number; amount: number }>
  for (const row of rows.rows) {
    map[row.bucket] = { count: Number(row.count), amount: parseFloat(row.amount) }
  }

  const byClassRows = await sql<{
    class: string
    current: string
    thirtyDays: string
    sixtyDays: string
    ninetyPlus: string
  }>`
    SELECT
      class,
      SUM(CASE WHEN NOW() - created_at <= INTERVAL '30 days' THEN balance ELSE 0 END) AS current,
      SUM(CASE WHEN NOW() - created_at > INTERVAL '30 days' AND NOW() - created_at <= INTERVAL '60 days' THEN balance ELSE 0 END) AS thirtyDays,
      SUM(CASE WHEN NOW() - created_at > INTERVAL '60 days' AND NOW() - created_at <= INTERVAL '90 days' THEN balance ELSE 0 END) AS sixtyDays,
      SUM(CASE WHEN NOW() - created_at > INTERVAL '90 days' THEN balance ELSE 0 END) AS ninetyPlus
    FROM fee_records
    WHERE tenant_id = ${tenantId} AND balance > 0
    GROUP BY class
    ORDER BY class
  `

  return {
    current: map.current,
    thirtyDays: map.thirtyDays,
    sixtyDays: map.sixtyDays,
    ninetyPlus: map.ninetyPlus,
    byClass: byClassRows.rows.map(r => ({
      class: r.class,
      current: Number(r.current),
      thirtyDays: Number(r.thirtyDays),
      sixtyDays: Number(r.sixtyDays),
      ninetyPlus: Number(r.ninetyPlus),
    })),
  }
}

export interface DefaulterReport {
  total: number
  students: { studentId: string; name: string; class: string; amountOwed: number; daysOverdue: number }[]
}

export async function generateDefaulters(tenantId: string): Promise<DefaulterReport> {
  const rows = await sql<{
    student_id: string
    student_name: string
    class: string
    amount_owed: string
    days_overdue: string
  }>`
    SELECT
      student_id,
      student_name,
      class,
      COALESCE(SUM(balance), 0) AS amount_owed,
      COALESCE(MAX((EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)::int), 0) AS days_overdue
    FROM fee_records
    WHERE tenant_id = ${tenantId} AND balance > 0
    GROUP BY student_id, student_name, class
    ORDER BY amount_owed DESC
    LIMIT 100
  `

  return {
    total: rows.rows.length,
    students: rows.rows.map(r => ({
      studentId: r.student_id,
      name: r.student_name,
      class: r.class,
      amountOwed: parseFloat(r.amount_owed),
      daysOverdue: Number(r.days_overdue),
    })),
  }
}

export interface RevenueForecast {
  projected: number
  actual: number
  gap: number
  byMonth: { month: string; projected: number; actual: number }[]
}

export async function generateRevenueForecast(tenantId: string): Promise<RevenueForecast> {
  const [projectedRow, actualRow, monthlyRows] = await Promise.all([
    sql<{ total: string }>`SELECT COALESCE(SUM(amount), 0) AS total FROM fee_records WHERE tenant_id = ${tenantId}`,
    sql<{ total: string }>`
      SELECT COALESCE(SUM(amount), 0) AS total FROM payments
      WHERE tenant_id = ${tenantId} AND status = 'verified'
    `,
    sql<{ month: string; actual: string; projected: string }>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', payment_date), 'Month') AS month,
        COALESCE(SUM(amount), 0) AS actual,
        0 AS projected
      FROM payments
      WHERE tenant_id = ${tenantId} AND status = 'verified'
      GROUP BY DATE_TRUNC('month', payment_date), TO_CHAR(DATE_TRUNC('month', payment_date), 'Month')
      ORDER BY DATE_TRUNC('month', payment_date)
    `,
  ])

  const projected = parseFloat(projectedRow.rows[0]?.total || '0')
  const actual = parseFloat(actualRow.rows[0]?.total || '0')

  return {
    projected,
    actual,
    gap: Math.max(0, projected - actual),
    byMonth: monthlyRows.rows.map(r => ({
      month: r.month.trim(),
      projected: Number(r.projected),
      actual: parseFloat(r.actual),
    })),
  }
}

export interface PaymentMethodReport {
  total: number
  breakdown: { method: string; amount: number; percentage: number; count: number }[]
}

export async function generatePaymentMethods(tenantId: string): Promise<PaymentMethodReport> {
  const rows = await sql<{
    method: string
    amount: string
    count: string
  }>`
    SELECT
      COALESCE(NULLIF(payment_method, ''), 'unknown') AS method,
      COALESCE(SUM(amount), 0) AS amount,
      COUNT(*) AS count
    FROM payments
    WHERE tenant_id = ${tenantId} AND status = 'verified'
    GROUP BY COALESCE(NULLIF(payment_method, ''), 'unknown')
    ORDER BY amount DESC
  `

  const total = rows.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0)

  return {
    total,
    breakdown: rows.rows.map(r => {
      const amount = parseFloat(r.amount)
      return {
        method: r.method,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100 * 100) / 100 : 0,
        count: Number(r.count),
      }
    }),
  }
}

export interface FinancialStatement {
  totalRevenue: number
  byClass: { class: string; revenue: number }[]
  byTerm: { term: string; revenue: number }[]
  yearOverYear: { year: string; revenue: number }[]
}

export async function generateFinancialStatement(tenantId: string): Promise<FinancialStatement> {
  const [revenueRow, byClassRows, byTermRows, yearlyRows] = await Promise.all([
    sql<{ total: string }>`
      SELECT COALESCE(SUM(amount), 0) AS total FROM payments
      WHERE tenant_id = ${tenantId} AND status = 'verified'
    `,
    sql<{ class: string; revenue: string }>`
      SELECT fr.class, COALESCE(SUM(p.amount), 0) AS revenue
      FROM payments p
      JOIN fee_records fr ON fr.student_id = p.student_id AND fr.tenant_id = ${tenantId}
      WHERE p.tenant_id = ${tenantId} AND p.status = 'verified'
      GROUP BY fr.class
      ORDER BY fr.class
    `,
    sql<{ term: string; revenue: string }>`
      SELECT fr.term, COALESCE(SUM(p.amount), 0) AS revenue
      FROM payments p
      JOIN fee_records fr ON fr.student_id = p.student_id AND fr.tenant_id = ${tenantId}
      WHERE p.tenant_id = ${tenantId} AND p.status = 'verified'
      GROUP BY fr.term
      ORDER BY fr.term
    `,
    sql<{ year: string; revenue: string }>`
      SELECT TO_CHAR(DATE_TRUNC('year', payment_date), 'YYYY') AS year,
        COALESCE(SUM(amount), 0) AS revenue
      FROM payments
      WHERE tenant_id = ${tenantId} AND status = 'verified'
      GROUP BY DATE_TRUNC('year', payment_date), TO_CHAR(DATE_TRUNC('year', payment_date), 'YYYY')
      ORDER BY year
    `,
  ])

  return {
    totalRevenue: parseFloat(revenueRow.rows[0]?.total || '0'),
    byClass: byClassRows.rows.map(r => ({ class: r.class, revenue: parseFloat(r.revenue) })),
    byTerm: byTermRows.rows.map(r => ({ term: r.term, revenue: parseFloat(r.revenue) })),
    yearOverYear: yearlyRows.rows.map(r => ({ year: r.year, revenue: parseFloat(r.revenue) })),
  }
}
