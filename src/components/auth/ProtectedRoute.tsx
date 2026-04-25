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
    // Map tenantId to role
    let userRole = 'tenant_admin' // default role
    if (auth.tenantId === 'super-admin') {
      userRole = 'super_admin'
    }

    // If the user role doesn't match the required role, redirect to unauthorized
    if (userRole !== requiredRole) {
      return <Navigate to="/unauthorized" />
    }
  }

  // All checks passed, render children
  return children
}
