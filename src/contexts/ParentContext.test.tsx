import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ParentContextProvider, useParentContext } from './ParentContext'

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

function TestComponent() {
  const { selectedChild, linkedChildren, selectChild, isLoading } = useParentContext()
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="selected-child">{selectedChild?.name || 'none'}</div>
      <div data-testid="children-count">{linkedChildren.length}</div>
      {linkedChildren.map((child) => (
        <button
          key={child.id}
          data-testid={`child-${child.id}`}
          onClick={() => selectChild(child)}
        >
          {child.name}
        </button>
      ))}
    </div>
  )
}

describe('ParentContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should provide context with default values', async () => {
    localStorage.setItem('auth', JSON.stringify({
      userId: 'parent-1',
      role: 'parent',
      parentId: 'parent-1',
      childrenIds: ['child-1', 'child-2'],
    }))

    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('children-count')).toHaveTextContent('2')
  })

  it('should load children from auth token', async () => {
    localStorage.setItem('auth', JSON.stringify({
      userId: 'parent-1',
      role: 'parent',
      parentId: 'parent-1',
      childrenIds: ['child-1', 'child-2', 'child-3'],
    }))

    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('children-count')).toHaveTextContent('3')
    })
  })

  it('should select first child by default', async () => {
    localStorage.setItem('auth', JSON.stringify({
      userId: 'parent-1',
      role: 'parent',
      parentId: 'parent-1',
      childrenIds: ['child-1', 'child-2'],
    }))

    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('selected-child')).toHaveTextContent('Child 1')
    })
  })

  it('should restore selected child from localStorage', async () => {
    localStorage.setItem('auth', JSON.stringify({
      userId: 'parent-1',
      role: 'parent',
      parentId: 'parent-1',
      childrenIds: ['child-1', 'child-2'],
    }))
    localStorage.setItem('selectedChildId', 'child-2')

    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('selected-child')).toHaveTextContent('Child 2')
    })
  })

  it('should throw error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useParentContext must be used within ParentContextProvider')

    consoleError.mockRestore()
  })

  it('should handle missing auth token gracefully', async () => {
    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('children-count')).toHaveTextContent('0')
  })
})
