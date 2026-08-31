import React, { useState } from 'react'
import { Plus, Trash2, Clock, Wand2, Pencil, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Badge } from '../../ui/badge'
import { Checkbox } from '../../ui/checkbox'
import { tenantApiPost, tenantApiPut, tenantApiDelete } from '../../../lib/tenantApi'
import type { TimeSlot } from './ConfigureTab'

interface Props {
  timeSlots: TimeSlot[]
  onRefresh: () => void
}

const DAY_NAMES = ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Generate the optimal progressive time slots that fill the school day with no gaps
// Pattern: P1, P2, Short, P3, P4, Lunch, P5, P6, Short, P7, P8, Lunch
function generateProgressiveSlots(
  startTime = '08:00',
  endTime = '15:20',
  periodDuration = 40,
  shortBreakDuration = 20,
  lunchBreakDuration = 40,
) {
  const slots: { name: string; startTime: string; endTime: string; isBreak: boolean }[] = []

  function addMinutes(timeStr: string, mins: number): string {
    const [h, m] = timeStr.split(':').map(Number)
    const total = h * 60 + m + mins
    const hh = String(Math.floor(total / 60)).padStart(2, '0')
    const mm = String(total % 60).padStart(2, '0')
    return `${hh}:${mm}`
  }

  function timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  // Explicit pattern: period, period, short break, period, period, lunch, period, period, short break, period, period, lunch
  const pattern: ('period' | 'short' | 'lunch')[] = [
    'period', 'period', 'short',
    'period', 'period', 'lunch',
    'period', 'period', 'short',
    'period', 'period', 'lunch',
  ]

  let current = startTime
  let periodCount = 0

  for (const item of pattern) {
    if (timeToMinutes(current) >= timeToMinutes(endTime)) break

    if (item === 'period') {
      const periodEnd = addMinutes(current, periodDuration)
      if (timeToMinutes(periodEnd) > timeToMinutes(endTime)) break
      periodCount++
      slots.push({ name: `Period ${periodCount}`, startTime: current, endTime: periodEnd, isBreak: false })
      current = periodEnd
    } else if (item === 'short') {
      const breakEnd = addMinutes(current, shortBreakDuration)
      if (timeToMinutes(breakEnd) > timeToMinutes(endTime)) break
      slots.push({ name: 'Short Break', startTime: current, endTime: breakEnd, isBreak: true })
      current = breakEnd
    } else if (item === 'lunch') {
      const breakEnd = addMinutes(current, lunchBreakDuration)
      if (timeToMinutes(breakEnd) > timeToMinutes(endTime)) break
      slots.push({ name: 'Lunch Break', startTime: current, endTime: breakEnd, isBreak: true })
      current = breakEnd
    }
  }

  return slots
}

const COMMON_SLOTS = generateProgressiveSlots()

