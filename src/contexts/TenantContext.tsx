import React, { createContext, useContext, useState, useEffect } from 'react'
import { getAuthFromStorage, isTokenExpired } from '../lib/auth'

interface TenantContextType {
  tenantId: string | null
  setTenantId: (id: string | null) => void
  tenantName: string | null
  setTenantName: (name: string | null) => void
  subscriptionPlan: string | null
  setSubscriptionPlan: (plan: string | null) => void
  loading: boolean
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize tenant info from auth storage on mount
  useEffect(() => {
    const auth = getAuthFromStorage()

    // If valid non-expired token exists, set tenantId from auth
    if (auth && !isTokenExpired()) {
      setTenantId(auth.tenantId)
    }

    // Load subscription plan from localStorage
    const savedPlan = localStorage.getItem('subscriptionPlan')
    if (savedPlan) {
      setSubscriptionPlan(savedPlan)
    }

    setLoading(false)
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

  useEffect(() => {
    if (subscriptionPlan) {
      localStorage.setItem('subscriptionPlan', subscriptionPlan)
    } else {
      localStorage.removeItem('subscriptionPlan')
    }
  }, [subscriptionPlan])

  const value = {
    tenantId,
    setTenantId,
    tenantName,
    setTenantName,
    subscriptionPlan,
    setSubscriptionPlan,
    loading,
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
