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
 *
 * @returns true if the token has expired or no auth data exists, false otherwise
 */
export function isTokenExpired(): boolean {
  const auth = getAuthFromStorage()

  if (!auth) {
    return true
  }

  return Date.now() > auth.expiresAt
}
