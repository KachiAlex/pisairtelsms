// Environment configuration
const config = {
  baseUrl: import.meta.env.VITE_BASE_URL || window.location.origin,
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  defaultTenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || 'default',
}

// Form URLs - tenant-aware URL generation
export const FORM_URLS = {
  get application() {
    return getTenantFormUrls(config.defaultTenantId).application
  },
  get inquiry() {
    return getTenantFormUrls(config.defaultTenantId).inquiry
  }
} as const

// Import tenant domain manager
import { TenantDomainManager } from './lib/tenantConfig'

// Helper function to get tenant-specific URLs
function getTenantFormUrls(tenantId: string) {
  return TenantDomainManager.getTenantFormUrls(tenantId)
}

// Export tenant management functions
export { TenantDomainManager }
export type { TenantConfig, TenantSettings } from './lib/tenantConfig'

export default config
