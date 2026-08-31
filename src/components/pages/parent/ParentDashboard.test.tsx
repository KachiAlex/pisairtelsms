import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ParentDashboard } from './ParentDashboard'
import { ParentContextProvider } from '../../contexts/ParentContext'

const mockDashboardData = {
  child: { id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001', class: 'JSS 1', arm: 'A' },
  metrics: { attendancePercent: 92, gpa: 3.8, outstandingFees: 5000, nextExamDate: 'May 15' },
  recentGrades: [
    { id: 'g1', subject: 'Mathematics', score: 85, date: '2024-04-01' },
    { id: 'g2', subject: 'English', score: 72, date: '2024-04-02' },
  ],
  recentAnnouncements: [
    { id: 'a1', title: 'School Closure', preview: 'School will be closed...', date: '2024-04-01' },
  ],
  upcomingEvents: [
    { id: 'e1', title: 'Sports Day', date: '2024-05-10' },
  ],
  alerts: [
    { id: 'al1', message: 'Low attendance warning', severity: 'warning', date: '2024-04-01' },
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

describe('ParentDashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token', userId: 'parent-1', role: 'parent' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDashboardData),
    }))
  })

  it('should show "select a child" message when no child selected', async () => {
    renderWithProviders(<ParentDashboard />)
    await waitFor(() => {
      expect(screen.getByText(/select a child/i)).toBeInTheDocument()
    })
  })

  it('should show loading state while fetching', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<ParentDashboard />)
    // Loading skeletons should be present initially
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    renderWithProviders(<ParentDashboard />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should render retry button on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    renderWithProviders(<ParentDashboard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('should retry fetch on button click', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    const user = userEvent.setup()
    renderWithProviders(<ParentDashboard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