export function TimeSlotManager({ timeSlots, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startTime: '', endTime: '', dayOfWeek: 0, isBreak: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', startTime: '', endTime: '', isBreak: false })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function cancelForm() {
    setShowForm(false)
    setForm({ name: '', startTime: '', endTime: '', dayOfWeek: 0, isBreak: false })
    setError(null)
  }

  function startEdit(slot: TimeSlot) {
    setEditingId(slot.id)
    setEditForm({ name: slot.name, startTime: slot.startTime, endTime: slot.endTime, isBreak: slot.isBreak })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ name: '', startTime: '', endTime: '', isBreak: false })
  }

  async function handleSave() {
    if (!form.name || !form.startTime || !form.endTime) {
      setError('Name, start time, and end time are required')
      return
    }
    if (form.startTime >= form.endTime) {
      setError('Start time must be before end time')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await tenantApiPost('/api/tenant/timetable/time-slots', form)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save time slot'); return }
      cancelForm()
      onRefresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this time slot?')) return
    try {
      const res = await tenantApiDelete(`/api/tenant/timetable/time-slots?id=${id}`)
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to delete'); return }
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; })
      onRefresh()
    } catch {
      alert('Network error')
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected time slot(s)?`)) return
    try {
      const res = await tenantApiDelete(`/api/tenant/timetable/time-slots?ids=${Array.from(selectedIds).join(',')}`)
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to delete'); return }
      setSelectedIds(new Set())
      onRefresh()
    } catch {
      alert('Network error')
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(timeSlots.map(s => s.id)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  async function handleUpdate(id: string) {
    if (!editForm.name || !editForm.startTime || !editForm.endTime) {
      alert('Name, start time, and end time are required')
      return
    }
    if (editForm.startTime >= editForm.endTime) {
      alert('Start time must be before end time')
      return
    }
    try {
      const res = await tenantApiPut(`/api/tenant/timetable/time-slots?id=${id}`, editForm)
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to update'); return }
      cancelEdit()
      onRefresh()
    } catch {
      alert('Network error')
    }
  }

  async function handleAutoConfigure() {
    if (timeSlots.length > 0) {
      if (!confirm('This will create common time slots. Existing slots will remain. Continue?')) return
    }
    setSaving(true)
    try {
      const slotsToCreate = COMMON_SLOTS.map((slot, i) => ({ ...slot, dayOfWeek: 0, sequence: i + 1 }))
      const res = await tenantApiPost('/api/tenant/timetable/time-slots', { slots: slotsToCreate })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to auto-configure'); return }
      onRefresh()
    } catch {
      alert('Failed to auto-configure time slots')
    } finally {
      setSaving(false)
    }
  }

  const teachingSlots = timeSlots.filter(s => !s.isBreak)
  const breakSlots = timeSlots.filter(s => s.isBreak)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Time Slots & Breaks
          </CardTitle>
          <CardDescription>Define the daily schedule structure</CardDescription>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={deselectAll} className="text-gray-500">
                Deselect All
              </Button>
              <Button variant="default" size="sm" onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="h-4 w-4 mr-1" /> Delete ({selectedIds.size})
              </Button>
            </>
          )}
          {timeSlots.length > 0 && selectedIds.size === 0 && (
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-blue-600">
              Select All
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleAutoConfigure} disabled={saving} className="border-blue-200 text-blue-600 hover:bg-blue-50">
            <Wand2 className="h-4 w-4 mr-1" /> Auto Configure
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Slot
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">New Time Slot</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Slot Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Period 1" />
              </div>
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isBreak}
                onCheckedChange={v => setForm(f => ({ ...f, isBreak: v }))}
                id="is-break"
              />
              <Label htmlFor="is-break" className="text-sm cursor-pointer">This is a break time (not a teaching slot)</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelForm}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        )}

        {timeSlots.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 text-center py-4">No time slots configured yet.</p>
        )}

        {teachingSlots.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Teaching Periods</p>
            <div className="space-y-2">
              {teachingSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  {editingId === slot.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        <Input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} />
                        <Input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                        <Button size="sm" onClick={() => handleUpdate(slot.id)}><CheckCircle className="h-3 w-3 mr-1" /> Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.has(slot.id)}
                          onCheckedChange={() => toggleSelection(slot.id)}
                          aria-label={`Select ${slot.name}`}
                        />
                        <Badge className="bg-blue-100 text-blue-700 text-xs">{slot.startTime} – {slot.endTime}</Badge>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{slot.name}</p>
                          <p className="text-xs text-gray-500">{slot.durationMinutes} min • {DAY_NAMES[slot.dayOfWeek]}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(slot)}>
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(slot.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {breakSlots.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Breaks</p>
            <div className="space-y-2">
              {breakSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 p-3">
                  {editingId === slot.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        <Input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} />
                        <Input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                        <Button size="sm" onClick={() => handleUpdate(slot.id)}><CheckCircle className="h-3 w-3 mr-1" /> Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedIds.has(slot.id)}
                          onCheckedChange={() => toggleSelection(slot.id)}
                          aria-label={`Select ${slot.name}`}
                        />
                        <Badge className="bg-amber-100 text-amber-700 text-xs">{slot.startTime} – {slot.endTime}</Badge>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{slot.name}</p>
                          <p className="text-xs text-gray-500">{slot.durationMinutes} min</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(slot)}>
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(slot.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
