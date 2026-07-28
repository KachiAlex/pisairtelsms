import { describe, it, expect } from 'vitest'
import {
  extractParentInfoFromJWT,
  verifyParentChildRelationship,
  isParentTokenValid,
  extractTokenFromHeader
} from './parentAuth'

describe('Parent Authentication Utilities', () => {
  describe('extractParentInfoFromJWT', () => {
    it('should extract parent info from valid JWT token', () => {
      // Create a mock JWT token (without verification)
      const payload = {
        parentId: 'parent-001',
        childrenIds: ['student-001', 'student-002'],
        role: 'parent',
        email: 'parent@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      }

      // Manually create a JWT-like token for testing
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
      const body = Buffer.from(JSON.stringify(payload)).toString('base64')
      const signature = 'test-signature'
      const token = `${header}.${body}.${signature}`

      const result = extractParentInfoFromJWT(token)

      expect(result).not.toBeNull()
      expect(result?.parentId).toBe('parent-001')
      expect(result?.childrenIds).toEqual(['student-001', 'student-002'])
      expect(result?.role).toBe('parent')
      expect(result?.email).toBe('parent@example.com')
    })

    it('should return null for invalid token format', () => {
      const result = extractParentInfoFromJWT('invalid-token')
      expect(result).toBeNull()
    })

    it('should return null for empty token', () => {
      const result = extractParentInfoFromJWT('')
      expect(result).toBeNull()
    })

    it('should handle Bearer prefix', () => {
      const payload = {
        parentId: 'parent-001',
        childrenIds: ['student-001'],
        role: 'parent',
        email: 'parent@example.com'
      }

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
      const body = Buffer.from(JSON.stringify(payload)).toString('base64')
      const token = `Bearer ${header}.${body}.signature`

      const result = extractParentInfoFromJWT(token)

      expect(result).not.toBeNull()
      expect(result?.parentId).toBe('parent-001')
    })

    it('should return null if missing required fields', () => {
      const payload = {
        parentId: 'parent-001',
        // Missing childrenIds
        role: 'parent',
        email: 'parent@example.com'
      }

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
      const body = Buffer.from(JSON.stringify(payload)).toString('base64')
      const token = `${header}.${body}.signature`

      const result = extractParentInfoFromJWT(token)

      expect(result).toBeNull()
    })

    it('should return null if role is not parent', () => {
      const payload = {
        parentId: 'parent-001',
        childrenIds: ['student-001'],
        role: 'student',
        email: 'parent@example.com'
      }

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
      const body = Buffer.from(JSON.stringify(payload)).toString('base64')
      const token = `${header}.${body}.signature`

      const result = extractParentInfoFromJWT(token)

      expect(result).toBeNull()
    })
  })

  describe('verifyParentChildRelationship', () => {
    it('should return true for valid parent-child relationship', () => {
      const result = verifyParentChildRelationship(
        'parent-001',
        'student-001',
        ['student-001', 'student-002']
      )

      expect(result).toBe(true)
    })

    it('should return false if child not in linked children', () => {
      const result = verifyParentChildRelationship(
        'parent-001',
        'student-999',
        ['student-001', 'student-002']
      )

      expect(result).toBe(false)
    })

    it('should return false if parentId is missing', () => {
      const result = verifyParentChildRelationship(
        '',
        'student-001',
        ['student-001']
      )

      expect(result).toBe(false)
    })

    it('should return false if childId is missing', () => {
      const result = verifyParentChildRelationship(
        'parent-001',
        '',
        ['student-001']
      )

      expect(result).toBe(false)
    })

    it('should return false if childrenIds is missing', () => {
      const result = verifyParentChildRelationship(
        'parent-001',
        'student-001',
        []
      )

      expect(result).toBe(false)
    })
  })

  describe('isParentTokenValid', () => {
    it('should return true for valid non-expired token', () => {
      const payload = {
        parentId: 'parent-001',
        childrenIds: ['student-001'],
        role: 'parent',
        email: 'parent@example.com',
        exp: Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours
      }

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
      const body = Buffer.from(JSON.stringify(payload)).toString('base64')
      const token = `${header}.${body}.signature`

      const result = isParentTokenValid(token)

      expect(result).toBe(true)
    })

    it('should return false for expired token', () => {
      const payload = {
        parentId: 'parent-001',
        childrenIds: ['student-001'],
        role: 'parent',
        email: 'parent@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      }

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
      const body = Buffer.from(JSON.stringify(payload)).toString('base64')
      const token = `${header}.${body}.signature`

      const result = isParentTokenValid(token)

      expect(result).toBe(false)
    })

    it('should return false for invalid token', () => {
      const result = isParentTokenValid('invalid-token')

      expect(result).toBe(false)
    })
  })

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
      const result = extractTokenFromHeader(header)

      expect(result).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature')
    })

    it('should return null for missing Authorization header', () => {
      const result = extractTokenFromHeader(undefined)

      expect(result).toBeNull()
    })

    it('should return null for invalid Authorization header format', () => {
      const header = 'Basic eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
      const result = extractTokenFromHeader(header)

      expect(result).toBeNull()
    })

    it('should return null for empty Authorization header', () => {
      const result = extractTokenFromHeader('')

      expect(result).toBeNull()
    })
  })
})
