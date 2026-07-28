// Tenant configuration types and interfaces
export interface TenantConfig {
  id: string
  name: string
  domain?: string // Custom domain for this tenant
  subdomain?: string // If using subdomain approach
  settings: TenantSettings
  createdAt: string
  updatedAt: string
}

export interface TenantSettings {
  // Form URLs
  customApplicationUrl?: string // Full custom URL for application form
  customInquiryUrl?: string // Full custom URL for inquiry form

  // Branding
  logo?: string
  primaryColor?: string
  schoolName?: string

  // Features
  enableCustomDomain: boolean
  enableSubdomain: boolean

  // Contact information
  supportEmail?: string
  contactPhone?: string
}

// Default tenant configuration
export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  enableCustomDomain: false,
  enableSubdomain: false,
}

// Utility functions for tenant domain management
export class TenantDomainManager {
  private static tenantConfigs: Map<string, TenantConfig> = new Map()
  private static readonly API_BASE = '/api/tenant'

  /**
   * Get tenant configuration - uses API in production, localStorage in development
   */
  static async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    // In production, try API first
    if (typeof window !== 'undefined' && !import.meta.env.DEV) {
      try {
        const response = await fetch(`${this.API_BASE}/domain-config`)
        if (response.ok) {
          const data = await response.json()
          const config: TenantConfig = {
            id: tenantId,
            name: `Tenant ${tenantId}`, // Would come from API
            settings: data.domainConfig,
            createdAt: data.domainConfig.updatedAt,
            updatedAt: data.domainConfig.updatedAt
          }
          return config
        }
      } catch (error) {
        console.warn('Failed to fetch from API, falling back to localStorage')
      }
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(`tenant_${tenantId}`)
    if (stored) {
      const config = JSON.parse(stored)
      this.tenantConfigs.set(tenantId, config)
      return config
    }
    return null
  }

  /**
   * Save tenant configuration - uses API in production, localStorage in development
   */
  static async saveTenantConfig(tenantId: string, config: TenantConfig): Promise<void> {
    config.updatedAt = new Date().toISOString()

    // In production, try API first
    if (typeof window !== 'undefined' && !import.meta.env.DEV) {
      try {
        const response = await fetch(`${this.API_BASE}/domain-config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config.settings)
        })

        if (response.ok) {
          this.tenantConfigs.set(tenantId, config)
          return
        }
      } catch (error) {
        console.warn('Failed to save to API, falling back to localStorage')
      }
    }

    // Fallback to localStorage
    localStorage.setItem(`tenant_${tenantId}`, JSON.stringify(config))
    this.tenantConfigs.set(tenantId, config)
  }

  /**
   * Create default tenant configuration
   */
  static createDefaultConfig(tenantId: string, name: string): TenantConfig {
    return {
      id: tenantId,
      name,
      settings: { ...DEFAULT_TENANT_SETTINGS },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Get the appropriate form URLs for a tenant
   */
  static getTenantFormUrls(tenantId: string): { application: string; inquiry: string } {
    const config = this.tenantConfigs.get(tenantId)

    if (config?.settings.enableCustomDomain) {
      // Use tenant's custom URLs if configured
      const applicationUrl = config.settings.customApplicationUrl ||
        `${config.domain || window.location.origin}/apply`
      const inquiryUrl = config.settings.customInquiryUrl ||
        `${config.domain || window.location.origin}/inquiry`

      return {
        application: applicationUrl,
        inquiry: inquiryUrl
      }
    }

    // Fall back to default URLs
    const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin
    return {
      application: `${baseUrl}/apply`,
      inquiry: `${baseUrl}/inquiry`
    }
  }

  /**
   * Validate if a domain is properly formatted
   */
  static validateDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
    return domainRegex.test(domain)
  }

  /**
   * Validate if a URL is properly formatted
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}
