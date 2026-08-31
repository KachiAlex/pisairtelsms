/**
 * Shared JWT secret utility.
 * Throws if JWT_SECRET is not set, preventing the use of insecure fallbacks.
 */

let cachedSecret: Uint8Array | null = null

export function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is not set. ' +
      'Authentication cannot proceed without a secure secret.'
    )
  }

  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for adequate security.'
    )
  }

  cachedSecret = new TextEncoder().encode(secret)
  return cachedSecret
}
