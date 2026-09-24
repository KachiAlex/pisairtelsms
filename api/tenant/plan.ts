import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { poolQuery } from '../_lib/pg-pool.js'
import { requireAuth } from '../_lib/auth-middleware.js'
import { PLAN_CONFIG, PLAN_RATES, PlanFeatures, PlanType } from '../../src/lib/plans.js'

/**
 * GET /api/tenant/plan
 * Returns the calling tenant's subscription plan and its resolved feature
 * matrix (DB plan_config first, static PLAN_CONFIG as fallback).
 * Any authenticated role may read this — feature flags are not sensitive.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const decoded = await requireAuth(req, res)
  if (!decoded) return
  if (!decoded.tenantId) {
    return res.status(403).json({ error: 'No tenant associated with this account' })
  }

  try {
    const tenantResult = await poolQuery(
      'SELECT subscription_plan FROM tenants WHERE id = $1',
      [decoded.tenantId]
    )
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const plan = (tenantResult.rows[0].subscription_plan || 'starter').toLowerCase() as PlanType

    const configResult = await poolQuery(
      'SELECT features, rate FROM plan_config WHERE plan_name = $1 AND is_active = true',
      [plan]
    )

    let features: PlanFeatures = PLAN_CONFIG[plan] || PLAN_CONFIG.starter
    let rate = PLAN_RATES[plan] ?? PLAN_RATES.starter
    if (configResult.rows.length > 0) {
      const row = configResult.rows[0]
      features = (typeof row.features === 'string' ? JSON.parse(row.features) : row.features) as PlanFeatures
      rate = row.rate ?? rate
    }

    return res.status(200).json({ plan, features, rate })
  } catch (error) {
    console.error('tenant plan error:', error)
    return res.status(500).json({ error: 'Failed to load plan' })
  }
}
