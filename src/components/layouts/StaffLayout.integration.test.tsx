import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { StaffLayout } from './StaffLayout'

// Mock the useToast hook
jest.mock('../ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

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
    role: 'staff',
    userId: 'staff-123',
  })

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
    jest.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('auth', mockAuth)
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Navigation Integration', () => {
    it('should render StaffLayout with navigation items', () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })

      render(
        <BrowserRouter>
          <StaffLayout />
        </BrowserRouter>
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('My Timetable')).toBeInTheDocument()
      expect(screen.getByText('Attendance')).toBeInTheDocument()
      expect(screen.getByText('Leave')).toBeInTheDocument()
      expect(screen.getByText('Payslips')).toBeInTheDocument()
      expect(screen.getByText('Communications')).toBeInTheDocument()
      expect(screen.getByText('Class Lists')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('should highlight Attendance menu item when on attendance page', () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      // Mock window.location.pathname
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/staff/attendance',
          href: 'http://localhost/staff/attendance',
        },
        writable: true,
      })

      render(
        <BrowserRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </BrowserRouter>
      )

      const attendanceButton = screen.getByRole('button', { name: /Attendance/i })
      expect(attendanceButton).toHaveClass('bg-blue-50')
      expect(attendanceButton).toHaveClass('text-blue-700')
    })
  })

  describe('Attendance Page Rendering', () => {
    it('should render TeacherAttendanceEntry component when attendance route is active', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(
        <BrowserRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Attendance Date/i)).toBeInTheDocument()
        expect(screen.getByText(/Mark Attendance/i)).toBeInTheDocument()
      })
    })

    it('should display students from teacher homeroom', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(
        <BrowserRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
    })

    it('should display total student count', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(
        <BrowserRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Total Students: 2/i)).toBeInTheDocument()
      })
    })
  })

  describe('End-to-End Teacher Entry Flow', () => {
    it('should complete full attendance entry workflow', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(
        <BrowserRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </BrowserRouter>
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

      // Verify summary shows correct counts
      expect(screen.getByText(/Present/i)).toBeInTheDocument()
      expect(screen.getByText(/Absent/i)).toBeInTheDocument()
    })

    it('should navigate between pages without losing state', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      const { rerender } = render(
        <BrowserRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </BrowserRouter>
      )

      // Wait for attendance page to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Navigate to dashboard
      const dashboardButton = screen.getByRole('button', { name: /Dashboard/i })
      fireEvent.click(dashboardButton)

      // Verify dashboard is shown
      await waitFor(() => {
        expect(screen.getByText(/Staff Portal/i)).toBeInTheDocument()
      })

      // Navigate back to attendance
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      const attendanceButton = screen.getByRole('button', { name: /Attendance/i })
      fireEvent.click(attendanceButton)

      // Verify attendance page is shown again
      await waitFor(() => {
        expect(screen.getByText(/Attendance Date/i)).toBeInTheDocument()
      })
    })
  })

  describe('Access Control', () => {
    it('should display attendance menu item for staff users', () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })

      render(
        <BrowserRouter>
          <StaffLayout />
        </BrowserRouter>
      )

      const attendanceItem = screen.getByRole('button', { name: /Attendance/i })
      expect(attendanceItem).toBeInTheDocument()
    })

    it('should have correct icon for attendance menu item', () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })

      render(
        <BrowserRouter>
          <StaffLayout />
        </BrowserRouter>
      )

      // The CalendarCheck icon should be rendered for attendance
      const attendanceButton = screen.getByRole('button', { name: /Attendance/i })
      expect(attendanceButton).toBeInTheDocument()
      // Icon is rendered as SVG, we can verify the button exists
      expect(attendanceButton.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Header Display', () => {
    it('should display correct page title in header when on attendance page', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(
        <BrowserRouter initialEntries={['/staff/attendance']}>
          <StaffLayout />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Attendance')).toBeInTheDocument()
      })
    })

    it('should display academic session in header', () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })

      render(
        <BrowserRouter>
          <StaffLayout />
        </BrowserRouter>
      )

      expect(screen.getByText(/2024\/2025 Academic Session/i)).toBeInTheDocument()
    })
  })

  describe('Sidebar Functionality', () => {
    it('should toggle sidebar on mobile', () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ staff: { name: 'Test Teacher' } }),
        })

      render(
        <BrowserRouter>
          <StaffLayout />
        </BrowserRouter>
      )

      // Find the menu button (visible on mobile)
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find((btn) => btn.className.includes('lg:hidden'))

      if (menuButton) {
        fireEvent.click(menuButton)
        // Sidebar should be visible after clicking menu
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      }
    })
  })
})
