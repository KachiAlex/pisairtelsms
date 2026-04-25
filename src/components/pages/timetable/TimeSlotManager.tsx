import React, { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import { Badge } from '../../ui/badge'
import type { TimeSlot } from './ConfigureTab'

interface Props {
  timeSlots: TimeSlot[]
  onRefresh: () => void
}

const DAY_NAMES = ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function TimeSlotManager({ timeSlots, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startTime: '', endTime: '', dayOfWeek: 0, isBreak: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cancelForm() {
    setShowForm(false)
    setForm({ name: '', startTime: '', endTime: '', dayOfWeek: 0, isBreak: false })
    setError(null)
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
      const res = await fetch('/api/tenant/timetable/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
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
      const res = await fetch(`/api/tenant/timetable/time-slots?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to delete'); return }
      onRefresh()
    } catch {
      alert('Network error')
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
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Slot
        </Button>
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
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-100 text-blue-700 text-xs">{slot.startTime} – {slot.endTime}</Badge>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{slot.name}</p>
                      <p className="text-xs text-gray-500">{slot.durationMinutes} min • {DAY_NAMES[slot.dayOfWeek]}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(slot.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
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
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-100 text-amber-700 text-xs">{slot.startTime} – {slot.endTime}</Badge>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{slot.name}</p>
                      <p className="text-xs text-gray-500">{slot.durationMinutes} min</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(slot.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
