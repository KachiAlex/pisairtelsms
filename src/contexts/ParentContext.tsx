import React, { createContext, useContext, useState, useEffect } from 'react'

interface LinkedChild {
  id: string
  name: string
  admissionNumber: string
  class: string
  arm?: string
}

interface ParentContextType {
  selectedChild: LinkedChild | null
  linkedChildren: LinkedChild[]
  selectChild: (child: LinkedChild) => void
  isLoading: boolean
}

const ParentContext = createContext<ParentContextType | undefined>(undefined)

export function ParentContextProvider({ children }: { children: React.ReactNode }) {
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null)
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load children from localStorage on mount
  useEffect(() => {
    const loadChildren = async () => {
      try {
        // Get auth token to extract childrenIds
        const authStr = localStorage.getItem('auth')
        if (!authStr) {
          setIsLoading(false)
          return
        }

        const auth = JSON.parse(authStr)
        const childrenIds = auth.childrenIds || []

        // For now, use mock data - in production, fetch from API
        const mockChildren: LinkedChild[] = childrenIds.map((id: string, index: number) => ({
          id,
          name: `Child ${index + 1}`,
          admissionNumber: `ADM-${id.slice(0, 6).toUpperCase()}`,
          class: `Class ${index + 1}`,
          arm: 'A',
        }))

        setLinkedChildren(mockChildren)

        // Load selected child from localStorage or default to first
        const savedChildId = localStorage.getItem('selectedChildId')
        const childToSelect = mockChildren.find(c => c.id === savedChildId) || mockChildren[0]
        if (childToSelect) {
          setSelectedChild(childToSelect)
        }
      } catch (error) {
        console.error('Failed to load children:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChildren()
  }, [])

  const selectChild = (child: LinkedChild) => {
    setSelectedChild(child)
    localStorage.setItem('selectedChildId', child.id)
  }

  return (
    <ParentContext.Provider value={{ selectedChild, linkedChildren, selectChild, isLoading }}>
      {children}
    </ParentContext.Provider>
  )
}

export function useParentContext() {
  const context = useContext(ParentContext)
  if (!context) {
    throw new Error('useParentContext must be used within ParentContextProvider')
  }
  return context
}
