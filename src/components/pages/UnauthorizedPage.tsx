import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '../ui/button'

const ROLE_PORTAL: Record<string, { label: string; path: string }> = {
  super_admin:  { label: 'Super Admin Portal',  path: '/super-admin' },
  tenant_admin: { label: 'School Dashboard',     path: '/tenant' },
  staff:        { label: 'Staff Dashboard',      path: '/staff/dashboard' },
  student:      { label: 'Student Portal',       path: '/student/dashboard' },
  parent:       { label: 'Parent Portal',        path: '/parent/dashboard' },
}

export function UnauthorizedPage() {
  const navigate = useNavigate()

  const auth = (() => {
    try { return JSON.parse(localStorage.getItem('auth') || '{}') } catch { return {} }
  })()
  const portal = auth.role ? ROLE_PORTAL[auth.role] : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-2">
            You don't have permission to access this page.
          </p>
          {portal && (
            <p className="text-sm text-gray-500 mb-6">
              Your account has the <strong>{auth.role}</strong> role. You can access the <strong>{portal.label}</strong>.
            </p>
          )}

          <div className="space-y-3">
            {portal && (
              <Button className="w-full" onClick={() => navigate(portal.path)}>
                Go to {portal.label}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}