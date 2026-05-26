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
 * GET /api/tenant/security/data-encryption
 * Returns data encryption metrics including keys, vaults, and compliance tasks
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
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
    // Get encryption inventory
    const keysResult = await sql`
      SELECT key_id, key_name, algorithm, surface, rotation_days, last_rotation, next_rotation, status
      FROM encryption_keys
      WHERE tenant_id = ${tenantId}
      ORDER BY next_rotation ASC
    `
    const encryptionInventory = keysResult.rows.map(row => ({
      surface: row.surface,
      algorithm: row.algorithm,
      keyRotation: `${row.rotation_days} days`,
      owner: 'Data Ops',
      status: row.status === 'active' ? 'Healthy' : row.status === 'expiring' ? 'Review due' : 'Degraded',
    }))

    // Get key vaults
    const vaultsResult = await sql`
      SELECT vault_name, vault_type, region, keys_count, health_status, last_rotation
      FROM key_vaults
      WHERE tenant_id = ${tenantId}
      ORDER BY vault_name
    `
    const keyVaults = vaultsResult.rows.map(row => ({
      id: row.vault_name.toLowerCase().replace(/\s+/g, '-'),
      label: row.vault_name,
      keys: row.keys_count,
      health: row.health_status === 'operational' ? 'Operational' : 'Degraded',
      lastRotation: row.last_rotation ? getTimeAgo(row.last_rotation) : 'Never',
    }))

    // Get compliance tasks
    const complianceResult = await sql`
      SELECT task_name, task_type, owner, due_date, status
      FROM compliance_tasks
      WHERE tenant_id = ${tenantId} AND task_type IN ('pci_attestation', 'gdpr_audit', 'nitda_statement')
      AND status NOT IN ('completed', 'overdue')
      ORDER BY due_date ASC
    `
    const complianceTasks = complianceResult.rows.map(row => ({
      id: `task-${row.task_name.substring(0, 5).toLowerCase()}`,
      label: row.task_name,
      owner: row.owner,
      due: new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: row.status === 'due_soon' ? 'Due soon' : row.status === 'in_progress' ? 'In progress' : 'Scheduled',
    }))

    // Calculate coverage metrics
    const totalKeys = keysResult.rows.length
    const activeKeys = keysResult.rows.filter(r => r.status === 'active').length
    const atRestEncryption = totalKeys > 0 ? Math.round((activeKeys / totalKeys) * 100) : 98
    const inTransitTLS = 94 // Mock value
    const keyRotationCompliance = keysResult.rows.filter(r => new Date(r.next_rotation) > new Date()).length / (totalKeys || 1) * 100

    const coverageMetrics = [
      { label: 'At-rest encryption', value: atRestEncryption },
      { label: 'In-transit TLS 1.3', value: inTransitTLS },
      { label: 'Key rotation compliance', value: Math.round(keyRotationCompliance) },
    ]

    // Calculate summary metrics
    const encryptedServices = totalKeys
    const keysExpiringSoon = keysResult.rows.filter(r => r.status === 'expiring').length
    const complianceTasksOpen = complianceTasks.length
    const tlsAdoption = inTransitTLS

    const data = {
      encryptedServices,
      keysExpiringSoon,
      complianceTasksOpen,
      tlsAdoption,
      encryptionInventory,
      keyVaults,
      complianceTasks,
      coverageMetrics,
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching data encryption data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch data encryption data',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
