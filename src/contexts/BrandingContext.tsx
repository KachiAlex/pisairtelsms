import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface BrandingConfig {
  schoolName: string
  schoolMotto: string
  logoUrl: string | null
  logoFileName: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  isPublished: boolean
  updatedAt: string | null
}

interface BrandingContextType {
  branding: BrandingConfig
  loading: boolean
  refresh: () => Promise<void>
}

const DEFAULT_BRANDING: BrandingConfig = {
  schoolName: 'Pisairtel-Schools',
  schoolMotto: '',
  logoUrl: null,
  logoFileName: null,
  primaryColor: '#1E3A8A',
  secondaryColor: '#10B981',
  accentColor: '#F59E0B',
  isPublished: false,
  updatedAt: null,
}

function getAuth() {
  try {
    const stored = localStorage.getItem('auth')
    if (stored) {
      const auth = JSON.parse(stored)
      return {
        tenantId: auth.tenantId || localStorage.getItem('tenantId') || 'default-tenant',
        userId: auth.userId || auth.email || 'system',
      }
    }
  } catch { /* fall through */ }
  return {
    tenantId: localStorage.getItem('tenantId') || 'default-tenant',
    userId: 'system',
  }
}

function mapRow(row: any): BrandingConfig {
  return {
    schoolName: row.school_name || row.schoolName || DEFAULT_BRANDING.schoolName,
    schoolMotto: row.school_motto || row.schoolMotto || '',
    logoUrl: row.logo_url || row.logoUrl || null,
    logoFileName: row.logo_file_name || row.logoFileName || null,
    primaryColor: row.primary_color || row.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: row.secondary_color || row.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    accentColor: row.accent_color || row.accentColor || DEFAULT_BRANDING.accentColor,
    isPublished: row.is_published || row.isPublished || false,
    updatedAt: row.updated_at || row.updatedAt || null,
  }
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  loading: true,
  refresh: async () => {},
})

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/branding')
      if (!res.ok) return
      const result = await res.json()
      if (result.data) setBranding(mapRow(result.data))
    } catch {
      // silently fail — defaults remain in place
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}
