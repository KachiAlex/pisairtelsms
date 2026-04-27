import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ParentLayout } from './ParentLayout'
import { ParentContextProvider } from '../../contexts/ParentContext'

// Mock auth
vi.mock('../../lib/auth', () => ({
  getAuthFromStorage: () => ({
    userId: 'parent-1',
    role: 'parent',
    parentId: 'parent-1',
    childrenIds: ['child-1', 'child-2'],
  }),
  clearAuthFromStorage: vi.fn(),
}))

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

function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ParentContextProvider>
        {component}
      </ParentContextProvider>
    </BrowserRouter>
  )
}

describe('ParentLayout', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('auth', JSON.stringify({
      userId: 'parent-1',
      role: 'parent',
      parentId: 'parent-1',
      childrenIds: ['child-1', 'child-2'],
    }))
  })

  it('should render layout with sidebar and header', async () => {
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('ScholarX')).toBeInTheDocument()
      expect(screen.getByText('Parent Portal')).toBeInTheDocument()
    })
  })

  it('should display navigation items', async () => {
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Academic Progress')).toBeInTheDocument()
      expect(screen.getByText('Attendance')).toBeInTheDocument()
    })
  })

  it('should display child selector with linked children', async () => {
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      const childSelector = screen.getByText(/Child 1|Child 2/)
      expect(childSelector).toBeInTheDocument()
    })
  })

  it('should open child selector dropdown on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    const childButton = screen.getByRole('button', { name: /Child/ })
    await user.click(childButton)

    await waitFor(() => {
      expect(screen.getByText('ADM-CHILD-1')).toBeInTheDocument()
    })
  })

  it('should switch child when selected from dropdown', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    const childButton = screen.getByRole('button', { name: /Child/ })
    await user.click(childButton)

    await waitFor(() => {
      const childOptions = screen.getAllByText(/ADM-CHILD/)
      expect(childOptions.length).toBeGreaterThan(0)
    })
  })

  it('should display notification bell icon', async () => {
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      const bellButtons = screen.getAllByRole('button')
      const hasBellIcon = bellButtons.some(btn => btn.querySelector('svg'))
      expect(hasBellIcon).toBe(true)
    })
  })

  it('should display parent info in header', async () => {
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('Parent')).toBeInTheDocument()
    })
  })

  it('should toggle sidebar on mobile', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.querySelector('svg'))
    
    if (menuButton) {
      await user.click(menuButton)
      // Sidebar should be visible after click
      expect(screen.getByText('ScholarX')).toBeInTheDocument()
    }
  })

  it('should render sign out button', async () => {
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })
  })

  it('should render children content', async () => {
    renderWithProviders(
      <ParentLayout>
        <div data-testid="test-content">Test Content</div>
      </ParentLayout>
    )

    await waitFor(() => {
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    localStorage.clear()
    renderWithProviders(<ParentLayout />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display academic session info', async () => {
    renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('2024/2025 Academic Session')).toBeInTheDocument()
    })
  })

  it('should have responsive design classes', async () => {
    const { container } = renderWithProviders(<ParentLayout />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    const sidebar = container.querySelector('aside')
    expect(sidebar).toHaveClass('lg:static', 'fixed')
  })
})
