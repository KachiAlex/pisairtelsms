import type { VercelRequest, VercelResponse } from '@vercel/node'
import { poolQuery, poolQueryOne } from '../_lib/pg-pool.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { PLAN_CONFIG, PLAN_RATES, PlanType, PlanFeatures } from '../../src/lib/plans.js'

async function ensurePlanConfigTable() {
  await poolQuery(`
    CREATE TABLE IF NOT EXISTS plan_config (
      id SERIAL PRIMARY KEY,
      plan_name VARCHAR(50) NOT NULL UNIQUE,
      features JSONB NOT NULL,
      rate NUMERIC(10,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  const count = await poolQuery<{ n: number }>('SELECT COUNT(*)::int AS n FROM plan_config')
  if (count.rows[0]?.n === 0) {
    for (const plan of Object.keys(PLAN_CONFIG) as PlanType[]) {
      await poolQuery(
        `INSERT INTO plan_config (plan_name, features, rate) VALUES ($1, $2, $3)`,
        [plan, JSON.stringify(PLAN_CONFIG[plan]), PLAN_RATES[plan]]
      )
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET is read-only, allow any authenticated user
  if (req.method === 'GET') {
    const decoded = await requireRole(req, res, ['super_admin', 'tenant_admin', 'staff', 'parent'])
    if (!decoded) return
  } else {
    const decoded = await requireRole(req, res, ['super_admin'])
    if (!decoded) return
  }

  try {
    await ensurePlanConfigTable()

    if (req.method === 'GET') {
      const result = await poolQuery(
        `SELECT plan_name, features, rate, is_active,
           TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at
         FROM plan_config ORDER BY
           CASE plan_name
             WHEN 'starter' THEN 1
             WHEN 'standard' THEN 2
             WHEN 'premium' THEN 3
             ELSE 99
           END`
      )
      return res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          planName: row.plan_name,
          features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
          rate: parseFloat(row.rate),
          isActive: row.is_active,
          updatedAt: row.updated_at,
        })),
      })
    }

    if (req.method === 'PUT') {
      const { planName, features, rate } = req.body

      if (!planName || !features) {
        return res.status(400).json({ success: false, error: 'planName and features are required' })
      }

      const validPlans: PlanType[] = ['starter', 'standard', 'premium']
      if (!validPlans.includes(planName as PlanType)) {
        return res.status(400).json({ success: false, error: 'Invalid plan name' })
      }

      const rateValue = rate !== undefined ? parseFloat(rate) : PLAN_RATES[planName as PlanType]
      if (isNaN(rateValue) || rateValue < 0) {
        return res.status(400).json({ success: false, error: 'Invalid rate value' })
      }

      const result = await poolQueryOne(
        `UPDATE plan_config
         SET features = $1, rate = $2, updated_at = NOW()
         WHERE plan_name = $3
         RETURNING plan_name, features, rate, is_active,
           TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') as updated_at`,
        [JSON.stringify(features), rateValue, planName]
      )

      if (!result) {
        return res.status(404).json({ success: false, error: 'Plan not found' })
      }

      return res.json({
        success: true,
        data: {
          planName: result.plan_name,
          features: typeof result.features === 'string' ? JSON.parse(result.features) : result.features,
          rate: parseFloat(result.rate),
          isActive: result.is_active,
          updatedAt: result.updated_at,
        },
      })
    }

    if (req.method === 'PATCH') {
      const { planName, isActive } = req.body

      if (!planName) {
        return res.status(400).json({ success: false, error: 'planName is required' })
      }

      const result = await poolQueryOne(
        `UPDATE plan_config SET is_active = $1, updated_at = NOW()
         WHERE plan_name = $2
         RETURNING plan_name, is_active`,
        [isActive !== undefined ? isActive : true, planName]
      )

      if (!result) {
        return res.status(404).json({ success: false, error: 'Plan not found' })
      }

      return res.json({
        success: true,
        data: { planName: result.plan_name, isActive: result.is_active },
      })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('plans-handler error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
