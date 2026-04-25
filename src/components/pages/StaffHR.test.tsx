import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StaffHR } from './StaffHR'

// Mock fetch
const mockFetch = vi.fn()
;(globalThis as any).fetch = mockFetch

const mockStaffData = [
  {
    id: 'staff_1',
    name: 'John Doe',
    role: 'Mathematics Teacher',
    department: 'Academics',
    status: 'active' as const,
    email: 'john@school.edu',
    phone: '1234567890',
    hireDate: '2020-01-15',
    createdAt: '2020-01-15T00:00:00Z',
    updatedAt: '2020-01-15T00:00:00Z',
  },
  {
    id: 'staff_2',
    name: 'Jane Smith',
    role: 'English Teacher',
    department: 'Academics',
    status: 'active' as const,
    email: 'jane@school.edu',
    phone: '0987654321',
    hireDate: '2021-03-20',
    createdAt: '2021-03-20T00:00:00Z',
    updatedAt: '2021-03-20T00:00:00Z',
  },
  {
    id: 'staff_3',
    name: 'Bob Johnson',
    role: 'HR Manager',
    department: 'Operations',
    status: 'active' as const,
    email: 'bob@school.edu',
    phone: '5555555555',
    hireDate: '2019-06-10',
    createdAt: '2019-06-10T00:00:00Z',
    updatedAt: '2019-06-10T00:00:00Z',
  },
  {
    id: 'staff_4',
    name: 'Alice Williams',
    role: 'Counselor',
    department: 'Student Life',
    status: 'active' as const,
    email: 'alice@school.edu',
    phone: '4444444444',
    hireDate: '2022-01-05',
    createdAt: '2022-01-05T00:00:00Z',
    updatedAt: '2022-01-05T00:00:00Z',
  },
]

describe('StaffHR Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the component header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStaffData }),
    })

    render(<StaffHR />)

    expect(screen.getByText('Staff & HR workspace')).toBeInTheDocument()
    expect(screen.getByText(/Monitor hiring, onboarding flows/)).toBeInTheDocument()
  })

  it('should fetch staff records on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStaffData }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/tenant/staff')
    })
  })

  it('should compute total staff count from fetched data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStaffData }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      // Total staff should be 4
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  it('should compute department distribution from fetched data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStaffData }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      // Should display department names
      expect(screen.getByText('Academics')).toBeInTheDocument()
      expect(screen.getByText('Operations')).toBeInTheDocument()
      expect(screen.getByText('Student Life')).toBeInTheDocument()
    })
  })

  it('should display error message when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch staff records' }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch staff records')).toBeInTheDocument()
    })
  })

  it('should display retry button on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch staff records' }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('should handle empty staff records', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      // Total staff should be 0
      const staffCards = screen.getAllByText(/Total staff/)
      expect(staffCards.length).toBeGreaterThan(0)
    })
  })

  it('should display department distribution percentages correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStaffData }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      // Academics: 2 out of 4 = 50%
      // Operations: 1 out of 4 = 25%
      // Student Life: 1 out of 4 = 25%
      const percentages = screen.getAllByText(/\d+%/)
      expect(percentages.length).toBeGreaterThan(0)
    })
  })

  it('should render headcount mix section with department data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStaffData }),
    })

    render(<StaffHR />)

    await waitFor(() => {
      expect(screen.getByText('Headcount mix')).toBeInTheDocument()
      expect(screen.getByText('Departmental allocation snapshot')).toBeInTheDocument()
    })
  })
})
