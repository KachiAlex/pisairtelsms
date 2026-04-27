import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { TeacherMessages } from './TeacherMessages'
import { ParentContextProvider } from '../../contexts/ParentContext'

const mockMessagesData = {
  conversations: [
    {
      id: 'conv-1',
      teacherId: 'teacher-1',
      teacherName: 'Mr. Smith',
      subject: 'Mathematics',
      lastMessage: 'Please review the homework.',
      lastMessageTime: '2024-04-01T10:00:00Z',
      unreadCount: 2,
      messages: [
        { id: 'm1', senderId: 'teacher-1', senderName: 'Mr. Smith', content: 'Please review the homework.', timestamp: '2024-04-01T10:00:00Z', isRead: false },
      ],
    },
    {
      id: 'conv-2',
      teacherId: 'teacher-2',
      teacherName: 'Mrs. Johnson',
      subject: 'English',
      lastMessage: 'Great progress!',
      lastMessageTime: '2024-04-02T09:00:00Z',
      unreadCount: 0,
      messages: [],
    },
  ],
  availableTeachers: [
    { id: 'teacher-1', name: 'Mr. Smith', subject: 'Mathematics' },
    { id: 'teacher-2', name: 'Mrs. Johnson', subject: 'English' },
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

describe('TeacherMessages', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({ token: 'mock-token' }))
    localStorage.setItem('selectedChild', JSON.stringify({ id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMessagesData),
    }))
  })

  it('should render messages header', async () => {
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByText('Teacher Messages')).toBeInTheDocument()
    })
  })

  it('should show unread count badge', async () => {
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByText(/2 unread/i)).toBeInTheDocument()
    })
  })

  it('should render conversation list', async () => {
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByText('Mr. Smith')).toBeInTheDocument()
      expect(screen.getByText('Mrs. Johnson')).toBeInTheDocument()
    })
  })

  it('should show message thread when conversation selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByText('Mr. Smith')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Mr. Smith'))
    await waitFor(() => {
      expect(screen.getByText('Please review the homework.')).toBeInTheDocument()
    })
  })

  it('should show new message button', async () => {
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new message/i })).toBeInTheDocument()
    })
  })

  it('should open new conversation modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new message/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /new message/i }))
    await waitFor(() => {
      expect(screen.getByText('Start New Conversation')).toBeInTheDocument()
    })
  })

  it('should show empty state when no conversations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ conversations: [], availableTeachers: [] }),
    }))
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByText(/no conversations/i)).toBeInTheDocument()
    })
  })

  it('should show error state on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  it('should show search input', async () => {
    renderWithProviders(<TeacherMessages />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search conversations/i)).toBeInTheDocument()
    })
  })
})
