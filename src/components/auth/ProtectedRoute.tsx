import React from 'react'
import { Navigate } from 'react-router-dom'
import { getAuthFromStorage, isTokenExpired } from '../../lib/auth'

type AppRole = 'super_admin' | 'tenant_admin' | 'student' | 'staff' | 'parent'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: AppRole
  redirectTo?: string
}

/**
 * ProtectedRoute component that guards routes from unauthorized access.
 *
 * - If no token or token is expired, redirects to the specified redirectTo path (default: /login)
 * - If requiredRole is specified and auth.role doesn't match, redirects to /unauthorized
 * - Otherwise renders the children
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps): React.ReactNode {
  const auth = getAuthFromStorage()

  if (!auth || isTokenExpired()) {
    return <Navigate to={redirectTo} replace />
  }

  if (requiredRole && auth.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
