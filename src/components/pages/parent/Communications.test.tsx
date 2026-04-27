import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Communications } from './Communications'
import { ParentContextProvider } from '../../contexts/ParentContext'

const mockAnnouncements = {
  announcements: [
    { id: 'a1', title: 'School Closure', content: 'School will be closed on Friday.', category: 'general', date: '2024-04-01', isRead: false },
    { id: 'a2', title: 'Exam Schedule', content: 'Exams start next week.', category: 'academic', date: '2024-04-02', isRead: true },
    { id: 'a3', title: 'Sports Day', content: 'Annual sports day is coming.', category: 'event', date: '2024-04-03', isRead: false },
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

describe('Communications', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnnouncements),
    }))
  })

  it('should render communications header', async () => {
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText('Communications')).toBeInTheDocument()
    })
  })

  it('should show unread count badge', async () => {
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText(/2 unread/i)).toBeInTheDocument()
    })
  })

  it('should render announcements list', async () => {
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText('School Closure')).toBeInTheDocument()
      expect(screen.getByText('Exam Schedule')).toBeInTheDocument()
    })
  })

  it('should filter announcements by category', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText('School Closure')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /academic/i }))
    await waitFor(() => {
      expect(screen.getByText('Exam Schedule')).toBeInTheDocument()
      expect(screen.queryByText('School Closure')).not.toBeInTheDocument()
    })
  })

  it('should filter announcements by search term', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText('School Closure')).toBeInTheDocument()
    })
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'Exam')
    await waitFor(() => {
      expect(screen.getByText('Exam Schedule')).toBeInTheDocument()
      expect(screen.queryByText('School Closure')).not.toBeInTheDocument()
    })
  })

  it('should open announcement detail on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText('School Closure')).toBeInTheDocument()
    })
    await user.click(screen.getByText('School Closure'))
    await waitFor(() => {
      expect(screen.getByText('School will be closed on Friday.')).toBeInTheDocument()
    })
  })

  it('should show empty state when no announcements', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ announcements: [] }),
    }))
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText(/no announcements found/i)).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderWithProviders(<Communications />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<Communications />)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
})
