import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AnalyticsDashboard } from './AnalyticsDashboard'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: {} }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.setItem('auth', JSON.stringify({ token: 'mock-token' }))
  })

  it('renders the analytics header and filters', async () => {
    mockFetch()
    render(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Analytics & Reports')).toBeInTheDocument()
      expect(screen.getByText('Filters')).toBeInTheDocument()
      expect(screen.getByText('Comprehensive academic and operational insights')).toBeInTheDocument()
    })
  })

  it('fetches analytics endpoints on mount', async () => {
    const fetchMock = mockFetch()
    render(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(6)
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/tenant\/analytics\?metric=academic/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
      })
    )
  })

  it('shows loading state initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    localStorageMock.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    render(<AnalyticsDashboard />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })
})
