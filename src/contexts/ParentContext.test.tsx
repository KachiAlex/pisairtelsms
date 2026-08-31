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
  const { selectedChild, setSelectedChild, children, setChildren } = useParentContext()
  return (
    <div>
      <div data-testid="selected-child">{selectedChild?.name || 'None'}</div>
      <div data-testid="children-count">{children.length}</div>
      <button
        onClick={() =>
          setSelectedChild({
            id: '1',
            name: 'John Doe',
            admissionNumber: 'ADM001',
            class: 'JSS1',
          })
        }
      >
        Select Child
      </button>
      <button
        onClick={() =>
          setChildren([
            {
              id: '1',
              name: 'John Doe',
              admissionNumber: 'ADM001',
              class: 'JSS1',
            },
            {
              id: '2',
              name: 'Jane Doe',
              admissionNumber: 'ADM002',
              class: 'JSS2',
            },
          ])
        }
      >
        Set Children
      </button>
    </div>
  )
}

describe('ParentContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should provide context with initial values', () => {
    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    expect(screen.getByTestId('selected-child')).toHaveTextContent('None')
    expect(screen.getByTestId('children-count')).toHaveTextContent('0')
  })

  it('should set selected child', async () => {
    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    const button = screen.getByText('Select Child')
    button.click()

    await waitFor(() => {
      expect(screen.getByTestId('selected-child')).toHaveTextContent('John Doe')
    })
  })

  it('should persist selected child to localStorage', async () => {
    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    const button = screen.getByText('Select Child')
    button.click()

    await waitFor(() => {
      const stored = localStorage.getItem('selectedChild')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.name).toBe('John Doe')
    })
  })

  it('should set children list', async () => {
    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    const button = screen.getByText('Set Children')
    button.click()

    await waitFor(() => {
      expect(screen.getByTestId('children-count')).toHaveTextContent('2')
    })
  })

  it('should auto-select first child when setting children', async () => {
    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    const button = screen.getByText('Set Children')
    button.click()

    await waitFor(() => {
      expect(screen.getByTestId('selected-child')).toHaveTextContent('John Doe')
    })
  })

  it('should throw error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useParentContext must be used within ParentContextProvider')

    consoleError.mockRestore()
  })

  it('should load selected child from localStorage on mount', () => {
    const child = {
      id: '1',
      name: 'John Doe',
      admissionNumber: 'ADM001',
      class: 'JSS1',
    }
    localStorage.setItem('selectedChild', JSON.stringify(child))

    render(
      <ParentContextProvider>
        <TestComponent />
      </ParentContextProvider>
    )

    expect(screen.getByTestId('selected-child')).toHaveTextContent('John Doe')
  })
})
