export interface Application {
  id: string;
  trackingId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  classApplying: string;
  previousSchool: string;
  parentNames: string[];
  phones: string[];
  email: string;
  address: string;
  emergencyContacts: string[];
  specialNeeds: string;
  transportation: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  submittedAt: string;
  updatedAt: string;
}

export interface ApplicationPayload {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  classApplying: string;
  previousSchool: string;
  parentNames: string[];
  phones: string[];
  email: string;
  address: string;
  emergencyContacts: string[];
  specialNeeds: string;
  transportation: string;
}

interface ApiResponse<T> {
  data?: T
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

export async function createApplication(applicationData: ApplicationPayload): Promise<Application> {
  const response = await fetch('/api/tenant/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application: applicationData }),
  })
  const result = await parseResponse<Application>(response)
  if (!result.data) {
    throw new Error('Unable to create application.')
  }
  return result.data
}

export async function fetchApplications(): Promise<Application[]> {
  const response = await fetch('/api/tenant/applications')
  const result = await parseResponse<Application[]>(response)
  return result.data ?? []
}

export async function updateApplicationStatus(id: string, status: Application['status']): Promise<Application> {
  const response = await fetch('/api/tenant/applications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  })
  const result = await parseResponse<Application>(response)
  if (!result.data) {
    throw new Error('Unable to update application status.')
  }
  return result.data
}
