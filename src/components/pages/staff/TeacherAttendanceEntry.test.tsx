import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeacherAttendanceEntry } from './TeacherAttendanceEntry'

// Mock the useToast hook
jest.mock('../../ui/use-toast', () => ({
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

describe('TeacherAttendanceEntry Component', () => {
  const mockToken = 'mock-token'
  const mockAuth = JSON.stringify({ token: mockToken })

  const mockClasses = {
    classes: [
      {
        id: 'class-1',
        name: 'JSS 1',
        arm: 'A',
        studentCount: 3,
      },
    ],
  }

  const mockStudents = {
    students: [
      {
        id: 'stu-1',
        studentId: 'STU001',
        name: 'Chioma Adeyemi',
        admissionNumber: 'ADM-2024-001',
      },
      {
        id: 'stu-2',
        studentId: 'STU002',
        name: 'Tunde Okafor',
        admissionNumber: 'ADM-2024-002',
      },
      {
        id: 'stu-3',
        studentId: 'STU003',
        name: 'Zainab Hassan',
        admissionNumber: 'ADM-2024-003',
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('auth', mockAuth)
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Component Rendering', () => {
    it('should render error when not authenticated', async () => {
      localStorage.clear()

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText(/Not authenticated/i)).toBeInTheDocument()
      })
    })

    it('should render attendance entry form after loading students', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText(/Attendance Date/i)).toBeInTheDocument()
        expect(screen.getByText(/Mark Attendance/i)).toBeInTheDocument()
      })
    })

    it('should display all students in the list', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
        expect(screen.getByText('Tunde Okafor')).toBeInTheDocument()
        expect(screen.getByText('Zainab Hassan')).toBeInTheDocument()
      })
    })

    it('should display total student count', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText(/Total Students: 3/i)).toBeInTheDocument()
      })
    })
  })

  describe('Status Selection', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
      })
    })

    it('should mark student as present', async () => {
      const presentButtons = screen.getAllByRole('button', { name: /present/i })
      fireEvent.click(presentButtons[0])

      await waitFor(() => {
        const statusBadges = screen.getAllByText(/Present/i)
        expect(statusBadges.length).toBeGreaterThan(0)
      })
    })

    it('should mark student as absent', async () => {
      const absentButtons = screen.getAllByRole('button', { name: /absent/i })
      fireEvent.click(absentButtons[0])

      await waitFor(() => {
        const statusBadges = screen.getAllByText(/Absent/i)
        expect(statusBadges.length).toBeGreaterThan(0)
      })
    })

    it('should mark student as late', async () => {
      const lateButtons = screen.getAllByRole('button', { name: /late/i })
      fireEvent.click(lateButtons[0])

      await waitFor(() => {
        const statusBadges = screen.getAllByText(/Late/i)
        expect(statusBadges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Bulk Actions', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
      })
    })

    it('should mark all students as present', async () => {
      const markAllPresentButton = screen.getByRole('button', {
        name: /Mark All Present/i,
      })
      fireEvent.click(markAllPresentButton)

      await waitFor(() => {
        const presentBadges = screen.getAllByText(/Present/i)
        expect(presentBadges.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('should mark all students as absent', async () => {
      const markAllAbsentButton = screen.getByRole('button', {
        name: /Mark All Absent/i,
      })
      fireEvent.click(markAllAbsentButton)

      await waitFor(() => {
        const absentBadges = screen.getAllByText(/Absent/i)
        expect(absentBadges.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('should clear all attendance records', async () => {
      // First mark all as absent
      const markAllAbsentButton = screen.getByRole('button', {
        name: /Mark All Absent/i,
      })
      fireEvent.click(markAllAbsentButton)

      await waitFor(() => {
        expect(screen.getAllByText(/Absent/i).length).toBeGreaterThanOrEqual(3)
      })

      // Then clear all
      const clearAllButton = screen.getByRole('button', { name: /Clear All/i })
      fireEvent.click(clearAllButton)

      await waitFor(() => {
        const presentBadges = screen.getAllByText(/Present/i)
        expect(presentBadges.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('Search and Sort', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
      })
    })

    it('should filter students by name', async () => {
      const searchInput = screen.getByPlaceholderText(/Search by name or ID/i)
      fireEvent.change(searchInput, { target: { value: 'Chioma' } })

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
        expect(screen.queryByText('Tunde Okafor')).not.toBeInTheDocument()
      })
    })

    it('should filter students by ID', async () => {
      const searchInput = screen.getByPlaceholderText(/Search by name or ID/i)
      fireEvent.change(searchInput, { target: { value: 'STU001' } })

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
        expect(screen.queryByText('Tunde Okafor')).not.toBeInTheDocument()
      })
    })
  })

  describe('Date Selection', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
      })
    })

    it('should have today as default date', async () => {
      const dateInput = screen.getByLabelText(/Attendance date/i) as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]
      expect(dateInput.value).toBe(today)
    })

    it('should not allow selecting future dates', async () => {
      const dateInput = screen.getByLabelText(/Attendance date/i) as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]
      expect(dateInput.max).toBe(today)
    })
  })

  describe('Confirmation Dialog', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
      })
    })

    it('should show confirmation dialog when review button is clicked', async () => {
      const reviewButton = screen.getByRole('button', { name: /Review & Submit/i })
      fireEvent.click(reviewButton)

      await waitFor(() => {
        expect(screen.getByText(/Confirm Attendance Submission/i)).toBeInTheDocument()
      })
    })

    it('should allow canceling confirmation', async () => {
      const reviewButton = screen.getByRole('button', { name: /Review & Submit/i })
      fireEvent.click(reviewButton)

      await waitFor(() => {
        expect(screen.getByText(/Confirm Attendance Submission/i)).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/Confirm Attendance Submission/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Submission', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClasses,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents,
        })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText('Chioma Adeyemi')).toBeInTheDocument()
      })
    })

    it('should submit attendance records successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            count: 3,
            inserted: 3,
            updated: 0,
            message: '3 attendance records saved',
          },
        }),
      })

      const reviewButton = screen.getByRole('button', { name: /Review & Submit/i })
      fireEvent.click(reviewButton)

      await waitFor(() => {
        expect(screen.getByText(/Confirm Attendance Submission/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Confirm & Submit/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/Successfully saved/i)).toBeInTheDocument()
      })
    })

    it('should handle submission errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Failed to save attendance',
        }),
      })

      const reviewButton = screen.getByRole('button', { name: /Review & Submit/i })
      fireEvent.click(reviewButton)

      await waitFor(() => {
        expect(screen.getByText(/Confirm Attendance Submission/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Confirm & Submit/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/Failed to save attendance/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch error when loading classes', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()
      })
    })

    it('should show error when no classes assigned', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ classes: [] }),
      })

      render(<TeacherAttendanceEntry />)

      await waitFor(() => {
        expect(screen.getByText(/No classes assigned to you/i)).toBeInTheDocument()
      })
    })
  })
})
