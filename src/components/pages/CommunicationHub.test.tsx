import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommunicationHub } from './CommunicationHub'

// Mock fetch
;(global as any).fetch = vi.fn()

describe('CommunicationHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and displays announcements on mount', async () => {
    const mockAnnouncements = [
      {
        id: 'ann_1',
        title: 'Test Announcement',
        body: 'Test body',
        audience: 'all' as const,
        sentBy: 'Admin',
        sentAt: '2024-02-21T10:00:00Z',
        status: 'sent' as const,
        createdAt: '2024-02-21T10:00:00Z',
      },
    ]

    ;(global as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockAnnouncements }),
    })

    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('Test Announcement')).toBeInTheDocument()
    })
  })

  it('displays loading state while fetching announcements', () => {
    ;(global as any).fetch = vi.fn().mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ data: [] }),
              }),
            100
          )
        )
    )

    render(<CommunicationHub />)

    expect(screen.getByText('Loading announcements...')).toBeInTheDocument()
  })

  it('displays empty state when no announcements exist', async () => {
    ;(global as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })

    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('No announcements yet')).toBeInTheDocument()
    })
  })

  it('handles fetch error gracefully', async () => {
    ;(global as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch' }),
    })

    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch announcements')).toBeInTheDocument()
    })
  })

  it('sends new announcement and adds it optimistically', async () => {
    const mockAnnouncements = [
      {
        id: 'ann_1',
        title: 'Existing Announcement',
        body: 'Existing body',
        audience: 'all' as const,
        sentBy: 'Admin',
        sentAt: '2024-02-21T10:00:00Z',
        status: 'sent' as const,
        createdAt: '2024-02-21T10:00:00Z',
      },
    ]

    const newAnnouncement = {
      id: 'ann_2',
      title: 'New Test Announcement',
      body: 'New test body',
      audience: 'senior' as const,
      sentBy: 'Admin',
      sentAt: '2024-02-21T11:00:00Z',
      status: 'sent' as const,
      createdAt: '2024-02-21T11:00:00Z',
    }

    ;(global as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnnouncements }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newAnnouncement }),
      })

    const user = userEvent.setup()
    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('Existing Announcement')).toBeInTheDocument()
    })

    // Update form fields
    const subjectInput = screen.getByDisplayValue('SS 3 mock exam briefing')
    await user.clear(subjectInput)
    await user.type(subjectInput, 'New Test Announcement')

    const messageTextarea = screen.getByDisplayValue(/Dear guardians/)
    await user.clear(messageTextarea)
    await user.type(messageTextarea, 'New test body')

    // Send broadcast
    const sendButton = screen.getByRole('button', { name: /Send broadcast/ })
    await user.click(sendButton)

    // Verify optimistic update
    await waitFor(() => {
      expect(screen.getByText('New Test Announcement')).toBeInTheDocument()
    })

    // Verify API was called
    expect((global as any).fetch).toHaveBeenCalledWith('/api/tenant/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('New Test Announcement'),
    })
  })

  it('removes optimistic announcement on error', async () => {
    const mockAnnouncements = [
      {
        id: 'ann_1',
        title: 'Existing Announcement',
        body: 'Existing body',
        audience: 'all' as const,
        sentBy: 'Admin',
        sentAt: '2024-02-21T10:00:00Z',
        status: 'sent' as const,
        createdAt: '2024-02-21T10:00:00Z',
      },
    ]

    ;(global as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnnouncements }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to send' }),
      })

    const user = userEvent.setup()
    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('Existing Announcement')).toBeInTheDocument()
    })

    // Update form fields
    const subjectInput = screen.getByDisplayValue('SS 3 mock exam briefing')
    await user.clear(subjectInput)
    await user.type(subjectInput, 'Failed Announcement')

    const messageTextarea = screen.getByDisplayValue(/Dear guardians/)
    await user.clear(messageTextarea)
    await user.type(messageTextarea, 'Failed body')

    // Send broadcast
    const sendButton = screen.getByRole('button', { name: /Send broadcast/ })
    await user.click(sendButton)

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Failed to send announcement')).toBeInTheDocument()
    })

    // Verify optimistic announcement was removed
    expect(screen.queryByText('Failed Announcement')).not.toBeInTheDocument()
  })

  it('validates required fields before sending', async () => {
    ;(global as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })

    const user = userEvent.setup()
    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('No announcements yet')).toBeInTheDocument()
    })

    // Clear subject
    const subjectInput = screen.getByDisplayValue('SS 3 mock exam briefing')
    await user.clear(subjectInput)

    // Try to send
    const sendButton = screen.getByRole('button', { name: /Send broadcast/ })
    await user.click(sendButton)

    // Verify error message
    expect(screen.getByText('Subject and message body are required')).toBeInTheDocument()

    // Verify API was not called
    expect((global as any).fetch).toHaveBeenCalledTimes(1) // Only initial fetch
  })

  it('displays announcement details correctly in the table', async () => {
    const mockAnnouncements = [
      {
        id: 'ann_123',
        title: 'Important Notice',
        body: 'Please read carefully',
        audience: 'students' as const,
        sentBy: 'Principal',
        sentAt: '2024-02-21T14:30:00Z',
        status: 'sent' as const,
        createdAt: '2024-02-21T14:30:00Z',
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockAnnouncements }),
    })

    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('ann_123')).toBeInTheDocument()
      expect(screen.getByText('Important Notice')).toBeInTheDocument()
      expect(screen.getByText('students')).toBeInTheDocument()
      expect(screen.getByText('Principal')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('displays draft status for draft announcements', async () => {
    const mockAnnouncements = [
      {
        id: 'ann_draft',
        title: 'Draft Announcement',
        body: 'Not sent yet',
        audience: 'all' as const,
        sentBy: 'Admin',
        sentAt: null,
        status: 'draft' as const,
        createdAt: '2024-02-21T14:30:00Z',
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockAnnouncements }),
    })

    render(<CommunicationHub />)

    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Not sent')).toBeInTheDocument()
    })
  })
})
