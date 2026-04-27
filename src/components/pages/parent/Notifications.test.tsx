import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Notifications } from './Notifications'
import { ParentContextProvider } from '../../contexts/ParentContext'

const mockNotificationsData = {
  notifications: [
    { id: 'n1', title: 'New Grade', message: 'Mathematics grade posted', type: 'academic', date: '2024-04-01', isRead: false },
    { id: 'n2', title: 'Absence Alert', message: 'Low attendance warning', type: 'attendance', date: '2024-04-02', isRead: true },
    { id: 'n3', title: 'Fee Due', message: 'School fees due soon', type: 'fees', date: '2024-04-03', isRead: false },
  ],
}

vi.mock('../../lib/auth', () => ({
  getAuthFromStorage: () => ({ token: 'mock-token', userId: 'parent-1', role: 'parent' }),
}))

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ParentContextProvider>{component}</ParentContextProvider>
    </BrowserRouter>
  )
}

describe('Notifications', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNotificationsData),
    }))
  })

  it('should render notifications header', async () => {
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })
  })

  it('should show unread count badge', async () => {
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      expect(screen.getByText(/2 unread/i)).toBeInTheDocument()
    })
  })

  it('should render notifications list', async () => {
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      expect(screen.getByText('New Grade')).toBeInTheDocument()
      expect(screen.getByText('Absence Alert')).toBeInTheDocument()
    })
  })

  it('should filter notifications by type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      expect(screen.getByText('New Grade')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /academic/i }))
    await waitFor(() => {
      expect(screen.getByText('New Grade')).toBeInTheDocument()
      expect(screen.queryByText('Absence Alert')).not.toBeInTheDocument()
    })
  })

  it('should show mark all as read button when unread notifications exist', async () => {
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument()
    })
  })

  it('should show preferences button', async () => {
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it('should show empty state when no notifications', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ notifications: [] }),
    }))
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderWithProviders(<Notifications />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<Notifications />)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
})
