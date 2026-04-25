import { sql } from '@vercel/postgres'

export interface PromotionRule {
  id: string
  tenant_id: string
  level: string
  promotion_threshold: number
  repeat_threshold: number
  review_threshold: number
  attendance_threshold: number
  active: boolean
  created_at: string
  updated_at: string
}

export async function ensurePromotionRulesTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        level VARCHAR(50) NOT NULL,
        promotion_threshold NUMERIC(5,2) NOT NULL,
        repeat_threshold NUMERIC(5,2) NOT NULL,
        review_threshold NUMERIC(5,2) NOT NULL,
        attendance_threshold NUMERIC(5,2) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, level)
      )
    `

    // Create index on tenant_id for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_promotion_rules_tenant ON promotion_rules(tenant_id)
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
        level,
        promotion_threshold,
        repeat_threshold,
        review_threshold,
        attendance_threshold,
        active,
        created_at,
        updated_at
      FROM promotion_rules
      WHERE tenant_id = ${tenantId}
      ORDER BY level ASC
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
    const values: (string | number | boolean)[] = []

    if (updates.promotion_threshold !== undefined) {
      updateFields.push(`promotion_threshold = $${updateFields.length + 1}`)
      values.push(updates.promotion_threshold)
    }
    if (updates.repeat_threshold !== undefined) {
      updateFields.push(`repeat_threshold = $${updateFields.length + 1}`)
      values.push(updates.repeat_threshold)
    }
    if (updates.review_threshold !== undefined) {
      updateFields.push(`review_threshold = $${updateFields.length + 1}`)
      values.push(updates.review_threshold)
    }
    if (updates.attendance_threshold !== undefined) {
      updateFields.push(`attendance_threshold = $${updateFields.length + 1}`)
      values.push(updates.attendance_threshold)
    }
    if (updates.active !== undefined) {
      updateFields.push(`active = $${updateFields.length + 1}`)
      values.push(updates.active)
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
        level,
        promotion_threshold,
        repeat_threshold,
        review_threshold,
        attendance_threshold,
        active,
        created_at,
        updated_at
    `

    const result = await sql<PromotionRule>(query, values)

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('Error updating promotion rule:', error)
    throw new Error('Failed to update promotion rule')
  }
}
