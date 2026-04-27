import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { HealthWellness } from './HealthWellness'
import { ParentContextProvider } from '../../contexts/ParentContext'

const mockHealthData = {
  medicalHistory: [
    { date: '2024-03-15', condition: 'Flu', treatment: 'Rest and fluids' },
  ],
  vaccinations: [
    { name: 'COVID-19', date: '2024-01-10', nextDue: '2024-07-10', status: 'completed' },
    { name: 'Polio', date: '2024-02-20', nextDue: '2024-08-20', status: 'pending' },
  ],
  allergies: [
    { allergen: 'Peanuts', severity: 'severe', reaction: 'Anaphylaxis' },
  ],
  emergencyContacts: [
    { name: 'Jane Doe', relationship: 'Mother', phone: '08012345678' },
  ],
  healthInitiatives: [
    { name: 'Sports Program', description: 'Weekly sports activities', date: '2024-04-01' },
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

describe('HealthWellness', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHealthData),
    }))
  })

  it('should render health header', async () => {
    renderWithProviders(<HealthWellness />)
    await waitFor(() => {
      expect(screen.getByText('Health & Wellness')).toBeInTheDocument()
    })
  })

  it('should render tabs for different sections', async () => {
    renderWithProviders(<HealthWellness />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /medical/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /vaccinations/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /allergies/i })).toBeInTheDocument()
    })
  })

  it('should display medical history', async () => {
    renderWithProviders(<HealthWellness />)
    await waitFor(() => {
      expect(screen.getByText('Flu')).toBeInTheDocument()
      expect(screen.getByText('Rest and fluids')).toBeInTheDocument()
    })
  })

  it('should switch to vaccinations tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HealthWellness />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vaccinations/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /vaccinations/i }))
    await waitFor(() => {
      expect(screen.getByText('COVID-19')).toBeInTheDocument()
    })
  })

  it('should switch to allergies tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HealthWellness />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /allergies/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /allergies/i }))
    await waitFor(() => {
      expect(screen.getByText('Peanuts')).toBeInTheDocument()
    })
  })

  it('should switch to contacts tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HealthWellness />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /contacts/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /contacts/i }))
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderWithProviders(<HealthWellness />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<HealthWellness />)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
})
