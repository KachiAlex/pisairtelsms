import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../_lib/auth-middleware.js'

interface TenantDomainPayload {
  enableCustomDomain: boolean
  customApplicationUrl?: string
  customInquiryUrl?: string
  domain?: string
  subdomain?: string
}

interface TenantDomainResponse {
  enableCustomDomain: boolean
  customApplicationUrl?: string
  customInquiryUrl?: string
  domain?: string
  subdomain?: string
  updatedAt: string
}

// Mock storage - in production, this would be a database
let tenantDomainConfig: TenantDomainResponse = {
  enableCustomDomain: false,
  updatedAt: new Date().toISOString()
}

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Partial<TenantDomainPayload>
    } catch (error) {
      console.error('Failed to parse tenant domain payload', error)
      return null
    }
  }
  return req.body as Partial<TenantDomainPayload>
}

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant domain config
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method === 'GET') {
    try {
      return res.status(200).json({ domainConfig: tenantDomainConfig })
    } catch (error) {
      console.error('Error fetching tenant domain config:', error)
      return res.status(500).json({ error: 'Failed to fetch tenant domain configuration' })
    }
  }

  if (req.method === 'PUT') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'A JSON body is required.' })
    }

    try {
      // Validate URLs if provided
      if (body.customApplicationUrl && !validateUrl(body.customApplicationUrl)) {
        return res.status(400).json({ error: 'Invalid application URL format' })
      }
      if (body.customInquiryUrl && !validateUrl(body.customInquiryUrl)) {
        return res.status(400).json({ error: 'Invalid inquiry URL format' })
      }

      // Update configuration
      tenantDomainConfig = {
        ...tenantDomainConfig,
        ...body,
        updatedAt: new Date().toISOString()
      }

      return res.status(200).json({ domainConfig: tenantDomainConfig })
    } catch (error) {
      console.error('Error updating tenant domain config:', error)
      return res.status(500).json({ error: 'Failed to update tenant domain configuration' })
    }
  }

  return methodNotAllowed(res)
}
