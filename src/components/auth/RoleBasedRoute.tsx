import React from 'react'
import { Navigate } from 'react-router-dom'
import { getAuthFromStorage, isTokenExpired } from '../../lib/auth'

interface RoleBasedRouteProps {
  children: React.ReactNode
  allowedRoles: Array<'super_admin' | 'tenant_admin' | 'student' | 'staff' | 'parent'>
  redirectTo?: string
}

export function RoleBasedRoute({ children, allowedRoles, redirectTo = '/login' }: RoleBasedRouteProps) {
  const auth = getAuthFromStorage()

  // No auth or token expired
  if (!auth || isTokenExpired()) {
    return <Navigate to={redirectTo} />
  }

  // Role not allowed
  if (!auth.role || !allowedRoles.includes(auth.role)) {
    return <Navigate to="/unauthorized" />
  }

  return <>{children}</>
}
