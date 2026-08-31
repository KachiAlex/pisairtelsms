import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ParentLoginPage } from './ParentLoginPage'
import { getAuthFromStorage, setAuthInStorage, clearAuthFromStorage } from '../../lib/auth'

// Mock fetch
global.fetch = vi.fn()

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('Parent Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
    clearAuthFromStorage()
  })

  describe('Complete Login Flow', () => {
    it('should complete full login flow and store auth data', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-jwt-token',
          parentId: 'parent-001',
          childrenIds: ['student-001', 'student-002'],
          expiresAt: Date.now() + 86400000
        })
      })

      render(
        <BrowserRouter>
          <ParentLoginPage />
        </BrowserRouter>
      )

      // Fill in credentials
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      // Wait for navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/parent/dashboard')
      })

      // Verify auth data was stored
      const auth = getAuthFromStorage()
      expect(auth).not.toBeNull()
      expect(auth?.token).toBe('test-jwt-token')
      expect(auth?.role).toBe('parent')
      expect(auth?.userId).toBe('parent-001')
    })

    it('should handle login failure gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid credentials'
        })
      })

      render(
        <BrowserRouter>
          <ParentLoginPage />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Verify auth data was NOT stored
      const auth = getAuthFromStorage()
      expect(auth).toBeNull()
    })

    it('should validate form before making API call', async () => {
      render(
        <BrowserRouter>
          <ParentLoginPage />
        </BrowserRouter>
      )

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })

      // Verify API was not called
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    it('should store token with correct expiration', async () => {
      const expiresAt = Date.now() + 86400000

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-jwt-token',
          parentId: 'parent-001',
          childrenIds: ['student-001'],
          expiresAt
        })
      })

      render(
        <BrowserRouter>
          <ParentLoginPage />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const auth = getAuthFromStorage()
        expect(auth?.expiresAt).toBe(expiresAt)
      })
    })

    it('should store parent role in auth data', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-jwt-token',
          parentId: 'parent-001',
          childrenIds: ['student-001'],
          expiresAt: Date.now() + 86400000
        })
      })

      render(
        <BrowserRouter>
          <ParentLoginPage />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const auth = getAuthFromStorage()
        expect(auth?.role).toBe('parent')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      render(
        <BrowserRouter>
          <ParentLoginPage />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument()
      })
    })

    it('should handle missing token in response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parentId: 'parent-001',
          childrenIds: ['student-001'],
          expiresAt: Date.now() + 86400000
          // Missing token
        })
      })

      render(
        <BrowserRouter>
          <ParentLoginPage />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/parent/dashboard')
      })

      // Verify auth was stored even with missing token
      const auth = getAuthFromStorage()
      expect(auth).not.toBeNull()
    })
  })
})
