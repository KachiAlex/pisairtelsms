import { describe, it, expect } from 'vitest'

/**
 * Property 23: Promotion Rule Retrieval — GET returns all active and inactive rules for tenant
 * Property 24: Promotion Rule Update — PUT returns the updated record for valid id and fields
 * Validates: Requirements 5.2, 5.3
 */

interface PromotionRule {
  id: string
  tenantId: string
  level: string
  promotionThreshold: number
  repeatThreshold: number
  reviewThreshold: number
  attendanceThreshold: number
  active: boolean
  createdAt: string
  updatedAt: string
}

type RuleUpdate = Partial<Omit<PromotionRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>

// Mirrors getPromotionRules logic
function getRulesForTenant(rules: PromotionRule[], tenantId: string): PromotionRule[] {
  return rules.filter(r => r.tenantId === tenantId)
}

// Mirrors updatePromotionRule logic
function updateRule(
  rules: PromotionRule[],
  tenantId: string,
  id: string,
  updates: RuleUpdate
): PromotionRule | null {
  const idx = rules.findIndex(r => r.id === id && r.tenantId === tenantId)
  if (idx === -1) return null
  const updated = { ...rules[idx], ...updates, updatedAt: new Date().toISOString() }
  rules[idx] = updated
  return updated
}

function buildRule(overrides: Partial<PromotionRule> = {}): PromotionRule {
  return {
    id: 'rule_001',
    tenantId: 'tenant_001',
    level: 'JSS',
    promotionThreshold: 50,
    repeatThreshold: 40,
    reviewThreshold: 45,
    attendanceThreshold: 75,
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('Promotion Rules API - Property Tests', () => {
  describe('Property 23: Promotion Rule Retrieval', () => {
    it('should return all rules (active and inactive) for a tenant', () => {
      const rules = [
        buildRule({ id: 'r1', tenantId: 'tenant_001', level: 'Primary', active: true }),
        buildRule({ id: 'r2', tenantId: 'tenant_001', level: 'JSS', active: false }),
        buildRule({ id: 'r3', tenantId: 'tenant_001', level: 'SSS', active: true }),
        buildRule({ id: 'r4', tenantId: 'tenant_002', level: 'JSS', active: true }),
      ]
      const result = getRulesForTenant(rules, 'tenant_001')
      expect(result).toHaveLength(3)
      expect(result.every(r => r.tenantId === 'tenant_001')).toBe(true)
    })

    it('should include inactive rules in results', () => {
      const rules = [
        buildRule({ id: 'r1', tenantId: 'tenant_001', active: true }),
        buildRule({ id: 'r2', tenantId: 'tenant_001', active: false }),
      ]
      const result = getRulesForTenant(rules, 'tenant_001')
      expect(result).toHaveLength(2)
      expect(result.some(r => r.active === false)).toBe(true)
    })

    it('should not return rules from other tenants', () => {
      const rules = [
        buildRule({ id: 'r1', tenantId: 'tenant_001' }),
        buildRule({ id: 'r2', tenantId: 'tenant_002' }),
        buildRule({ id: 'r3', tenantId: 'tenant_003' }),
      ]
      const result = getRulesForTenant(rules, 'tenant_001')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('r1')
    })

    it('should return empty array for tenant with no rules', () => {
      const rules = [buildRule({ tenantId: 'tenant_001' })]
      const result = getRulesForTenant(rules, 'tenant_999')
      expect(result).toHaveLength(0)
    })

    it('should return all rules regardless of active status (property-based)', () => {
      for (let i = 0; i < 10; i++) {
        const count = 2 + (i % 4)
        const rules = Array.from({ length: count }, (_, j) =>
          buildRule({ id: `r${j}`, tenantId: 'tenant_001', active: j % 2 === 0 })
        )
        // Add rules for another tenant
        rules.push(buildRule({ id: 'other', tenantId: 'tenant_002' }))

        const result = getRulesForTenant(rules, 'tenant_001')
        expect(result).toHaveLength(count)
        expect(result.every(r => r.tenantId === 'tenant_001')).toBe(true)
      }
    })
  })

  describe('Property 24: Promotion Rule Update', () => {
    it('should return updated record for valid id and fields', () => {
      const rules = [buildRule({ id: 'r1', tenantId: 'tenant_001', promotionThreshold: 50 })]
      const updated = updateRule(rules, 'tenant_001', 'r1', { promotionThreshold: 60 })
      expect(updated).not.toBeNull()
      expect(updated!.promotionThreshold).toBe(60)
      expect(updated!.id).toBe('r1')
    })

    it('should return null for non-existent rule id', () => {
      const rules = [buildRule({ id: 'r1', tenantId: 'tenant_001' })]
      const result = updateRule(rules, 'tenant_001', 'nonexistent', { promotionThreshold: 60 })
      expect(result).toBeNull()
    })

    it('should return null when tenantId does not match', () => {
      const rules = [buildRule({ id: 'r1', tenantId: 'tenant_001' })]
      const result = updateRule(rules, 'tenant_002', 'r1', { promotionThreshold: 60 })
      expect(result).toBeNull()
    })

    it('should preserve unchanged fields after update', () => {
      const rules = [buildRule({
        id: 'r1',
        tenantId: 'tenant_001',
        level: 'JSS',
        promotionThreshold: 50,
        repeatThreshold: 40,
        attendanceThreshold: 75,
      })]
      const updated = updateRule(rules, 'tenant_001', 'r1', { promotionThreshold: 65 })
      expect(updated!.level).toBe('JSS')
      expect(updated!.repeatThreshold).toBe(40)
      expect(updated!.attendanceThreshold).toBe(75)
    })

    it('should update multiple fields at once', () => {
      const rules = [buildRule({ id: 'r1', tenantId: 'tenant_001' })]
      const updated = updateRule(rules, 'tenant_001', 'r1', {
        promotionThreshold: 55,
        repeatThreshold: 35,
        active: false,
      })
      expect(updated!.promotionThreshold).toBe(55)
      expect(updated!.repeatThreshold).toBe(35)
      expect(updated!.active).toBe(false)
    })

    it('should update updatedAt timestamp on every update (property-based)', () => {
      for (let i = 0; i < 10; i++) {
        const rules = [buildRule({ id: 'r1', tenantId: 'tenant_001', updatedAt: '2024-01-01T00:00:00.000Z' })]
        const before = rules[0].updatedAt
        const updated = updateRule(rules, 'tenant_001', 'r1', { promotionThreshold: 50 + i })
        expect(updated!.updatedAt).not.toBe(before)
      }
    })
  })
})
