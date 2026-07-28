import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ParentLoginPage } from './ParentLoginPage'

// Mock the fetch API
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

// Mock auth storage
vi.mock('../../lib/auth', () => ({
  setAuthInStorage: vi.fn()
}))

describe('ParentLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ParentLoginPage />
      </BrowserRouter>
    )
  }

  describe('Form Rendering', () => {
    it('should render login form with email and password fields', () => {
      renderComponent()

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render forgot password link', () => {
      renderComponent()

      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
    })

    it('should render demo credentials section', () => {
      renderComponent()

      expect(screen.getByText(/demo credentials/i)).toBeInTheDocument()
      expect(screen.getByText(/parent@example.com/)).toBeInTheDocument()
      expect(screen.getByText(/password123/)).toBeInTheDocument()
    })

    it('should render page title and description', () => {
      renderComponent()

      expect(screen.getByText(/parent portal/i)).toBeInTheDocument()
      expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when email is empty', async () => {
      renderComponent()

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should show error for invalid email format', async () => {
      renderComponent()

      const emailInput = screen.getByLabelText(/email address/i)
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should show error when password is empty', async () => {
      renderComponent()

      const emailInput = screen.getByLabelText(/email address/i)
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should show error for password less than 6 characters', async () => {
      renderComponent()

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: '12345' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Login Functionality', () => {
    it('should call login API with correct credentials', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token',
          parentId: 'parent-001',
          childrenIds: ['student-001'],
          expiresAt: Date.now() + 86400000
        })
      })

      renderComponent()

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/parent/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'parent@example.com',
            password: 'password123'
          })
        })
      })
    })

    it('should show loading state during login', async () => {
      ;(global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            token: 'test-token',
            parentId: 'parent-001',
            childrenIds: ['student-001'],
            expiresAt: Date.now() + 86400000
          })
        }), 100))
      )

      renderComponent()

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      })
    })

    it('should show error message on login failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid email or password'
        })
      })

      renderComponent()

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
    })

    it('should navigate to dashboard on successful login', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token',
          parentId: 'parent-001',
          childrenIds: ['student-001'],
          expiresAt: Date.now() + 86400000
        })
      })

      renderComponent()

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/parent/dashboard')
      })
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      renderComponent()

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      expect(passwordInput.type).toBe('password')

      const toggleButton = screen.getByRole('button', { name: /👁️/ })
      fireEvent.click(toggleButton)

      expect(passwordInput.type).toBe('text')

      fireEvent.click(toggleButton)
      expect(passwordInput.type).toBe('password')
    })
  })

  describe('Forgot Password', () => {
    it('should navigate to forgot password page when link is clicked', () => {
      renderComponent()

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i })
      fireEvent.click(forgotPasswordButton)

      expect(mockNavigate).toHaveBeenCalledWith('/parent/forgot-password')
    })
  })

  describe('Responsive Design', () => {
    it('should render responsive layout', () => {
      const { container } = renderComponent()

      // Check for responsive classes
      const mainDiv = container.querySelector('.min-h-screen')
      expect(mainDiv).toHaveClass('bg-gradient-to-br')
      expect(mainDiv).toHaveClass('from-blue-50')
      expect(mainDiv).toHaveClass('to-indigo-100')
    })
  })
})
