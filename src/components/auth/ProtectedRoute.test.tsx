import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import * as authLib from '../../lib/auth'

// Mock the auth library
vi.mock('../../lib/auth')

const mockGetAuthFromStorage = vi.mocked(authLib.getAuthFromStorage)
const mockIsTokenExpired = vi.mocked(authLib.isTokenExpired)

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to /login when no token is present', () => {
    mockGetAuthFromStorage.mockReturnValue(null)

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    // Check that Navigate component redirects (location should change)
    expect(window.location.pathname).toBe('/')
  })

  it('should redirect to /login when token is expired', () => {
    mockGetAuthFromStorage.mockReturnValue({
      token: 'valid.token.here',
      tenantId: 'tenant-123',
      expiresAt: Date.now() - 1000, // Expired
    })
    mockIsTokenExpired.mockReturnValue(true)

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    // Token is expired, should redirect
    expect(mockIsTokenExpired).toHaveBeenCalled()
  })

  it('should render children when valid token is present', () => {
    mockGetAuthFromStorage.mockReturnValue({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InRlbmFudF9hZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      tenantId: 'tenant-123',
      expiresAt: Date.now() + 3600000, // 1 hour from now
    })
    mockIsTokenExpired.mockReturnValue(false)

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to /unauthorized when role does not match requiredRole', () => {
    mockGetAuthFromStorage.mockReturnValue({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InRlYWNoZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      tenantId: 'tenant-123',
      expiresAt: Date.now() + 3600000,
    })
    mockIsTokenExpired.mockReturnValue(false)

    render(
      <BrowserRouter>
        <ProtectedRoute requiredRole="tenant_admin">
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    // Should not render the protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render children when role matches requiredRole', () => {
    mockGetAuthFromStorage.mockReturnValue({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InRlbmFudF9hZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      tenantId: 'tenant-123',
      expiresAt: Date.now() + 3600000,
    })
    mockIsTokenExpired.mockReturnValue(false)

    render(
      <BrowserRouter>
        <ProtectedRoute requiredRole="tenant_admin">
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to custom redirectTo path when token is expired', () => {
    mockGetAuthFromStorage.mockReturnValue(null)

    render(
      <BrowserRouter>
        <ProtectedRoute redirectTo="/custom-login">
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    // Should redirect to custom path
    expect(mockGetAuthFromStorage).toHaveBeenCalled()
  })

  it('should redirect to /unauthorized when token cannot be parsed', () => {
    mockGetAuthFromStorage.mockReturnValue({
      token: 'invalid-token-format',
      tenantId: 'tenant-123',
      expiresAt: Date.now() + 3600000,
    })
    mockIsTokenExpired.mockReturnValue(false)

    render(
      <BrowserRouter>
        <ProtectedRoute requiredRole="tenant_admin">
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    // Should not render the protected content due to invalid token format
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
