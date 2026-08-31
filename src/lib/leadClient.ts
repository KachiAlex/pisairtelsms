interface LeadPayload {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classInterested: string
  source: string
  status: string
}

export const createLead = async (payload: LeadPayload) => {
  const response = await fetch('/api/tenant/lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error('Failed to create lead')
  }
  return response.json()
}
