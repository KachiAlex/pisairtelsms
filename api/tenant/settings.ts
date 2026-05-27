import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchTenantSettings, updateTenantSettings } from '../_lib/tenant-settings'
import { requireRole } from '../_lib/auth-middleware.js'

interface TenantSettingsPayload {
  schoolName: string
  schoolAddress: string
  schoolEmail: string
  schoolPhone: string
  currentSession: string
  currentTerm: string
  enableSMS: boolean
  enableEmail: boolean
  enableBiometric: boolean
  enableOnlinePayment: boolean
  autoBackup: boolean
  twoFactorAuth: boolean
  maintenanceMode: boolean
  logoUrl?: string | null
  admissionNoFormat?: string
  admissionNoDigits?: number
}

interface TenantSettingsResponse extends TenantSettingsPayload {
  updatedAt: string
}

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Partial<TenantSettingsPayload>
    } catch (error) {
      console.error('Failed to parse tenant settings payload', error)
      return null
    }
  }
  return req.body as Partial<TenantSettingsPayload>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method === 'GET') {
    try {
      const settings = await fetchTenantSettings()
      return res.status(200).json({ settings })
    } catch (error) {
      console.error('Error fetching tenant settings:', error)
      return res.status(500).json({ error: 'Failed to fetch tenant settings' })
    }
  }

  if (req.method === 'PUT') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'A JSON body is required.' })
    }

    try {
      const updated = await updateTenantSettings(body as TenantSettingsPayload)
      return res.status(200).json({ settings: updated })
    } catch (error) {
      console.error('Error updating tenant settings:', error)
      return res.status(500).json({ error: 'Failed to update tenant settings' })
    }
  }

  return methodNotAllowed(res)
}
