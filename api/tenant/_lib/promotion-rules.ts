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

    const conditions = updates.conditions !== undefined ? JSON.stringify(updates.conditions) : null

    const result = await sql<PromotionRule>`
      UPDATE promotion_rules SET
        name = COALESCE(${updates.name ?? null}, name),
        conditions = COALESCE(${conditions}::jsonb, conditions),
        action = COALESCE(${updates.action ?? null}, action),
        is_active = COALESCE(${updates.is_active ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${ruleId} AND tenant_id = ${tenantId}
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

    return result.rows.length > 0 ? result.rows[0] as PromotionRule : null
  } catch (error) {
    console.error('Error updating promotion rule:', error)
    throw new Error('Failed to update promotion rule')
  }
}
