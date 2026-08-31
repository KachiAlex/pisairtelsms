import type { VercelRequest, VercelResponse } from '@vercel/node'
import { poolQuery } from './pg-pool.js'
import { PLAN_CONFIG, PlanFeatures } from '../../src/lib/plans.js'
import { getTenantIdFromRequest } from './auth-middleware.js'

/**
 * Middleware to enforce subscription plan features at the API level.
 * 
 * @param category The feature category (e.g., 'finance', 'exams')
 * @param feature The specific feature within that category
 */
export async function enforcePlan(
  req: VercelRequest,
  res: VercelResponse,
  category: keyof PlanFeatures,
  feature: string
): Promise<boolean> {
  const tenantId = await getTenantIdFromRequest(req, res)
  if (!tenantId) return false

  try {
    // Fetch the tenant's current plan
    const result = await poolQuery(
      'SELECT subscription_plan FROM tenants WHERE id = $1',
      [tenantId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tenant not found' })
      return false
    }

    const plan = (result.rows[0].subscription_plan || 'starter').toLowerCase() as any
    const planConfig = PLAN_CONFIG[plan]

    if (!planConfig) {
      res.status(500).json({ error: 'Invalid plan configuration' })
      return false
    }

    const hasAccess = (planConfig[category] as any)?.[feature] === true

    if (!hasAccess) {
      res.status(403).json({
        error: 'Forbidden: Subscription upgrade required',
        message: `Your current plan (${plan}) does not include access to this feature (${category}.${feature}).`,
        requiredPlan: findRequiredPlan(category, feature)
      })
      return false
    }

    return true
  } catch (error) {
    console.error('enforcePlan error:', error)
    res.status(500).json({ error: 'Internal server error during plan verification' })
    return false
  }
}

/**
 * Helper to find the minimum plan required for a feature
 */
function findRequiredPlan(category: keyof PlanFeatures, feature: string): string {
  if ((PLAN_CONFIG.starter[category] as any)?.[feature]) return 'starter'
  if ((PLAN_CONFIG.standard[category] as any)?.[feature]) return 'standard'
  return 'premium'
}
