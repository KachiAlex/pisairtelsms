import { sql } from '@vercel/postgres'

export interface PromotionRule {
  id: string
  tenant_id: string
  name: string
  conditions: any
  action: 'promote' | 'review' | 'repeat'
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function ensurePromotionRulesTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        name TEXT NOT NULL,
        conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
        action TEXT NOT NULL DEFAULT 'promote',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log('Promotion rules table ensured.')
  } catch (error) {
    console.error('Error ensuring promotion rules table:', error)
  }
}

export async function getPromotionRules(tenantId: string): Promise<PromotionRule[]> {
  try {
    await ensurePromotionRulesTable()

    const result = await sql<PromotionRule>`
      SELECT
        id,
        tenant_id,
        name,
        conditions,
        action,
        is_active,
        created_at,
        updated_at
      FROM promotion_rules
      WHERE tenant_id = ${tenantId}
      ORDER BY name ASC
    `

    return result.rows
  } catch (error) {
    console.error('Error fetching promotion rules:', error)
    return []
  }
}

export async function updatePromotionRule(
  tenantId: string,
  ruleId: string,
  updates: Partial<Omit<PromotionRule, 'id' | 'tenant_id' | 'created_at'>>
): Promise<PromotionRule | null> {
  try {
    await ensurePromotionRulesTable()

    // First verify the rule exists and belongs to this tenant
    const existingRule = await sql<PromotionRule>`
      SELECT * FROM promotion_rules
      WHERE id = ${ruleId} AND tenant_id = ${tenantId}
    `

    if (existingRule.rows.length === 0) {
      return null
    }

    // Build dynamic update query
    const updateFields: string[] = []
    const values: (string | boolean)[] = []

    if (updates.name !== undefined) {
      updateFields.push(`name = $${updateFields.length + 1}`)
      values.push(updates.name)
    }
    if (updates.conditions !== undefined) {
      updateFields.push(`conditions = $${updateFields.length + 1}`)
      values.push(updates.conditions)
    }
    if (updates.action !== undefined) {
      updateFields.push(`action = $${updateFields.length + 1}`)
      values.push(updates.action)
    }
    if (updates.is_active !== undefined) {
      updateFields.push(`is_active = $${updateFields.length + 1}`)
      values.push(updates.is_active)
    }

    if (updateFields.length === 0) {
      // No fields to update, return existing rule
      return existingRule.rows[0]
    }

    // Add updated_at and the WHERE clause parameters
    updateFields.push(`updated_at = NOW()`)
    values.push(ruleId)
    values.push(tenantId)

    const query = `
      UPDATE promotion_rules
      SET ${updateFields.join(', ')}
      WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
      RETURNING
        id,
        tenant_id,
        name,
        conditions,
        action,
        is_active,
        created_at,
        updated_at
    `

    const result = await sql.query(query, values)

    return result.rows.length > 0 ? result.rows[0] as PromotionRule : null
  } catch (error) {
    console.error('Error updating promotion rule:', error)
    throw new Error('Failed to update promotion rule')
  }
}
