import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentNavigation } from './ParentNavigation'

describe('ParentNavigation', () => {
  const mockOnNavigate = vi.fn()

  it('should render all navigation items', () => {
    render(
      <ParentNavigation currentPage="dashboard" onNavigate={mockOnNavigate} />
    )

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

  it('should highlight active page', () => {
    const { rerender } = render(
      <ParentNavigation currentPage="dashboard" onNavigate={mockOnNavigate} />
    )

    const dashboardButton = screen.getByText('Dashboard').closest('button')
    expect(dashboardButton).toHaveClass('bg-blue-50', 'text-blue-700')

    rerender(
      <ParentNavigation currentPage="academic" onNavigate={mockOnNavigate} />
    )

    const academicButton = screen.getByText('Academic Progress').closest('button')
    expect(academicButton).toHaveClass('bg-blue-50', 'text-blue-700')
  })

  it('should call onNavigate when item is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ParentNavigation currentPage="dashboard" onNavigate={mockOnNavigate} />
    )

    const academicButton = screen.getByText('Academic Progress').closest('button')
    await user.click(academicButton!)

    expect(mockOnNavigate).toHaveBeenCalledWith('academic')
  })

  it('should render icons for each navigation item', () => {
    const { container } = render(
      <ParentNavigation currentPage="dashboard" onNavigate={mockOnNavigate} />
    )

    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('should have correct styling for inactive items', () => {
    render(
      <ParentNavigation currentPage="dashboard" onNavigate={mockOnNavigate} />
    )

    const academicButton = screen.getByText('Academic Progress').closest('button')
    expect(academicButton).toHaveClass('text-gray-600')
  })

  it('should handle multiple navigation clicks', async () => {
    const user = userEvent.setup()
    render(
      <ParentNavigation currentPage="dashboard" onNavigate={mockOnNavigate} />
    )

    await user.click(screen.getByText('Academic Progress').closest('button')!)
    await user.click(screen.getByText('Attendance').closest('button')!)
    await user.click(screen.getByText('Fees').closest('button')!)

    expect(mockOnNavigate).toHaveBeenCalledTimes(3)
    expect(mockOnNavigate).toHaveBeenNthCalledWith(1, 'academic')
    expect(mockOnNavigate).toHaveBeenNthCalledWith(2, 'attendance')
    expect(mockOnNavigate).toHaveBeenNthCalledWith(3, 'fees')
  })
})
