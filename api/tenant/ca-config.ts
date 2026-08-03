import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getTenantCAConfig,
  saveDraftCAConfig,
  publishCAConfig,
  getCAConfigAuditLog,
  getCAConfigOverrides,
  saveCAConfigOverride,
  deleteCAConfigOverride,
} from './_lib/ca-config.js'
import { requireRole } from '../_lib/auth-middleware.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,PUT,POST,DELETE')
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

const validateWeights = (weights: Record<string, number>): boolean => {
  const total = Object.values(weights).reduce((sum, val) => sum + (Number(val) || 0), 0)
  return Math.round(total) === 100
}

const validateConfig = (config: any): boolean => {
  if (!config) return false
  for (const level of ['primary', 'jss', 'sss']) {
    if (!config[level]) return false
    if (!validateWeights(config[level])) return false
  }
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || (req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' })
  }

  const actorId = decoded.userId || decoded.staffId || 'unknown'
  const actorName = decoded.email || actorId

  // GET: fetch config, audit log, or overrides based on `action` query param
  if (req.method === 'GET') {
    const action = req.query.action as string

    if (action === 'audit') {
      try {
        const auditLog = await getCAConfigAuditLog(tenantId, 20)
        return res.status(200).json({ data: auditLog })
      } catch (error) {
        console.error('CA Config audit GET error:', error)
        return res.status(500).json({ error: 'Internal server error' })
      }
    }

    if (action === 'overrides') {
      try {
        const overrides = await getCAConfigOverrides(tenantId)
        return res.status(200).json({ data: overrides })
      } catch (error) {
        console.error('CA Config overrides GET error:', error)
        return res.status(500).json({ error: 'Internal server error' })
      }
    }

    // Default: return full config (published + draft + status)
    try {
      const config = await getTenantCAConfig(tenantId)
      return res.status(200).json({ data: config })
    } catch (error) {
      console.error('CA Config GET error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // PUT: save draft config
  if (req.method === 'PUT') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { primary, jss, sss } = body
    const config = { primary, jss, sss }

    if (!validateConfig(config)) {
      return res.status(400).json({ error: 'Invalid config: primary, jss, and sss weight configurations are required and must each total 100%' })
    }

    try {
      const saved = await saveDraftCAConfig(tenantId, config, actorId, actorName)
      return res.status(200).json({ data: saved })
    } catch (error) {
      console.error('CA Config PUT error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // POST: publish draft or save override
  if (req.method === 'POST') {
    const action = req.query.action as string

    if (action === 'publish') {
      try {
        const published = await publishCAConfig(tenantId, actorId, actorName)
        return res.status(200).json({ data: published })
      } catch (error) {
        console.error('CA Config publish error:', error)
        return res.status(500).json({ error: 'Internal server error' })
      }
    }

    if (action === 'override') {
      const body = parseBody(req)
      if (!body || !body.class_name || !body.config) {
        return res.status(400).json({ error: 'class_name and config are required' })
      }

      if (!validateConfig(body.config)) {
        return res.status(400).json({ error: 'Invalid override config: all levels must total 100%' })
      }

      try {
        const override = await saveCAConfigOverride(
          tenantId,
          body.class_name,
          body.subject_name || null,
          body.config,
          actorId,
          actorName
        )
        return res.status(200).json({ data: override })
      } catch (error) {
        console.error('CA Config override save error:', error)
        return res.status(500).json({ error: 'Internal server error' })
      }
    }

    return res.status(400).json({ error: 'Unknown action. Use ?action=publish or ?action=override' })
  }

  // DELETE: remove an override
  if (req.method === 'DELETE') {
    const overrideId = parseInt(req.query.id as string)
    if (!overrideId) {
      return res.status(400).json({ error: 'Override id is required' })
    }

    try {
      await deleteCAConfigOverride(tenantId, overrideId)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('CA Config override delete error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return methodNotAllowed(res)
}
