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
  admissionNoFormat?: string
  admissionNoDigits?: number
  schoolLatitude?: number | null
  schoolLongitude?: number | null
  geofenceRadius?: number
  checkInWindowStart?: string
  checkInWindowEnd?: string
  checkOutWindowStart?: string
  checkOutWindowEnd?: string
  enforceGeofence?: boolean
  enforceTimeWindow?: boolean
  // SMS Configuration
  smsProvider?: string
  smsSenderId?: string
  smsApiKey?: string
  // Password Policy
  passwordMinLength?: number
  passwordRequireUppercase?: boolean
  passwordRequireLowercase?: boolean
  passwordRequireNumbers?: boolean
  passwordRequireSpecial?: boolean
}

export interface TenantSettingsResponse extends TenantSettingsPayload {
  updatedAt: string
}

interface ApiResponse {
  settings?: TenantSettingsResponse
  error?: string
}

function getAuthHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
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
  const res = await fetch('/api/tenant/settings', { headers: getAuthHeaders() })
  const data = await parseResponse(res)
  if (!data.settings) {
    throw new Error('Tenant settings response is empty.')
  }
  return data.settings
}

export async function updateTenantSettings(payload: TenantSettingsPayload): Promise<TenantSettingsResponse> {
  const res = await fetch('/api/tenant/settings', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await parseResponse(res)
  if (!data.settings) {
    throw new Error('Tenant settings update failed.')
  }
  return data.settings
}
