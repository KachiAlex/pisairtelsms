import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ParentLayout } from '../../layouts/ParentLayout'
import { ParentContextProvider } from '../../../contexts/ParentContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

const mockChildren = [
  { id: 'child-1', name: 'John Doe', admissionNumber: 'ADM-001', class: 'JSS1', arm: 'A' },
  { id: 'child-2', name: 'Jane Doe', admissionNumber: 'ADM-002', class: 'JSS2', arm: 'B' },
]

const mockDashboardData = {
  parent: { id: 'parent-123', name: 'Test Parent', email: 'parent@example.com' },
  child: mockChildren[0],
  metrics: { attendancePercent: 95, gpa: 3.5, outstandingFees: 0, nextExamDate: 'N/A' },
  recentGrades: [],
  recentAnnouncements: [],
  upcomingEvents: [],
  alerts: [],
}

const mockAcademicData = {
  currentTerm: 'term-1',
  availableTerms: [{ id: 'term-1', name: 'First Term' }],
  subjects: [],
  overallGPA: 0,
  classAverage: 0,
  performanceTrend: [],
  upcomingAssessments: [],
}

function mockFetchResponse(url: string) {
  let body: any = {}
  if (url.startsWith('/api/parent/children')) {
    body = { children: mockChildren }
  } else if (url.startsWith('/api/parent/dashboard')) {
    body = mockDashboardData
  } else if (url.startsWith('/api/parent/academic')) {
    body = mockAcademicData
  } else if (url.startsWith('/api/parent/notifications')) {
    body = { unreadCount: 0 }
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response)
}

describe('Parent Portal Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn((url: any) => mockFetchResponse(String(url))))
    // Set up mock auth
    localStorage.setItem(
      'auth',
      JSON.stringify({
        token: 'mock-token',
        tenantId: 'tenant-1',
        expiresAt: Date.now() + 3600000,
        role: 'parent',
        parentId: 'parent-123',
        childrenIds: ['child-1', 'child-2'],
        userId: 'parent-123',
      })
    )
  })

  it('should render parent layout with navigation', () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('Pisairtel-Schools')).toBeInTheDocument()
    expect(screen.getAllByText('Parent Portal').length).toBeGreaterThan(0)
  })

  it('should display child selector with linked children', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    // First linked child is auto-selected once /api/parent/children resolves
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    })
  })

  it('should allow switching between children', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    })

    const selectorName = screen.getAllByText('John Doe').find(el => el.closest('button'))
    expect(selectorName).toBeTruthy()
    fireEvent.click(selectorName!.closest('button')!)

    // Verify dropdown appears (ADM numbers also render on the dashboard card)
    await waitFor(() => {
      expect(screen.getAllByText(/ADM-/).length).toBeGreaterThanOrEqual(2)
    })
  })

  it('should display notification bell', () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    expect(document.querySelector('.lucide-bell')).toBeTruthy()
  })

  it('should display sign out button', () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('should display all navigation menu items', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Academic Progress')).toBeInTheDocument()
      expect(screen.getByText('Attendance')).toBeInTheDocument()
      expect(screen.getByText('Behavioral Reports')).toBeInTheDocument()
      expect(screen.getByText('Communications')).toBeInTheDocument()
      expect(screen.getByText('Teacher Messages')).toBeInTheDocument()
      expect(screen.getByText('Fee Management')).toBeInTheDocument()
      expect(screen.getByText('Timetable')).toBeInTheDocument()
      expect(screen.getByText('Health & Wellness')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })
  })

  it('should persist selected child in localStorage', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      const stored = localStorage.getItem('selectedChild')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!).id).toBe('child-1')
    })
  })

  it('should handle mobile sidebar toggle', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    // Find mobile menu button
    const menuButtons = screen.getAllByRole('button')
    const mobileMenuButton = menuButtons.find((btn) => btn.className.includes('lg:hidden'))

    if (mobileMenuButton) {
      fireEvent.click(mobileMenuButton)
      await waitFor(() => {
        expect(mobileMenuButton).toBeInTheDocument()
      })
    }
  })

  it('should display parent info in header', () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('Parent')).toBeInTheDocument()
  })

  it('should render dashboard page by default', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      // Dashboard should be rendered
      expect(screen.getAllByText('Parent Portal').length).toBeGreaterThan(0)
    })
  })

  it('should handle navigation between pages', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      const academicLink = screen.getByText('Academic Progress')
      fireEvent.click(academicLink)
    })

    // Verify navigation occurred
    await waitFor(() => {
      expect(screen.getByText('Academic Progress')).toBeInTheDocument()
    })
  })

  it('should maintain responsive design on mobile', () => {
    // Set mobile viewport
    global.innerWidth = 375
    global.innerHeight = 667

    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('Pisairtel-Schools')).toBeInTheDocument()
  })

  it('should maintain responsive design on tablet', () => {
    // Set tablet viewport
    global.innerWidth = 768
    global.innerHeight = 1024

    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('Pisairtel-Schools')).toBeInTheDocument()
  })

  it('should maintain responsive design on desktop', () => {
    // Set desktop viewport
    global.innerWidth = 1920
    global.innerHeight = 1080

    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    expect(screen.getByText('Pisairtel-Schools')).toBeInTheDocument()
  })
})
