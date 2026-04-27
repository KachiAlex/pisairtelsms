import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AcademicProgress } from './AcademicProgress'
import { ParentContextProvider } from '../../../contexts/ParentContext'

const mockAcademicData = {
  subjects: [
    { subject: 'Mathematics', ca: 15, exam: 65, total: 80, grade: 'A', feedback: 'Excellent performance' },
    { subject: 'English', ca: 12, exam: 58, total: 70, grade: 'B', feedback: 'Good progress' },
  ],
  gpa: 3.8,
  classAverage: 3.5,
  upcomingAssessments: [
    { subject: 'Physics', date: '2024-04-15', type: 'Test' },
  ],
  terms: [
    { id: 'term-1', name: 'First Term' },
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

describe('AcademicProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAcademicData),
    }))
  })

  it('should render academic progress header', async () => {
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByText('Academic Progress')).toBeInTheDocument()
    })
  })

  it('should display GPA', async () => {
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByText(/3.8/)).toBeInTheDocument()
    })
  })

  it('should display subject performance table', async () => {
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
      expect(screen.getByText('English')).toBeInTheDocument()
    })
  })

  it('should render term selector', async () => {
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByText('Select Term')).toBeInTheDocument()
    })
  })

  it('should display upcoming assessments', async () => {
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByText('Physics')).toBeInTheDocument()
    })
  })

  it('should render download button', async () => {
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<AcademicProgress />)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
})
