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
      })
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
    })
  })

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      mockReq.body = null // This will cause an error

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })
  })
})
