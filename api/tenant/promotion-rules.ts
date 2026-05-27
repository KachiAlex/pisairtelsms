import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPromotionRules, updatePromotionRule } from './_lib/promotion-rules.js'
import { requireRole } from '../_lib/auth-middleware.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant promotion rules
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { tenantId, id } = req.query

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Tenant ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const rules = await getPromotionRules(tenantId)
      return res.status(200).json({ data: rules })
    } catch (error) {
      console.error('Promotion Rules GET error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Rule ID is required' })
    }

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    try {
      const updatedRule = await updatePromotionRule(tenantId, id, body)
      if (!updatedRule) {
        return res.status(404).json({ error: 'Promotion rule not found' })
      }
      return res.status(200).json({ data: updatedRule })
    } catch (error) {
      console.error('Promotion Rules PUT error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return methodNotAllowed(res)
}
