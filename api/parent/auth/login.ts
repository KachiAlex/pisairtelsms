import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  parentId: string
  childrenIds: string[]
  expiresAt: number
}

/**
 * Parent login endpoint
 * Validates parent credentials and returns JWT token with parent and children info
 * 
 * Validates: Requirements 1.1, 1.2, 1.6, 1.7
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body as LoginRequest

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        details: { field: 'email and password are required' }
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: { field: 'Invalid email format' }
      })
    }

    // TODO: In production, query parent database to validate credentials
    // For now, we'll use mock data for testing
    // This should:
    // 1. Query parents table by email
    // 2. Hash and compare password
    // 3. Fetch linked children from parent_children junction table

    // Mock parent data - replace with actual database query
    const mockParents: Record<string, { id: string; email: string; password: string; childrenIds: string[] }> = {
      'parent@example.com': {
        id: 'parent-001',
        email: 'parent@example.com',
        password: 'password123', // In production, this would be hashed
        childrenIds: ['student-001', 'student-002']
      }
    }

    const parent = mockParents[email]

    // Validate credentials
    if (!parent || parent.password !== password) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid email or password'
      })
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const expiresIn = 24 * 60 * 60 // 24 hours
    const expiresAt = Date.now() + expiresIn * 1000

    const token = jwt.sign(
      {
        parentId: parent.id,
        childrenIds: parent.childrenIds,
        role: 'parent',
        email: parent.email
      },
      jwtSecret,
      { expiresIn: `${expiresIn}s` }
    )

    const response: LoginResponse = {
      token,
      parentId: parent.id,
      childrenIds: parent.childrenIds,
      expiresAt
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Failed to process login' })
  }
}
