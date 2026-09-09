export interface PromotionRecord {
  id: string;
  studentId: string;
  studentName: string;
  fromClass: string;
  toClass: string;
  action: 'promote' | 'repeat' | 'demote' | 'hold';
  academicSession: string;
  term: string;
  averageScore?: number;
  attendance?: number;
  teacherRecommendation?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionRule {
  id: string;
  name: string;
  conditions: {
    minAverage?: number;
    minAttendance?: number;
    maxAbsences?: number;
  };
  action: 'promote' | 'review' | 'repeat';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionPayload {
  studentId: string;
  studentName: string;
  fromClass: string;
  toClass: string;
  action: 'promote' | 'repeat' | 'demote' | 'hold';
  academicSession: string;
  term: string;
  averageScore?: number;
  attendance?: number;
  teacherRecommendation?: string;
  reason?: string;
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

export async function fetchPromotionRecords(academicSession?: string, term?: string, fromClass?: string): Promise<PromotionRecord[]> {
  const params = new URLSearchParams()
  if (academicSession) params.set('academicSession', academicSession)
  if (term) params.set('term', term)
  if (fromClass) params.set('fromClass', fromClass)

  const url = `/api/tenant/promotions${params.toString() ? `?${params.toString()}` : ''}`
  const response = await fetch(url)
  const result = await parseResponse<PromotionRecord[]>(response)
  return result.data ?? []
}

export async function createPromotionRecord(record: PromotionPayload): Promise<PromotionRecord> {
  const response = await fetch('/api/tenant/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record }),
  })
  const result = await parseResponse<PromotionRecord>(response)
  if (!result.data) {
    throw new Error('Unable to create promotion record.')
  }
  return result.data
}

export async function createBulkPromotionRecords(records: PromotionPayload[]): Promise<PromotionRecord[]> {
  const response = await fetch('/api/tenant/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  })
  const result = await parseResponse<PromotionRecord[]>(response)
  if (!result.data) {
    throw new Error('Unable to create promotion records.')
  }
  return result.data
}

export async function updatePromotionRecord(id: string, updates: Partial<PromotionPayload & { status: string; approvedBy?: string }>): Promise<PromotionRecord> {
  const response = await fetch('/api/tenant/promotions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  const result = await parseResponse<PromotionRecord>(response)
  if (!result.data) {
    throw new Error('Unable to update promotion record.')
  }
  return result.data
}

export async function approvePromotionRecord(id: string, approvedBy: string): Promise<PromotionRecord> {
  return updatePromotionRecord(id, { status: 'approved', approvedBy })
}

export async function completePromotionRecord(id: string): Promise<PromotionRecord> {
  return updatePromotionRecord(id, { status: 'completed' })
}

export async function deletePromotionRecord(id: string): Promise<void> {
  const response = await fetch(`/api/tenant/promotions?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.error === 'string' ? data.error : 'Unable to delete promotion record.')
  }
}

export async function fetchPromotionRules(tenantId: string): Promise<PromotionRule[]> {
  const params = new URLSearchParams({ tenantId })
  const response = await fetch(`/api/tenant/promotion-rules?${params.toString()}`)
  const result = await parseResponse<PromotionRule[]>(response)
  return result.data ?? []
}

export async function updatePromotionRule(id: string, updates: Partial<PromotionRule>): Promise<PromotionRule> {
  const response = await fetch('/api/tenant/promotion-rules', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  const result = await parseResponse<PromotionRule>(response)
  if (!result.data) {
    throw new Error('Unable to update promotion rule.')
  }
  return result.data
}

export async function createPromotionRule(rule: Omit<PromotionRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromotionRule> {
  const response = await fetch('/api/tenant/promotion-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  })
  const result = await parseResponse<PromotionRule>(response)
  if (!result.data) {
    throw new Error('Unable to create promotion rule.')
  }
  return result.data
}

export async function deletePromotionRule(id: string, tenantId: string): Promise<void> {
  const response = await fetch(`/api/tenant/promotion-rules?id=${encodeURIComponent(id)}&tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.error === 'string' ? data.error : 'Unable to delete promotion rule.')
  }
}

// Helper functions for promotion logic
export function getPromotionStatus(averageScore?: number, attendance?: number, rules?: PromotionRule[]): 'promote' | 'review' | 'repeat' {
  if (!rules || rules.length === 0) {
    return averageScore && averageScore >= 50 ? 'promote' : 'review'
  }

  // Fix #11: Sort rules by action priority (promote first, then review, then repeat)
  const actionPriority: Record<string, number> = { promote: 0, review: 1, repeat: 2 }
  const sortedRules = [...rules]
    .filter(r => r.isActive)
    .sort((a, b) => (actionPriority[a.action] ?? 3) - (actionPriority[b.action] ?? 3))

  for (const rule of sortedRules) {
    const { conditions, action } = rule

    let matches = true

    if (conditions.minAverage !== undefined && (averageScore === undefined || averageScore < conditions.minAverage)) {
      matches = false
    }
    if (conditions.minAttendance !== undefined && (attendance === undefined || attendance < conditions.minAttendance)) {
      matches = false
    }
    if (conditions.maxAbsences !== undefined && attendance !== undefined) {
      const absences = 100 - attendance
      if (absences > conditions.maxAbsences) {
        matches = false
      }
    }

    if (matches) {
      return action
    }
  }

  return 'repeat' // Default fallback
}

export function getNextClass(currentClass: string, action: 'promote' | 'repeat' | 'demote'): string {
  const classProgression = [
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
    'JSS 1', 'JSS 2', 'JSS 3',
    'SS 1', 'SS 2', 'SS 3'
  ]

  const currentIndex = classProgression.findIndex(c => c === currentClass)

  if (currentIndex === -1) return currentClass

  switch (action) {
    case 'promote':
      return currentIndex < classProgression.length - 1 ? classProgression[currentIndex + 1] : currentClass
    case 'demote':
      return currentIndex > 0 ? classProgression[currentIndex - 1] : currentClass
    case 'repeat':
    default:
      return currentClass
  }
}
