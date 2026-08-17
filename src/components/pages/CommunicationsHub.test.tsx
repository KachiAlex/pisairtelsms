import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommunicationsHub } from './CommunicationsHub'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

function mockFetch(...responses: any[]) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: any) => {
    const match = responses.find((r) =>
      (r.url === undefined || r.url === url) &&
      (r.method === undefined || r.method === (init?.method || 'GET'))
    )
    return Promise.resolve({
      ok: match ? true : true,
      json: async () => ({ data: match ? match.data : [] }),
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('CommunicationsHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.setItem('auth', JSON.stringify({ token: 'mock-token' }))
  })

  it('renders the communication center header', async () => {
    const fetchMock = mockFetch()
    render(<CommunicationsHub />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.getByText('Communications Center')).toBeInTheDocument()
  })

  it('fetches communications, logs, and templates on mount', async () => {
    const fetchMock = mockFetch(
      { url: '/api/tenant/communications', data: [] },
      { url: '/api/tenant/communications/logs', data: [] },
      { url: '/api/tenant/communications/templates', data: [] }
    )
    render(<CommunicationsHub />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/tenant/communications', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }) }))
  })

  it('creates a new message when the form is submitted', { timeout: 15000 }, async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: any) => {
      if (init?.method === 'POST' && url === '/api/tenant/communications') {
        return Promise.resolve({ ok: true, json: async () => ({ data: {} }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<CommunicationsHub />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    fireEvent.change(screen.getByPlaceholderText('e.g. Mid-term break reminder'), { target: { value: 'Test Announcement' } })
    fireEvent.change(screen.getByPlaceholderText('Write your message here...'), { target: { value: 'This is a test message' } })

    const emailButton = screen.getByRole('button', { name: /email/i })
    await user.click(emailButton)

    const sendButton = screen.getByRole('button', { name: /send now/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tenant/communications',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test Announcement'),
        })
      )
    })
  })

  it('displays empty history state when no communications exist', async () => {
    const fetchMock = mockFetch(
      { url: '/api/tenant/communications', data: [] },
      { url: '/api/tenant/communications/logs', data: [] },
      { url: '/api/tenant/communications/templates', data: [] }
    )
    render(<CommunicationsHub />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const historyTab = screen.getByRole('tab', { name: /history/i })
    await userEvent.click(historyTab)

    await waitFor(() => {
      expect(screen.getByText('No communications yet.')).toBeInTheDocument()
    })
  })

  it('switches to delivery logs tab', async () => {
    const fetchMock = mockFetch(
      { url: '/api/tenant/communications', data: [] },
      { url: '/api/tenant/communications/logs', data: [] },
      { url: '/api/tenant/communications/templates', data: [] }
    )
    render(<CommunicationsHub />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const logsTab = screen.getByRole('tab', { name: /delivery logs/i })
    await userEvent.click(logsTab)

    expect(screen.getByRole('tabpanel')).toHaveTextContent(/delivery logs/i)
  })
})
