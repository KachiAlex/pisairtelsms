import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'

interface BlacklistedToken {
  token: string
  userId: string
  expiresAt: number
  revokedAt: number
}

// In-memory store for blacklisted tokens (for production, use Redis or database)
const tokenBlacklist = new Map<string, BlacklistedToken>()

/**
 * Ensure the token_blacklist table exists in the database.
 */
async function ensureBlacklistTable(): Promise<void> {
  try {
    } catch (error) {
    console.error('Failed to ensure token_blacklist table:', error)
  }
}

/**
 * Revoke a token by adding it to the blacklist.
 */
export async function revokeToken(token: string, userId: string, expiresAt: number): Promise<void> {
  const revokedAt = Date.now()
  
  // Add to in-memory store
  tokenBlacklist.set(token, { token, userId, expiresAt, revokedAt })
  
  // Also persist to database for cross-instance support
  try {
    await ensureBlacklistTable()
    await sql`
      INSERT INTO token_blacklist (token, user_id, expires_at, revoked_at)
      VALUES (${token}, ${userId}, ${expiresAt}, ${revokedAt})
    `
  } catch (error) {
    console.error('Failed to blacklist token in database:', error)
  }
}

/**
 * Check if a token is blacklisted.
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  // Check in-memory store first
  const memEntry = tokenBlacklist.get(token)
  if (memEntry) {
    // Clean up expired tokens
    if (Date.now() > memEntry.expiresAt) {
      tokenBlacklist.delete(token)
      return false
    }
    return true
  }
  
  // Check database
  try {
    await ensureBlacklistTable()
    const result = await sql`
      SELECT expires_at FROM token_blacklist
      WHERE token = ${token} AND expires_at > ${Date.now()}
      LIMIT 1
    `
    if (result.rows.length > 0) {
      // Cache in memory
      tokenBlacklist.set(token, {
        token,
        userId: '',
        expiresAt: result.rows[0].expires_at,
        revokedAt: Date.now(),
      })
      return true
    }
  } catch (error) {
    console.error('Failed to check token blacklist:', error)
  }
  
  return false
}

/**
 * Revoke all tokens for a user (logout from all devices).
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    await ensureBlacklistTable()
    await sql`DELETE FROM token_blacklist WHERE user_id = ${userId}`
  } catch (error) {
    console.error('Failed to revoke all user tokens:', error)
  }
  
  // Clear in-memory entries for this user
  for (const [token, entry] of tokenBlacklist.entries()) {
    if (entry.userId === userId) {
      tokenBlacklist.delete(token)
    }
  }
}

/**
 * Clean up expired tokens from the blacklist.
 * Call this periodically to prevent memory/database bloat.
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const now = Date.now()
  
  // Clean in-memory store
  for (const [token, entry] of tokenBlacklist.entries()) {
    if (now > entry.expiresAt) {
      tokenBlacklist.delete(token)
    }
  }
  
  // Clean database
  try {
    await ensureBlacklistTable()
    await sql`DELETE FROM token_blacklist WHERE expires_at < ${now}`
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error)
  }
}

// Auto-cleanup expired tokens every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000)
}

/**
 * Middleware to check if a token is blacklisted.
 * Returns true if blacklisted (error response already sent), false if valid.
 */
export async function requireValidToken(
  req: VercelRequest,
  res: VercelResponse
): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' })
    return true
  }
  
  const token = authHeader.substring(7)
  const blacklisted = await isTokenBlacklisted(token)
  
  if (blacklisted) {
    res.status(401).json({ error: 'Unauthorized: Token has been revoked' })
    return true
  }
  
  return false
}
