export interface SuperAdminAccount {
  id: number
  fullName: string
  organization: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface SuperAdminAccountPayload {
  fullName: string
  organization: string
  email: string
  password: string
}

interface ApiResponse<T> {
  account?: T
  error?: string
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : 'Request failed. Please try again.'
    throw new Error(message)
  }
  return data
}

export async function fetchSuperAdminAccount(): Promise<SuperAdminAccount | null> {
  const response = await fetch('/api/super-admin')
  const data = await parseResponse<SuperAdminAccount>(response)
  return data.account ?? null
}

export async function upsertSuperAdminAccount(
  payload: SuperAdminAccountPayload,
): Promise<SuperAdminAccount> {
  const response = await fetch('/api/super-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseResponse<SuperAdminAccount>(response)
  if (!data.account) {
    throw new Error('Unable to save super admin account.')
  }
  return data.account
}

export async function verifySuperAdminAccount(
  email: string,
  password: string,
): Promise<SuperAdminAccount> {
  const response = await fetch('/api/super-admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await parseResponse<SuperAdminAccount>(response)
  if (!data.account) {
    throw new Error('Unable to verify super admin credentials.')
  }
  return data.account
}
