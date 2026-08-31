import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './login'

// Mock jose SignJWT
vi.mock('jose', () => ({
  SignJWT: class {
    constructor(private payload: any) {}
    setProtectedHeader() { return this }
    setExpirationTime() { return this }
    async sign() { return `mock-token-${this.payload.parentId}` }
  }
}))

// Mock rate-limit to avoid 429 during repeated test calls
vi.mock('../../_lib/rate-limit', () => ({
  rateLimit: () => false,
}))

// Mock parents lib to avoid DB connections
vi.mock('../../tenant/_lib/parents', () => ({
  fetchParentByEmail: vi.fn(async (email: string) => {
    if (email === 'parent@example.com') {
      return {
        id: 'parent-001',
        email: 'parent@example.com',
        name: 'Test Parent',
        tenantId: 'tenant-001',
        passwordHash: '$2a$10$mockhash',
        childrenIds: ['student-001', 'student-002'],
      }
    }
    return null
  }),
  verifyPassword: vi.fn(async (password: string, _hash: string) => password === 'password123'),
}))

// Mock audit logger to avoid DB connections
vi.mock('../../_lib/audit-logger', () => ({
  logLoginSuccess: vi.fn(async () => {}),
  logLoginFailure: vi.fn(async () => {}),
}))

// Mock security headers
vi.mock('../../_lib/security-headers', () => ({
  setSecurityHeaders: vi.fn(() => {}),
}))

// Mock cookie helper
vi.mock('../../_lib/cookie-helper', () => ({
  setCookie: vi.fn(() => {}),
}))

// Mock jwt-secret to provide a valid secret
vi.mock('../../_lib/jwt-secret', () => ({
  getJwtSecret: () => new TextEncoder().encode('a-very-secure-jwt-secret-with-32+chars!'),
}))

describe('Parent Login API Endpoint', () => {
  let mockReq: Partial<VercelRequest>
  let mockRes: Partial<VercelResponse>
  let statusCode: number
  let responseData: any

  beforeEach(() => {
    statusCode = 200
    responseData = null

    mockReq = {
      method: 'POST',
      body: {},
      headers: {}
    }

    mockRes = {
      status: vi.fn(function (code: number) {
        statusCode = code
        return this
      }),
      json: vi.fn(function (data: any) {
        responseData = data
        return this
      }),
      setHeader: vi.fn(function () { return this })
    }
  })

  describe('Method Validation', () => {
    it('should reject non-POST requests', async () => {
      mockReq.method = 'GET'

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })
  })

  describe('Input Validation', () => {
    it('should reject missing email', async () => {
      mockReq.body = { password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(responseData.error).toBe('Validation failed')
    })

    it('should reject missing password', async () => {
      mockReq.body = { email: 'parent@example.com' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(responseData.error).toBe('Validation failed')
    })

    it('should reject invalid email format', async () => {
      mockReq.body = { email: 'invalid-email', password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(responseData.error).toBe('Validation failed')
    })

    it('should accept valid email formats', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      // Should not return 400 for validation
      expect(mockRes.status).not.toHaveBeenCalledWith(400)
    })
  })

  describe('Authentication', () => {
    it('should reject invalid credentials', async () => {
      mockReq.body = { email: 'wrong@example.com', password: 'wrongpassword' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(responseData.error).toContain('Invalid email or password')
    })

    it('should accept valid credentials', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(responseData.token).toBeDefined()
      expect(responseData.parentId).toBe('parent-001')
      expect(responseData.childrenIds).toEqual(['student-001', 'student-002'])
      expect(responseData).toHaveProperty('name')
      expect(responseData).toHaveProperty('email')
      expect(responseData).toHaveProperty('tenantId')
    })
  })

  describe('Token Generation', () => {
    it('should return JWT token with correct payload', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(responseData.token).toBeDefined()
      expect(responseData.token).toContain('mock-token')
    })

    it('should return parentId and childrenIds', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(responseData.parentId).toBe('parent-001')
      expect(responseData.childrenIds).toEqual(['student-001', 'student-002'])
    })

    it('should return expiresAt timestamp', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      const beforeTime = Date.now()
      await handler(mockReq as VercelRequest, mockRes as VercelResponse)
      const afterTime = Date.now()

      expect(responseData.expiresAt).toBeDefined()
      expect(responseData.expiresAt).toBeGreaterThanOrEqual(beforeTime)
      expect(responseData.expiresAt).toBeLessThanOrEqual(afterTime + 86400000 + 1000)
    })

    it('should set token expiration to 24 hours', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      const beforeTime = Date.now()
      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      const expiresIn = responseData.expiresAt - beforeTime
      const expectedExpiresIn = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

      // Allow 1 second tolerance
      expect(expiresIn).toBeGreaterThan(expectedExpiresIn - 1000)
      expect(expiresIn).toBeLessThan(expectedExpiresIn + 1000)
    })
  })

  describe('Response Format', () => {
    it('should return 200 status on success', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(200)
    })

    it('should return JSON response', async () => {
      mockReq.body = { email: 'parent@example.com', password: 'password123' }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.json).toHaveBeenCalled()
      expect(responseData).toHaveProperty('token')
      expect(responseData).toHaveProperty('parentId')
      expect(responseData).toHaveProperty('childrenIds')
      expect(responseData).toHaveProperty('expiresAt')
      expect(responseData).toHaveProperty('name')
      expect(responseData).toHaveProperty('email')
      expect(responseData).toHaveProperty('tenantId')
    })
  })

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      mockReq.body = null // This will cause a TypeError caught by the handler

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })
})
