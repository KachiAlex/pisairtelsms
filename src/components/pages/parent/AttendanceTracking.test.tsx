import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AttendanceTracking } from './AttendanceTracking'
import { ParentContextProvider } from '../../../contexts/ParentContext'

const mockAttendanceData = {
  attendancePercent: 92,
  statistics: { present: 46, absent: 2, late: 2 },
  records: [
    { date: '2024-04-10', status: 'present', time: '08:00' },
    { date: '2024-04-09', status: 'present', time: '08:05' },
  ],
  trend: [
    { week: 'Week 1', percent: 95 },
    { week: 'Week 2', percent: 92 },
  ],
  absenceReasons: [
    { date: '2024-04-08', reason: 'Medical appointment', approved: true },
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

describe('AttendanceTracking', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttendanceData),
    }))
  })

  it('should render attendance tracking header', async () => {
    renderWithProviders(<AttendanceTracking />)
    await waitFor(() => {
      expect(screen.getByText('Attendance Tracking')).toBeInTheDocument()
    })
  })

  it('should display attendance percentage', async () => {
    renderWithProviders(<AttendanceTracking />)
    await waitFor(() => {
      expect(screen.getByText(/92%/)).toBeInTheDocument()
    })
  })

  it('should display statistics cards', async () => {
    renderWithProviders(<AttendanceTracking />)
    await waitFor(() => {
      expect(screen.getByText('Present')).toBeInTheDocument()
      expect(screen.getByText('Absent')).toBeInTheDocument()
      expect(screen.getByText('Late')).toBeInTheDocument()
    })
  })

  it('should display attendance records', async () => {
    renderWithProviders(<AttendanceTracking />)
    await waitFor(() => {
      expect(screen.getByText('2024-04-10')).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderWithProviders(<AttendanceTracking />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<AttendanceTracking />)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
})
