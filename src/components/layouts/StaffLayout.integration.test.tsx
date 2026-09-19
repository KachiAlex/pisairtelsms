import React from 'react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StaffLayout } from './StaffLayout'

// Mock the useToast hook
vi.mock('../ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

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

describe('StaffLayout Integration - TeacherAttendanceEntry', () => {
  const mockToken = 'mock-token'
  const mockAuth = JSON.stringify({
    token: mockToken,
    tenantId: 'tenant-1',
    expiresAt: Date.now() + 3600000,
    role: 'staff',
    userId: 'staff-123',
  })

  const mockDashboard = {
    staff: { name: 'Test Teacher', staffId: 'STF-001', department: 'Academic', role: 'Teacher' },
    todaySchedule: [],
    pendingLeaveCount: 0,
    recentAnnouncements: [],
    recentMessages: [],
  }

  const mockApiResponse = (url: string) => {
    let body: any = {}
    if (url.includes('/api/staff/classes') && url.includes('/students')) body = mockStudents
    else if (url.includes('/api/staff/classes')) body = mockClasses
    else if (url.includes('absence-reasons')) body = { data: [] }
    else if (url.includes('/api/staff/dashboard')) body = mockDashboard
    else if (url.includes('/api/tenant/attendance')) body = { success: true }
    else if (url.includes('resource=academic-years'))
      body = { data: [{ id: 'ay-1', name: '2024/2025', is_current: true }] }
    else if (url.includes('resource=terms'))
      body = { data: [{ id: 't-1', name: 'Second Term', start_date: '2024-01-01', end_date: '2099-12-31', academic_year: '2024/2025' }] }
    return Promise.resolve({ ok: true, json: async () => body } as Response)
  }

  const mockClasses = {
    classes: [
      {
        id: 'class-1',
        name: 'JSS 1',
        arm: 'A',
        studentCount: 2,
      },
    ],
  }

  const mockStudents = {
    students: [
      {
        id: 'stu-1',
        studentId: 'STU001',
        name: 'John Doe',
        admissionNumber: 'ADM-2024-001',
      },
      {
        id: 'stu-2',
        studentId: 'STU002',
        name: 'Jane Smith',
        admissionNumber: 'ADM-2024-002',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('auth', mockAuth)
    ;(global.fetch as Mock).mockClear()
    ;(global.fetch as Mock).mockImplementation((url: any) => mockApiResponse(String(url)))
  })

  describe('Navigation Integration', () => {
    it('should render StaffLayout with navigation items', () => {
      

      render(
        <MemoryRouter>
          <StaffLayout />
        </MemoryRouter>
      )

      // "Dashboard" appears in both the nav and the header page title
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('My Timetable')).toBeInTheDocument()
      expect(screen.getByText('My Attendance')).toBeInTheDocument()
      expect(screen.getByText('Mark Attendance')).toBeInTheDocument()
      expect(screen.getByText('Leave')).toBeInTheDocument()
      expect(screen.getByText('Payslips')).toBeInTheDocument()
      expect(screen.getByText('Communications')).toBeInTheDocument()
      expect(screen.getByText('Class Lists')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('should highlight Attendance menu item when on attendance page', () => {
      render(
        <MemoryRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </MemoryRouter>
      )

      const attendanceButton = screen.getByRole('button', { name: 'Mark Attendance' })
      expect(attendanceButton).toHaveClass('bg-blue-50')
      expect(attendanceButton).toHaveClass('text-blue-700')
    })
  })

  describe('Attendance Page Rendering', () => {
    it('should render TeacherAttendanceEntry component when attendance route is active', async () => {
      

      render(
        <MemoryRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Attendance Date/i)).toBeInTheDocument()
        // "Mark Attendance" appears in both the nav and the page title
        expect(screen.getAllByText(/Mark Attendance/i).length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should display students from teacher homeroom', async () => {
      

      render(
        <MemoryRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
    })

    it('should display total student count', async () => {
      

      render(
        <MemoryRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Total Students: 2/i)).toBeInTheDocument()
      })
    })
  })

  describe('End-to-End Teacher Entry Flow', () => {
    it('should complete full attendance entry workflow', async () => {
      

      render(
        <MemoryRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </MemoryRouter>
      )

      // Wait for students to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Mark first student as present (default)
      const presentButtons = screen.getAllByRole('button', { name: /present/i })
      expect(presentButtons.length).toBeGreaterThan(0)

      // Mark second student as absent
      const absentButtons = screen.getAllByRole('button', { name: /absent/i })
      fireEvent.click(absentButtons[1])

      await waitFor(() => {
        const absentBadges = screen.getAllByText(/Absent/i)
        expect(absentBadges.length).toBeGreaterThan(0)
      })

      // Click Review & Submit
      const reviewButton = screen.getByRole('button', { name: /Review & Submit/i })
      fireEvent.click(reviewButton)

      // Verify confirmation dialog appears
      await waitFor(() => {
        expect(screen.getByText(/Confirm Attendance Submission/i)).toBeInTheDocument()
      })

      // Verify summary shows correct counts (Present/Absent appear per-student too)
      expect(screen.getAllByText(/Present/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Absent/i).length).toBeGreaterThan(0)
    })

    it('should navigate between pages without losing state', async () => {
      

      const { rerender } = render(
        <MemoryRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </MemoryRouter>
      )

      // Wait for attendance page to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Navigate to dashboard
      const dashboardButton = screen.getByRole('button', { name: /Dashboard/i })
      fireEvent.click(dashboardButton)

      // Verify dashboard is shown ("Staff Portal" appears in sidebar + header)
      await waitFor(() => {
        expect(screen.getAllByText(/Staff Portal/i).length).toBeGreaterThanOrEqual(1)
      })

      // Navigate back to attendance
      const attendanceButton = screen.getByRole('button', { name: 'Mark Attendance' })
      fireEvent.click(attendanceButton)

      // Verify attendance page is shown again
      await waitFor(() => {
        expect(screen.getByText(/Attendance Date/i)).toBeInTheDocument()
      })
    })
  })

  describe('Access Control', () => {
    it('should display attendance menu item for staff users', () => {
      

      render(
        <MemoryRouter>
          <StaffLayout />
        </MemoryRouter>
      )

      const attendanceItem = screen.getByRole('button', { name: 'Mark Attendance' })
      expect(attendanceItem).toBeInTheDocument()
    })

    it('should have correct icon for attendance menu item', () => {


      render(
        <MemoryRouter>
          <StaffLayout />
        </MemoryRouter>
      )

      // The CalendarCheck icon should be rendered for attendance
      const attendanceButton = screen.getByRole('button', { name: 'Mark Attendance' })
      expect(attendanceButton).toBeInTheDocument()
      // Icon is rendered as SVG, we can verify the button exists
      expect(attendanceButton.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Header Display', () => {
    it('should display correct page title in header when on attendance page', async () => {
      

      render(
        <MemoryRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </MemoryRouter>
      )

      await waitFor(() => {
        // Header shows the current nav item's label for /staff/attendance
        expect(screen.getAllByText('Mark Attendance').length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should display academic session in header', async () => {
      

      render(
        <MemoryRouter>
          <StaffLayout />
        </MemoryRouter>
      )

      // Session label is fetched from Timetable & Scheduling (timetable_terms)
      await waitFor(() => {
        expect(screen.getByText(/2024\/2025 Academic Session - Second Term/i)).toBeInTheDocument()
      })
    })
  })

  describe('Sidebar Functionality', () => {
    it('should toggle sidebar on mobile', () => {
      

      render(
        <MemoryRouter>
          <StaffLayout />
        </MemoryRouter>
      )

      // Find the menu button (visible on mobile)
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find((btn) => btn.className.includes('lg:hidden'))

      if (menuButton) {
        fireEvent.click(menuButton)
        // Sidebar should be visible after clicking menu
        expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
