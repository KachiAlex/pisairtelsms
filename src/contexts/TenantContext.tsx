import React, { createContext, useContext, useState, useEffect } from 'react'

interface TenantContextType {
  tenantId: string | null
  setTenantId: (id: string | null) => void
  tenantName: string | null
  setTenantName: (name: string | null) => void
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)

  // Load tenant info from localStorage or API on mount
  useEffect(() => {
    const savedTenantId = localStorage.getItem('tenantId')
    const savedTenantName = localStorage.getItem('tenantName')

    if (savedTenantId) {
      setTenantId(savedTenantId)
    }

    if (savedTenantName) {
      setTenantName(savedTenantName)
    }

    // For demo purposes, set a default tenant if none exists
    if (!savedTenantId) {
      const defaultTenantId = 'demo-tenant-001'
      const defaultTenantName = 'Demo School'

      setTenantId(defaultTenantId)
      setTenantName(defaultTenantName)

      localStorage.setItem('tenantId', defaultTenantId)
      localStorage.setItem('tenantName', defaultTenantName)
    }
  }, [])

  // Update localStorage when tenant info changes
  useEffect(() => {
    if (tenantId) {
      localStorage.setItem('tenantId', tenantId)
    } else {
      localStorage.removeItem('tenantId')
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantName) {
      localStorage.setItem('tenantName', tenantName)
    } else {
      localStorage.removeItem('tenantName')
    }
  }, [tenantName])

  const value = {
    tenantId,
    setTenantId,
    tenantName,
    setTenantName,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
