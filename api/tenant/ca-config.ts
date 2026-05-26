import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTenantCAConfig, updateTenantCAConfig } from './_lib/ca-config.js'
import { requireRole } from '../_lib/auth-middleware'

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
  // Require authentication - only staff or tenant_admin can access tenant CA config
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { tenantId } = req.query

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Tenant ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const config = await getTenantCAConfig(tenantId)
      return res.status(200).json({ data: config })
    } catch (error) {
      console.error('CA Config GET error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PUT') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { primary, jss, sss } = body

    if (!primary || !jss || !sss) {
      return res.status(400).json({ error: 'primary, jss, and sss weight configurations are required' })
    }

    const validateWeights = (weights: Record<string, number>): boolean => {
      const total = Object.values(weights).reduce((sum, val) => sum + (Number(val) || 0), 0)
      return Math.round(total) === 100
    }

    if (!validateWeights(primary) || !validateWeights(jss) || !validateWeights(sss)) {
      return res.status(400).json({ error: 'All weight combinations must total 100%' })
    }

    try {
      const updatedConfig = await updateTenantCAConfig(tenantId, { primary, jss, sss })
      return res.status(200).json({ data: updatedConfig })
    } catch (error) {
      console.error('CA Config PUT error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return methodNotAllowed(res)
}
