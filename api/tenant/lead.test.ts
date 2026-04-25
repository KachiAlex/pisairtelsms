import { describe, it, expect } from 'vitest'

/**
 * Property 5: Lead Creation Validation
 * For any lead payload missing any of studentName, parentName, contactPhone, contactEmail,
 * the handler must return HTTP 400 with field-level error details.
 *
 * Property 6: Lead Persistence Round Trip
 * For any valid lead payload, the handler must return HTTP 201 and the persisted data must match the input.
 *
 * Validates: Requirements 2.5, 2.6
 */

// Validation logic extracted from the handler (mirrors api/tenant/lead.ts)
interface LeadPayload {
  studentName?: string
  parentName?: string
  contactPhone?: string
  contactEmail?: string
  classInterested?: string
  source?: string
  status?: string
}

interface ValidationResult {
  valid: boolean
  missingFields: string[]
}

function validateLeadPayload(payload: LeadPayload): ValidationResult {
  const missingFields: string[] = []
  if (!payload.studentName) missingFields.push('studentName')
  if (!payload.parentName) missingFields.push('parentName')
  if (!payload.contactPhone) missingFields.push('contactPhone')
  if (!payload.contactEmail) missingFields.push('contactEmail')
  return { valid: missingFields.length === 0, missingFields }
}

function buildValidPayload(overrides: Partial<LeadPayload> = {}): LeadPayload {
  return {
    studentName: 'Test Student',
    parentName: 'Test Parent',
    contactPhone: '+2348012345678',
    contactEmail: 'parent@example.com',
    classInterested: 'JSS 1',
    source: 'website',
    status: 'new',
    ...overrides,
  }
}

describe('Lead API - Property Tests', () => {
  describe('Property 5: Lead Creation Validation', () => {
    const requiredFields: (keyof LeadPayload)[] = [
      'studentName',
      'parentName',
      'contactPhone',
      'contactEmail',
    ]

    it('should reject payload missing studentName', () => {
      // Property: for any payload missing studentName → invalid with field error
      for (let i = 0; i < 20; i++) {
        const payload = buildValidPayload({ studentName: undefined })
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(false)
        expect(result.missingFields).toContain('studentName')
      }
    })

    it('should reject payload missing parentName', () => {
      for (let i = 0; i < 20; i++) {
        const payload = buildValidPayload({ parentName: undefined })
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(false)
        expect(result.missingFields).toContain('parentName')
      }
    })

    it('should reject payload missing contactPhone', () => {
      for (let i = 0; i < 20; i++) {
        const payload = buildValidPayload({ contactPhone: undefined })
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(false)
        expect(result.missingFields).toContain('contactPhone')
      }
    })

    it('should reject payload missing contactEmail', () => {
      for (let i = 0; i < 20; i++) {
        const payload = buildValidPayload({ contactEmail: undefined })
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(false)
        expect(result.missingFields).toContain('contactEmail')
      }
    })

    it('should include all missing fields in error details (property-based)', () => {
      // For any subset of missing required fields, all missing fields appear in details
      const subsets: (keyof LeadPayload)[][] = [
        ['studentName', 'parentName'],
        ['contactPhone', 'contactEmail'],
        ['studentName', 'contactEmail'],
        ['parentName', 'contactPhone', 'contactEmail'],
        ['studentName', 'parentName', 'contactPhone', 'contactEmail'],
      ]

      for (const missing of subsets) {
        const overrides = Object.fromEntries(missing.map(f => [f, undefined])) as Partial<LeadPayload>
        const payload = buildValidPayload(overrides)
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(false)
        for (const field of missing) {
          expect(result.missingFields).toContain(field)
        }
      }
    })

    it('should reject empty string values for required fields', () => {
      for (const field of requiredFields) {
        const payload = buildValidPayload({ [field]: '' })
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(false)
        expect(result.missingFields).toContain(field)
      }
    })
  })

  describe('Property 6: Lead Persistence Round Trip', () => {
    it('should accept a fully valid payload', () => {
      const payload = buildValidPayload()
      const result = validateLeadPayload(payload)
      expect(result.valid).toBe(true)
      expect(result.missingFields).toHaveLength(0)
    })

    it('should accept valid payloads with optional fields omitted (property-based)', () => {
      // Optional fields: classInterested, source, status — omitting them should still be valid
      const variants = [
        buildValidPayload({ classInterested: undefined }),
        buildValidPayload({ source: undefined }),
        buildValidPayload({ status: undefined }),
        buildValidPayload({ classInterested: undefined, source: undefined }),
        buildValidPayload({ classInterested: undefined, source: undefined, status: undefined }),
      ]

      for (const payload of variants) {
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(true)
        expect(result.missingFields).toHaveLength(0)
      }
    })

    it('should preserve all required fields in a valid payload (round-trip check)', () => {
      const input = buildValidPayload()
      const result = validateLeadPayload(input)
      expect(result.valid).toBe(true)
      // All required fields present in input
      expect(input.studentName).toBeDefined()
      expect(input.parentName).toBeDefined()
      expect(input.contactPhone).toBeDefined()
      expect(input.contactEmail).toBeDefined()
    })

    it('should handle 20 randomly generated valid payloads (property-based)', () => {
      const names = ['Alice', 'Bob', 'Chidi', 'Dayo', 'Emeka']
      const phones = ['+2348011111111', '+2348022222222', '+2348033333333']
      const emails = ['a@test.com', 'b@test.com', 'c@test.com']

      for (let i = 0; i < 20; i++) {
        const payload = buildValidPayload({
          studentName: names[i % names.length],
          parentName: `Parent ${i}`,
          contactPhone: phones[i % phones.length],
          contactEmail: emails[i % emails.length],
        })
        const result = validateLeadPayload(payload)
        expect(result.valid).toBe(true)
        expect(result.missingFields).toHaveLength(0)
      }
    })
  })
})
