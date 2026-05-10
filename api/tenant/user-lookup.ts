import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Pool } from 'pg'

/**
 * User Lookup Endpoint
 * Looks up a user by email and returns their tenant ID
 * Used during login to get the actual tenant UUID instead of using email as tenant ID
 */

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    const pool = getPool()
    const result = await pool.query(
      'SELECT "tenantId" FROM "users" WHERE email = $1 LIMIT 1',
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    return res.status(200).json({ tenantId: user.tenantId })
  } catch (error) {
    console.error('User lookup error:', error)
    return res.status(500).json({ error: 'Failed to lookup user' })
  }
}
