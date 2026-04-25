export interface TenantSettingsPayload {
  schoolName: string
  schoolAddress: string
  schoolEmail: string
  schoolPhone: string
  currentSession: string
  currentTerm: string
  enableSMS: boolean
  enableEmail: boolean
  enableBiometric: boolean
  enableOnlinePayment: boolean
  autoBackup: boolean
  twoFactorAuth: boolean
  maintenanceMode: boolean
  logoUrl?: string | null
}

export interface TenantSettingsResponse extends TenantSettingsPayload {
  updatedAt: string
}

interface ApiResponse {
  settings?: TenantSettingsResponse
  error?: string
}

async function parseResponse(response: Response): Promise<ApiResponse> {
  const data = (await response.json().catch(() => ({}))) as ApiResponse
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Unable to complete request.'
    throw new Error(message)
  }
  return data
}

export async function fetchTenantSettings(): Promise<TenantSettingsResponse> {
  const res = await fetch('/api/tenant/settings')
  const data = await parseResponse(res)
  if (!data.settings) {
    throw new Error('Tenant settings response is empty.')
  }
  return data.settings
}

export async function updateTenantSettings(payload: TenantSettingsPayload): Promise<TenantSettingsResponse> {
  const res = await fetch('/api/tenant/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseResponse(res)
  if (!data.settings) {
    throw new Error('Tenant settings update failed.')
  }
  return data.settings
}
