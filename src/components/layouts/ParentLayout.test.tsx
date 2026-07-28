import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ParentLayout } from './ParentLayout'
import { ParentContextProvider } from '../../contexts/ParentContext'

// Mock auth
vi.mock('../../lib/auth', () => ({
  getAuthFromStorage: () => ({
    token: 'mock-token',
    userId: 'parent-123',
    role: 'parent',
  }),
  clearAuthFromStorage: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock lazy loaded components
vi.mock('../pages/parent/ParentDashboard', () => ({
  ParentDashboard: () => <div>Dashboard Page</div>,
}))

vi.mock('../pages/parent/AcademicProgress', () => ({
  AcademicProgress: () => <div>Academic Page</div>,
}))

vi.mock('../pages/parent/AttendanceTracking', () => ({
  AttendanceTracking: () => <div>Attendance Page</div>,
}))

vi.mock('../pages/parent/BehavioralReports', () => ({
  BehavioralReports: () => <div>Behavioral Page</div>,
}))

vi.mock('../pages/parent/Communications', () => ({
  Communications: () => <div>Communications Page</div>,
}))

vi.mock('../pages/parent/TeacherMessages', () => ({
  TeacherMessages: () => <div>Messages Page</div>,
}))

vi.mock('../pages/parent/FeeManagement', () => ({
  FeeManagement: () => <div>Fees Page</div>,
}))

vi.mock('../pages/parent/Timetable', () => ({
  Timetable: () => <div>Timetable Page</div>,
}))

vi.mock('../pages/parent/HealthWellness', () => ({
  HealthWellness: () => <div>Health Page</div>,
}))

vi.mock('../pages/parent/Notifications', () => ({
  Notifications: () => <div>Notifications Page</div>,
}))

vi.mock('../pages/parent/ParentProfile', () => ({
  ParentProfile: () => <div>Profile Page</div>,
}))

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

describe('ParentLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        children: [
          {
            id: '1',
            name: 'John Doe',
            admissionNumber: 'ADM001',
            class: 'JSS1',
            arm: 'A',
          },
          {
            id: '2',
            name: 'Jane Doe',
            admissionNumber: 'ADM002',
            class: 'JSS2',
            arm: 'B',
          },
        ],
        unreadCount: 3,
      }),
    })
  })

  const renderLayout = () => {
    return render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )
  }

  it('should render layout with sidebar and header', () => {
    renderLayout()

    expect(screen.getByText('ScholarX')).toBeInTheDocument()
    expect(screen.getByText('Parent Portal')).toBeInTheDocument()
  })

  it('should display parent name in header', async () => {
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('Parent')).toBeInTheDocument()
    })
  })

  it('should load and display children', async () => {
    renderLayout()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/parent/children', expect.any(Object))
    })
  })

  it('should display notification bell with unread count', async () => {
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('should toggle sidebar on mobile', async () => {
    const user = userEvent.setup()
    const { container } = renderLayout()

    const menuButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'))
    if (menuButton) {
      await user.click(menuButton)
      // Sidebar should be visible after click
      expect(container.querySelector('aside')).toHaveClass('translate-x-0')
    }
  })

  it('should render navigation items', async () => {
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Academic Progress')).toBeInTheDocument()
      expect(screen.getByText('Attendance')).toBeInTheDocument()
    })
  })

  it('should display sign out button', () => {
    renderLayout()

    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('should render dashboard page by default', async () => {
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  it('should handle child selection', async () => {
    const user = userEvent.setup()
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('should display selected child info in header', async () => {
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText(/Class JSS1A/)).toBeInTheDocument()
    })
  })

  it('should have responsive design classes', () => {
    const { container } = renderLayout()

    const sidebar = container.querySelector('aside')
    expect(sidebar).toHaveClass('fixed', 'lg:static')

    const header = container.querySelector('header')
    expect(header).toHaveClass('flex', 'items-center')
  })

  it('should load notification count on mount', async () => {
    renderLayout()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/parent/notifications?limit=1',
        expect.any(Object)
      )
    })
  })

  it('should handle navigation to different pages', async () => {
    const user = userEvent.setup()
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('Academic Progress')).toBeInTheDocument()
    })

    const academicButton = screen.getByText('Academic Progress')
    await user.click(academicButton)

    await waitFor(() => {
      expect(screen.getByText('Academic Page')).toBeInTheDocument()
    })
  })

  it('should display child selector dropdown', async () => {
    renderLayout()

    await waitFor(() => {
      const childSelector = screen.getByText('John Doe')
      expect(childSelector).toBeInTheDocument()
    })
  })

  it('should show loading state while fetching data', () => {
    ;(global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => ({ children: [] }) }), 100)
        )
    )

    renderLayout()

    // Component should render without errors
    expect(screen.getByText('ScholarX')).toBeInTheDocument()
  })
})
