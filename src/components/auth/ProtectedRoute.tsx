import React from 'react'
import { Navigate } from 'react-router-dom'
import { getAuthFromStorage, isTokenExpired } from '../../lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  redirectTo?: string
}

/**
 * ProtectedRoute component that guards routes from unauthorized access.
 *
 * - If no token or token is expired, redirects to the specified redirectTo path (default: /login)
 * - If requiredRole is specified and the token role doesn't match, redirects to /unauthorized
 * - Otherwise renders the children
 *
 * @param children - The component(s) to render if authorized
 * @param requiredRole - Optional role required to access this route
 * @param redirectTo - Path to redirect to if not authenticated (default: /login)
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps): React.ReactNode {
  const auth = getAuthFromStorage()

  // Check if token exists and is not expired
  if (!auth || isTokenExpired(auth.token)) {
    return <Navigate to={redirectTo} />
  }

  // Check if requiredRole is specified and validate it
  if (requiredRole) {
    // Parse the token to extract the role
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    try {
      const parts = auth.token.split('.')
      if (parts.length !== 3) {
        return <Navigate to="/unauthorized" />
      }

      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]))
      const tokenRole = payload.role

      // If the token role doesn't match the required role, redirect to unauthorized
      if (tokenRole !== requiredRole) {
        return <Navigate to="/unauthorized" />
      }
    } catch {
      // If we can't parse the token, redirect to unauthorized
      return <Navigate to="/unauthorized" />
    }
  }

  // All checks passed, render children
  return children
}
