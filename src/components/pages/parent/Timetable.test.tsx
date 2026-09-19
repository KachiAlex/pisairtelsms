import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Timetable } from './Timetable'
import { ParentContextProvider } from '../../../contexts/ParentContext'

const mockTimetableData = {
  schedule: [
    { id: 's1', dayOfWeek: 1, timeSlot: '08:00', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101', startTime: '08:00', endTime: '08:45' },
    { id: 's2', dayOfWeek: 2, timeSlot: '09:00', subject: 'English', teacher: 'Mrs. Johnson', room: '102', startTime: '09:00', endTime: '09:45' },
  ],
  examSchedule: [
    { id: 'e1', subject: 'Mathematics', date: '2024-05-15', time: '09:00', duration: 120, room: 'Hall A', invigilator: '' },
  ],
  holidays: [
    { date: '2024-05-01', name: 'Workers Day' },
  ],
  currentTermId: 'term-1',
  availableTerms: [
    { id: 'term-1', name: 'First Term', startDate: '2024-01-08', endDate: '2024-04-05' },
    { id: 'term-2', name: 'Second Term', startDate: '2024-04-22', endDate: '2024-07-19' },
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

describe('Timetable', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTimetableData),
    }))
  })

  it('should render timetable header', async () => {
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByText('Timetable')).toBeInTheDocument()
    })
  })

  it('should render weekly schedule by default', async () => {
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByText('Monday')).toBeInTheDocument()
      expect(screen.getByText('Friday')).toBeInTheDocument()
    })
  })

  it('should display class schedule entries', async () => {
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
      expect(screen.getByText('Mr. Smith')).toBeInTheDocument()
    })
  })

  it('should switch to exam schedule view', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /exam/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /exam/i }))
    await waitFor(() => {
      expect(screen.getByText(/Hall A/)).toBeInTheDocument()
    })
  })

  it('should switch to holidays view', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /holidays/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /holidays/i }))
    await waitFor(() => {
      expect(screen.getByText('Workers Day')).toBeInTheDocument()
    })
  })

  it('should render term selector', async () => {
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByText('Select Term')).toBeInTheDocument()
    })
  })

  it('should render download button', async () => {
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderWithProviders(<Timetable />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<Timetable />)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
})
