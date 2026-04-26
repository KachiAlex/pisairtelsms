/**
 * Authentication utilities for token management and storage.
 * Handles reading, writing, and validating auth tokens in localStorage.
 */

/**
 * Represents the authentication data stored in localStorage.
 */
export interface AuthStorage {
  token: string
  tenantId: string
  expiresAt: number
  role?: 'super_admin' | 'tenant_admin' | 'student' | 'staff' | 'parent'
  userId?: string
}

const AUTH_STORAGE_KEY = 'auth'

/**
 * Retrieves authentication data from localStorage.
 * Returns null if storage is empty, missing, or contains malformed data.
 *
 * @returns AuthStorage object if valid auth data exists, null otherwise
 */
export function getAuthFromStorage(): AuthStorage | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored)

    // Validate required fields
    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.tenantId !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null
    }

    return parsed as AuthStorage
  } catch {
    // Return null on any parsing or validation error
    return null
  }
}

/**
 * Stores authentication data in localStorage.
 *
 * @param auth - The authentication data to store
 */
export function setAuthInStorage(auth: AuthStorage): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

/**
 * Removes all authentication data from localStorage.
 */
export function clearAuthFromStorage(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

/**
 * Checks if a token has expired based on the stored expiresAt timestamp.
 * Compares the expiresAt timestamp with the current time.
 *
 * @param token - The token string (used for context, actual expiration is checked via stored expiresAt)
 * @returns true if the token has expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const auth = getAuthFromStorage()

  // If no auth data exists or token doesn't match, consider it expired
  if (!auth || auth.token !== token) {
    return true
  }

  // Check if current time is past the expiration time
  const now = Date.now()
  return now > auth.expiresAt
}
