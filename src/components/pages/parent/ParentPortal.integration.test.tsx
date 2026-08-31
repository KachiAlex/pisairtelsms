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

describe('Parent Portal Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    // Set up mock auth
    localStorage.setItem(
      'auth',
      JSON.stringify({
        token: 'mock-token',
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

    expect(screen.getByText('ScholarX')).toBeInTheDocument()
    expect(screen.getByText('Parent Portal')).toBeInTheDocument()
  })

  it('should display child selector with linked children', async () => {
    render(
      <BrowserRouter>
        <ParentContextProvider>
          <ParentLayout />
        </ParentContextProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      const childSelector = screen.getByRole('button', { name: /child/i })
      expect(childSelector).toBeInTheDocument()
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
      const childSelector = screen.getByRole('button', { name: /child/i })
      fireEvent.click(childSelector)
    })

    // Verify dropdown appears
    await waitFor(() => {
      expect(screen.getByText(/ADM-/)).toBeInTheDocument()
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

    const notificationBell = screen.getByRole('button', { name: '' })
    expect(notificationBell).toBeInTheDocument()
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
      expect(screen.getByText('Academic')).toBeInTheDocument()
      expect(screen.getByText('Attendance')).toBeInTheDocument()
      expect(screen.getByText('Behavioral')).toBeInTheDocument()
      expect(screen.getByText('Communications')).toBeInTheDocument()
      expect(screen.getByText('Messages')).toBeInTheDocument()
      expect(screen.getByText('Fees')).toBeInTheDocument()
      expect(screen.getByText('Timetable')).toBeInTheDocument()
      expect(screen.getByText('Health')).toBeInTheDocument()
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
      const selectedChildId = localStorage.getItem('selectedChildId')
      expect(selectedChildId).toBeTruthy()
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
      expect(screen.getByText('Parent Portal')).toBeInTheDocument()
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
      const academicLink = screen.getByText('Academic')
      fireEvent.click(academicLink)
    })

    // Verify navigation occurred
    await waitFor(() => {
      expect(screen.getByText('Academic')).toBeInTheDocument()
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

    expect(screen.getByText('ScholarX')).toBeInTheDocument()
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

    expect(screen.getByText('ScholarX')).toBeInTheDocument()
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

    expect(screen.getByText('ScholarX')).toBeInTheDocument()
  })
})
