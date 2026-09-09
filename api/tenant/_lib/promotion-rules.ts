import { sql } from '@vercel/postgres'

export interface PromotionRule {
  id: string
  tenantId: string
  name: string
  conditions: any
  action: 'promote' | 'review' | 'repeat'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export async function ensurePromotionRulesTable(): Promise<void> {
  try {
    // If the table was created with the old (level/threshold) schema, drop and recreate
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'promotion_rules' AND column_name = 'level'
        ) THEN
          DROP TABLE promotion_rules;
        END IF;
      END $$;
    `
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
        tenant_id as "tenantId",
        name,
        conditions,
        action,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM promotion_rules
      WHERE tenant_id = ${tenantId}
      ORDER BY
        CASE action
          WHEN 'promote' THEN 0
          WHEN 'review' THEN 1
          WHEN 'repeat' THEN 2
          ELSE 3
        END,
        created_at ASC
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
  updates: Partial<Omit<PromotionRule, 'id' | 'tenantId' | 'createdAt'>>
): Promise<PromotionRule | null> {
  try {
    await ensurePromotionRulesTable()

    const conditions = updates.conditions !== undefined ? JSON.stringify(updates.conditions) : null

    const result = await sql<PromotionRule>`
      UPDATE promotion_rules SET
        name = COALESCE(${updates.name ?? null}, name),
        conditions = COALESCE(${conditions}::jsonb, conditions),
        action = COALESCE(${updates.action ?? null}, action),
        is_active = COALESCE(${updates.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${ruleId} AND tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        conditions,
        action,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    return result.rows.length > 0 ? result.rows[0] as PromotionRule : null
  } catch (error) {
    console.error('Error updating promotion rule:', error)
    throw new Error('Failed to update promotion rule')
  }
}

export async function deletePromotionRule(tenantId: string, ruleId: string): Promise<boolean> {
  try {
    await ensurePromotionRulesTable()
    const result = await sql`
      DELETE FROM promotion_rules WHERE id = ${ruleId} AND tenant_id = ${tenantId}
      RETURNING id
    `
    return result.rows.length > 0
  } catch (error) {
    console.error('Error deleting promotion rule:', error)
    throw new Error('Failed to delete promotion rule')
  }
}

export async function createPromotionRule(tenantId: string, rule: { name: string; conditions: any; action: 'promote' | 'review' | 'repeat'; isActive?: boolean }): Promise<PromotionRule> {
  try {
    await ensurePromotionRulesTable()
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const result = await sql<PromotionRule>`
      INSERT INTO promotion_rules (id, tenant_id, name, conditions, action, is_active)
      VALUES (${id}, ${tenantId}, ${rule.name}, ${JSON.stringify(rule.conditions || {})}::jsonb, ${rule.action}, ${rule.isActive ?? true})
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        conditions,
        action,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
    return result.rows[0] as PromotionRule
  } catch (error) {
    console.error('Error creating promotion rule:', error)
    throw new Error('Failed to create promotion rule')
  }
}
