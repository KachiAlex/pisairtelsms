import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AcademicProgress } from './AcademicProgress'
import { ParentContextProvider } from '../../../contexts/ParentContext'

const mockAcademicData = {
  currentTerm: 'term-1',
  availableTerms: [
    { id: 'term-1', name: 'First Term' },
  ],
  subjects: [
    { id: 'sub-1', subject: 'Mathematics', caScore: 15, examScore: 65, totalScore: 80, grade: 'A', classAverage: 72, teacherFeedback: 'Excellent performance', trend: 'up' },
    { id: 'sub-2', subject: 'English', caScore: 12, examScore: 58, totalScore: 70, grade: 'B', classAverage: 68, teacherFeedback: 'Good progress', trend: 'stable' },
  ],
  overallGPA: 3.8,
  classAverage: 3.5,
  performanceTrend: [],
  upcomingAssessments: [
    { id: 'assess-1', subject: 'Physics', type: 'Test', date: '2024-04-15', weightage: 20 },
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
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'First Term' })).toBeInTheDocument()
    })
  })

  it('should display upcoming assessments', async () => {
    renderWithProviders(<AcademicProgress />)
    await waitFor(() => {
      expect(screen.getByText(/Physics/)).toBeInTheDocument()
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
