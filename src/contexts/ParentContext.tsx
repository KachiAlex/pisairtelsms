import React, { createContext, useContext, useState, useEffect } from 'react'

interface Child {
  id: string
  name: string
  admissionNumber: string
  class: string
  arm?: string
}

interface ParentContextType {
  selectedChild: Child | null
  setSelectedChild: (child: Child) => void
  children: Child[]
  setChildren: (children: Child[]) => void
}

const ParentContext = createContext<ParentContextType | undefined>(undefined)

export function ParentContextProvider({ children: childrenProp }: { children: React.ReactNode }) {
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null)
  const [children, setChildrenState] = useState<Child[]>([])

  // Load selected child from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedChild')
    if (stored) {
      try {
        setSelectedChildState(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse stored child:', e)
      }
    }
  }, [])

  // Persist selected child to localStorage
  const setSelectedChild = (child: Child) => {
    setSelectedChildState(child)
    localStorage.setItem('selectedChild', JSON.stringify(child))
  }

  // Persist children list
  const setChildren = (newChildren: Child[]) => {
    setChildrenState(newChildren)
    // If no child is selected and we have children, select the first one
    if (!selectedChild && newChildren.length > 0) {
      setSelectedChild(newChildren[0])
    }
  }

  return (
    <ParentContext.Provider value={{ selectedChild, setSelectedChild, children, setChildren }}>
      {childrenProp}
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
