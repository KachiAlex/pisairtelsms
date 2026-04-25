import { randomUUID } from 'crypto'

export interface TimeSlot {
  id: string
  tenantId: string
  name: string
  startTime: string   // HH:MM
  endTime: string     // HH:MM
  durationMinutes: number
  dayOfWeek: number   // 1=Mon … 5=Fri
  isBreak: boolean
  sequence: number
  createdAt: string
  updatedAt: string
}

const store = new Map<string, TimeSlot>()

function initMockData() {
  if (store.size > 0) return
  const tenantId = 'demo-tenant-001'
  const now = new Date().toISOString()

  const slots: Omit<TimeSlot, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Period 1', startTime: '08:00', endTime: '08:45', durationMinutes: 45, dayOfWeek: 0, isBreak: false, sequence: 1 },
    { name: 'Period 2', startTime: '08:50', endTime: '09:35', durationMinutes: 45, dayOfWeek: 0, isBreak: false, sequence: 2 },
    { name: 'Period 3', startTime: '09:40', endTime: '10:25', durationMinutes: 45, dayOfWeek: 0, isBreak: false, sequence: 3 },
    { name: 'Short Break', startTime: '10:25', endTime: '10:45', durationMinutes: 20, dayOfWeek: 0, isBreak: true, sequence: 4 },
    { name: 'Period 4', startTime: '10:45', endTime: '11:30', durationMinutes: 45, dayOfWeek: 0, isBreak: false, sequence: 5 },
    { name: 'Period 5', startTime: '11:35', endTime: '12:20', durationMinutes: 45, dayOfWeek: 0, isBreak: false, sequence: 6 },
    { name: 'Lunch Break', startTime: '12:20', endTime: '13:00', durationMinutes: 40, dayOfWeek: 0, isBreak: true, sequence: 7 },
    { name: 'Period 6', startTime: '13:00', endTime: '13:45', durationMinutes: 45, dayOfWeek: 0, isBreak: false, sequence: 8 },
    { name: 'Period 7', startTime: '13:50', endTime: '14:35', durationMinutes: 45, dayOfWeek: 0, isBreak: false, sequence: 9 },
  ]

  // Apply same slots to all weekdays (0=all days shared template)
  for (const slot of slots) {
    const id = randomUUID()
    store.set(id, { id, tenantId, ...slot, createdAt: now, updatedAt: now })
  }
}

export function getTimeSlots(tenantId: string, dayOfWeek?: number): TimeSlot[] {
  initMockData()
  let slots = Array.from(store.values()).filter(s => s.tenantId === tenantId)
  if (dayOfWeek !== undefined) slots = slots.filter(s => s.dayOfWeek === dayOfWeek)
  return slots.sort((a, b) => a.sequence - b.sequence)
}

export function createTimeSlot(tenantId: string, data: Omit<TimeSlot, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): TimeSlot {
  initMockData()
  const now = new Date().toISOString()
  const slot: TimeSlot = { id: randomUUID(), tenantId, ...data, createdAt: now, updatedAt: now }
  store.set(slot.id, slot)
  return slot
}

export function updateTimeSlot(id: string, data: Partial<TimeSlot>): TimeSlot | null {
  initMockData()
  const slot = store.get(id)
  if (!slot) return null
  const updated = { ...slot, ...data, updatedAt: new Date().toISOString() }
  store.set(id, updated)
  return updated
}

export function deleteTimeSlot(id: string): boolean {
  return store.delete(id)
}

export function timeSlotsOverlap(tenantId: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: string): boolean {
  const slots = getTimeSlots(tenantId, dayOfWeek)
  return slots.some(s => {
    if (excludeId && s.id === excludeId) return false
    return startTime < s.endTime && endTime > s.startTime
  })
}
