import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getAuthFromStorage,
  setAuthInStorage,
  clearAuthFromStorage,
  isTokenExpired,
  AuthStorage,
} from './auth'

describe('Auth Token Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getAuthFromStorage', () => {
    it('should return null when localStorage is empty', () => {
      const result = getAuthFromStorage()
      expect(result).toBeNull()
    })

    it('should return null when auth key does not exist', () => {
      localStorage.setItem('other-key', 'value')
      const result = getAuthFromStorage()
      expect(result).toBeNull()
    })

    it('should return null when stored data is malformed JSON', () => {
      localStorage.setItem('auth', 'not-valid-json{')
      const result = getAuthFromStorage()
      expect(result).toBeNull()
    })

    it('should return null when required fields are missing', () => {
      localStorage.setItem('auth', JSON.stringify({ token: 'abc123' }))
      const result = getAuthFromStorage()
      expect(result).toBeNull()
    })

    it('should return null when token field is not a string', () => {
      localStorage.setItem(
        'auth',
        JSON.stringify({
          token: 123,
          tenantId: 'tenant-001',
          expiresAt: Date.now() + 3600000,
        })
      )
      const result = getAuthFromStorage()
      expect(result).toBeNull()
    })

    it('should return null when tenantId field is not a string', () => {
      localStorage.setItem(
        'auth',
        JSON.stringify({
          token: 'abc123',
          tenantId: 123,
          expiresAt: Date.now() + 3600000,
        })
      )
      const result = getAuthFromStorage()
      expect(result).toBeNull()
    })

    it('should return null when expiresAt field is not a number', () => {
      localStorage.setItem(
        'auth',
        JSON.stringify({
          token: 'abc123',
          tenantId: 'tenant-001',
          expiresAt: 'not-a-number',
        })
      )
      const result = getAuthFromStorage()
      expect(result).toBeNull()
    })

    it('should return valid AuthStorage when all fields are correct', () => {
      const auth: AuthStorage = {
        token: 'valid-token-123',
        tenantId: 'tenant-001',
        expiresAt: Date.now() + 3600000,
      }
      localStorage.setItem('auth', JSON.stringify(auth))

      const result = getAuthFromStorage()
      expect(result).toEqual(auth)
      expect(result?.token).toBe('valid-token-123')
      expect(result?.tenantId).toBe('tenant-001')
      expect(result?.expiresAt).toBe(auth.expiresAt)
    })

    it('should handle extra fields in stored data gracefully', () => {
      const auth: AuthStorage = {
        token: 'valid-token-123',
        tenantId: 'tenant-001',
        expiresAt: Date.now() + 3600000,
      }
      localStorage.setItem(
        'auth',
        JSON.stringify({
          ...auth,
          extraField: 'should-be-ignored',
        })
      )

      const result = getAuthFromStorage()
      expect(result).toEqual(auth)
    })
  })

  describe('setAuthInStorage', () => {
    it('should store auth data in localStorage', () => {
      const auth: AuthStorage = {
        token: 'test-token',
        tenantId: 'tenant-001',
        expiresAt: Date.now() + 3600000,
      }

      setAuthInStorage(auth)

      const stored = localStorage.getItem('auth')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored!)).toEqual(auth)
    })

    it('should overwrite existing auth data', () => {
      const auth1: AuthStorage = {
        token: 'token-1',
        tenantId: 'tenant-001',
        expiresAt: Date.now() + 3600000,
      }
      const auth2: AuthStorage = {
        token: 'token-2',
        tenantId: 'tenant-002',
        expiresAt: Date.now() + 7200000,
      }

      setAuthInStorage(auth1)
      setAuthInStorage(auth2)

      const result = getAuthFromStorage()
      expect(result).toEqual(auth2)
    })
  })

  describe('clearAuthFromStorage', () => {
    it('should remove auth data from localStorage', () => {
      const auth: AuthStorage = {
        token: 'test-token',
        tenantId: 'tenant-001',
        expiresAt: Date.now() + 3600000,
      }

      setAuthInStorage(auth)
      expect(getAuthFromStorage()).not.toBeNull()

      clearAuthFromStorage()

      expect(getAuthFromStorage()).toBeNull()
      expect(localStorage.getItem('auth')).toBeNull()
    })

    it('should not throw error when clearing empty storage', () => {
      expect(() => clearAuthFromStorage()).not.toThrow()
    })

    it('should not affect other localStorage keys', () => {
      localStorage.setItem('other-key', 'other-value')
      const auth: AuthStorage = {
        token: 'test-token',
        tenantId: 'tenant-001',
        expiresAt: Date.now() + 3600000,
      }

      setAuthInStorage(auth)
      clearAuthFromStorage()

      expect(localStorage.getItem('other-key')).toBe('other-value')
      expect(localStorage.getItem('auth')).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return true when no auth data exists', () => {
      const result = isTokenExpired('any-token')
      expect(result).toBe(true)
    })

    it('should return true when token does not match stored token', () => {
      const auth: AuthStorage = {
        token: 'stored-token',
        tenantId: 'tenant-001',
        expiresAt: Date.now() + 3600000,
      }
      setAuthInStorage(auth)

      const result = isTokenExpired('different-token')
      expect(result).toBe(true)
    })

    it('should return true when token has expired (past expiresAt)', () => {
      const auth: AuthStorage = {
        token: 'test-token',
        tenantId: 'tenant-001',
        expiresAt: Date.now() - 1000, // 1 second in the past
      }
      setAuthInStorage(auth)

      const result = isTokenExpired('test-token')
      expect(result).toBe(true)
    })

    it('should return false when token is valid and not expired', () => {
      const futureTime = Date.now() + 3600000 // 1 hour in the future
      const auth: AuthStorage = {
        token: 'test-token',
        tenantId: 'tenant-001',
        expiresAt: futureTime,
      }
      setAuthInStorage(auth)

      const result = isTokenExpired('test-token')
      expect(result).toBe(false)
    })

    it('should return false when token expires exactly at current time', () => {
      const now = Date.now()
      const auth: AuthStorage = {
        token: 'test-token',
        tenantId: 'tenant-001',
        expiresAt: now,
      }
      setAuthInStorage(auth)

      // Note: This is a boundary case. The implementation uses > so exact match is not expired
      const result = isTokenExpired('test-token')
      expect(result).toBe(false)
    })

    it('should return true when token expires 1ms before current time', () => {
      const now = Date.now()
      const auth: AuthStorage = {
        token: 'test-token',
        tenantId: 'tenant-001',
        expiresAt: now - 1,
      }
      setAuthInStorage(auth)

      const result = isTokenExpired('test-token')
      expect(result).toBe(true)
    })

    it('should handle multiple tokens correctly', () => {
      const futureTime = Date.now() + 3600000
      const auth: AuthStorage = {
        token: 'token-1',
        tenantId: 'tenant-001',
        expiresAt: futureTime,
      }
      setAuthInStorage(auth)

      // Correct token should not be expired
      expect(isTokenExpired('token-1')).toBe(false)

      // Different token should be expired
      expect(isTokenExpired('token-2')).toBe(true)
    })
  })
})
