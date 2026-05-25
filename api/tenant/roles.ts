import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'

async function ensureRolesTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_roles (
      id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant',
      name VARCHAR(255) NOT NULL,
      description TEXT,
      critical BOOLEAN NOT NULL DEFAULT false,
      member_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_role_grants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant',
      role_id VARCHAR(255) NOT NULL,
      module VARCHAR(255) NOT NULL,
      scope VARCHAR(255) NOT NULL,
      granted BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tenant_id, role_id, module, scope)
    )
  `
}

const DEFAULT_ROLES = [
  { id: 'super-admin', name: 'Super Admin', description: 'Full platform control with guardrails on destructive actions.', critical: true },
  { id: 'school-admin', name: 'School Admin', description: 'Runs day-to-day school operations and approvals.', critical: true },
  { id: 'faculty-lead', name: 'Faculty Lead', description: 'Manages teachers, classes, and assessments.', critical: false },
  { id: 'finance-officer', name: 'Finance Officer', description: 'Controls billing, payouts, and arrears workflows.', critical: false },
  { id: 'read-only', name: 'Read Only Auditor', description: 'View-only access for audits and reporting.', critical: false },
]

const PERMISSION_MATRIX = [
  { module: 'Student Records', scopes: ['View profiles', 'Edit biodata', 'Export data'] },
  { module: 'Examinations', scopes: ['Schedule exams', 'Monitor live CBT', 'Publish results'] },
  { module: 'Finance', scopes: ['Configure fees', 'Approve waivers', 'Issue refunds'] },
  { module: 'Communication', scopes: ['Send SMS', 'Send emails', 'View communication logs'] },
  { module: 'Security', scopes: ['Manage roles', 'Force logout', 'View audit logs'] },
]

function getHeaders(req: VercelRequest) {
  return {
    tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant',
  }
}

async function seedDefaultRoles(tenantId: string) {
  for (const role of DEFAULT_ROLES) {
    await sql`
      INSERT INTO tenant_roles (id, tenant_id, name, description, critical)
      VALUES (${role.id + '_' + tenantId}, ${tenantId}, ${role.name}, ${role.description}, ${role.critical})
      ON CONFLICT (id) DO NOTHING
    `
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureRolesTables()
  } catch (e) {
    console.error('ensureRolesTables failed', e)
  }

  const { tenantId } = getHeaders(req)

  if (req.method === 'GET') {
    try {
      let rolesResult = await sql`
        SELECT * FROM tenant_roles WHERE tenant_id = ${tenantId} ORDER BY created_at ASC
      `
      if (rolesResult.rows.length === 0) {
        await seedDefaultRoles(tenantId)
        rolesResult = await sql`
          SELECT * FROM tenant_roles WHERE tenant_id = ${tenantId} ORDER BY created_at ASC
        `
      }

      const grantsResult = await sql`
        SELECT role_id, module, scope, granted
        FROM tenant_role_grants WHERE tenant_id = ${tenantId}
      `

      const grantMap: Record<string, Record<string, Record<string, boolean>>> = {}
      for (const g of grantsResult.rows) {
        if (!grantMap[g.role_id]) grantMap[g.role_id] = {}
        if (!grantMap[g.role_id][g.module]) grantMap[g.role_id][g.module] = {}
        grantMap[g.role_id][g.module][g.scope] = g.granted
      }

      return res.status(200).json({
        data: {
          roles: rolesResult.rows,
          grants: grantMap,
          permissionMatrix: PERMISSION_MATRIX,
        },
      })
    } catch (error) {
      console.error('Error fetching roles:', error)
      return res.status(500).json({ error: 'Failed to fetch roles' })
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const { name, description, critical } = typeof body === 'string' ? JSON.parse(body) : body

    if (!name) {
      return res.status(400).json({ error: 'name is required' })
    }

    const id = name.toLowerCase().replace(/\s+/g, '-') + '_' + tenantId
    try {
      const result = await sql`
        INSERT INTO tenant_roles (id, tenant_id, name, description, critical)
        VALUES (${id}, ${tenantId}, ${name}, ${description || ''}, ${Boolean(critical)})
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    } catch (error) {
      console.error('Error creating role:', error)
      return res.status(500).json({ error: 'Failed to create role' })
    }
  }

  if (req.method === 'PUT') {
    const body = req.body || {}
    const { roleId, module: mod, scope, granted } = typeof body === 'string' ? JSON.parse(body) : body

    if (!roleId || !mod || !scope || granted === undefined) {
      return res.status(400).json({ error: 'roleId, module, scope and granted are required' })
    }

    try {
      await sql`
        INSERT INTO tenant_role_grants (tenant_id, role_id, module, scope, granted)
        VALUES (${tenantId}, ${roleId}, ${mod}, ${scope}, ${Boolean(granted)})
        ON CONFLICT (tenant_id, role_id, module, scope)
        DO UPDATE SET granted = EXCLUDED.granted, updated_at = NOW()
      `
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error updating grant:', error)
      return res.status(500).json({ error: 'Failed to update grant' })
    }
  }

  res.setHeader('Allow', 'GET,POST,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
