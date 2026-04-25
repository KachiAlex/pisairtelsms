import { randomUUID } from 'crypto'

export type ConflictSeverity = 'high' | 'medium' | 'low'
export type ConflictStatus = 'open' | 'resolved'

export interface Conflict {
  id: string
  tenantId: string
  conflictType: string
  entityType: 'class' | 'teacher' | 'exam'
  entityId: string
  description: string
  impact: string
  owner: string
  severity: ConflictSeverity
  status: ConflictStatus
  resolutionNotes?: string
  createdAt: string
  resolvedAt?: string
}

const store = new Map<string, Conflict>()

function initMockData() {
  if (store.size > 0) return
  const tenantId = 'demo-tenant-001'
  const now = new Date().toISOString()

  const conflicts: Conflict[] = [
    { id: 'cf-104', tenantId, conflictType: 'Teacher double booking', entityType: 'class', entityId: 'JSS 2A', description: 'Physics vs Chemistry overlap', impact: 'Lab double booking - SS 2A', owner: 'Science dept.', severity: 'high', status: 'open', createdAt: now },
    { id: 'cf-099', tenantId, conflictType: 'Advisor clash', entityType: 'teacher', entityId: 'teacher-aminat', description: 'Mrs. Aminat double scheduled', impact: 'Two classes at same time slot', owner: 'Guidance team', severity: 'medium', status: 'open', createdAt: now },
    { id: 'cf-210', tenantId, conflictType: 'Hall overcapacity', entityType: 'exam', entityId: 'exam-1', description: 'Hall 1 at 125% capacity on Wednesday', impact: 'Hall 1 at 125% on Wed', owner: 'Logistics', severity: 'high', status: 'open', createdAt: now },
    { id: 'cf-207', tenantId, conflictType: 'Invigilator shortage', entityType: 'exam', entityId: 'exam-2', description: 'Need 2 substitute invigilators for Friday exams', impact: 'Need 2 substitutes Friday', owner: 'HR', severity: 'medium', status: 'open', createdAt: now },
  ]
  for (const c of conflicts) store.set(c.id, c)
}

export function getConflicts(tenantId: string, status?: string, severity?: string, entityType?: string): Conflict[] {
  initMockData()
  let conflicts = Array.from(store.values()).filter(c => c.tenantId === tenantId)
  if (status) conflicts = conflicts.filter(c => c.status === status)
  if (severity) conflicts = conflicts.filter(c => c.severity === severity)
  if (entityType) conflicts = conflicts.filter(c => c.entityType === entityType)
  return conflicts.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })
}

export function resolveConflict(id: string, resolutionNotes: string): Conflict | null {
  initMockData()
  const conflict = store.get(id)
  if (!conflict) return null
  const updated: Conflict = { ...conflict, status: 'resolved', resolutionNotes, resolvedAt: new Date().toISOString() }
  store.set(id, updated)
  return updated
}

export function createConflict(tenantId: string, data: Omit<Conflict, 'id' | 'tenantId' | 'status' | 'createdAt'>): Conflict {
  initMockData()
  const now = new Date().toISOString()
  const conflict: Conflict = { id: randomUUID(), tenantId, status: 'open', createdAt: now, ...data }
  store.set(conflict.id, conflict)
  return conflict
}

export function getOpenConflictCount(tenantId: string): number {
  initMockData()
  return Array.from(store.values()).filter(c => c.tenantId === tenantId && c.status === 'open').length
}
