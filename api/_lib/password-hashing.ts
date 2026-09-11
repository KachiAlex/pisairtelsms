/**
 * Shared password hashing utilities (SEC-08).
 *
 * Standardizes on Argon2id (@node-rs/argon2) for all new password hashes.
 * Legacy hash formats are still verified transparently so existing accounts
 * can log in, and callers can transparently upgrade the stored hash on next
 * successful login via needsTransparentUpgrade().
 *
 * Supported legacy formats:
 *  - `salt:hash` where hash is 128 hex chars → crypto.scrypt(password, salt, 64)
 *  - `salt:hash` where hash is 64 hex chars  → HMAC-SHA256(password, salt)
 */
import { hash, verify } from '@node-rs/argon2'
import * as crypto from 'crypto'

/** Argon2id tuning constants */
const ARGON2_MEMORY = 19456 // KiB — OWASP recommended minimum (19 MiB)
const ARGON2_TIME_COST = 2
const ARGON2_PARALLELISM = 1

/**
 * Hash a password with Argon2id.
 * Returns a `$argon2id$...` encoded string.
 */
export async function hashPasswordSecurely(password: string): Promise<string> {
  return hash(password, {
    memoryCost: ARGON2_MEMORY,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  })
}

/**
 * Verify a password against a stored hash of any supported format:
 * Argon2id (preferred) or legacy scrypt / HMAC-SHA256.
 */
export async function verifyPasswordAnyFormat(password: string, stored: string): Promise<boolean> {
  if (!stored) return false

  // Argon2id (encoded hash includes algorithm prefix)
  if (stored.startsWith('$argon2')) {
    try {
      return await verify(stored, password)
    } catch {
      return false
    }
  }

  // Legacy `salt:hash` formats
  const [salt, storedHash] = stored.split(':')
  if (!salt || !storedHash) return false

  if (storedHash.length === 128) {
    // Legacy scrypt: crypto.scrypt(password, salt, 64)
    return new Promise(resolve => {
      crypto.scrypt(password, salt, 64, (err, derived) => {
        if (err) resolve(false)
        else resolve(derived.toString('hex') === storedHash)
      })
    })
  }

  if (storedHash.length === 64) {
    // Legacy HMAC-SHA256: HMAC-SHA256(password, salt)
    const attempt = crypto.createHmac('sha256', salt).update(password).digest('hex')
    return attempt === storedHash
  }

  return false
}

/**
 * Returns true when the stored hash is a legacy format that should be
 * transparently upgraded to Argon2id after a successful verification.
 */
export function needsTransparentUpgrade(stored: string): boolean {
  return !!stored && !stored.startsWith('$argon2')
}