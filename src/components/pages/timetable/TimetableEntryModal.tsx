import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Geography', 'Economics', 'Civic Education', 'History', 'ICT',
  'Further Mathematics', 'Literature', 'Government', 'Commerce', 'Accounting',
]

interface StaffMember {
  id: string
  name: string
  role: string
}

interface Props {
  scheduleId: string | null
  timeSlotId: string
  dayOfWeek: number
  classId: string
  termId: string
  onSaved: () => void
  onClose: () => void
  ensureSchedule: () => Promise<string | null>
}

export function TimetableEntryModal({ scheduleId, timeSlotId, dayOfWeek, classId, termId, onSaved, onClose, ensureSchedule }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [form, setForm] = useState({ subjectName: '', teacherId: '', teacherName: '', roomId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tenant/staff')
      .then(r => r.json())
      .then(d => setStaff(d.data || []))
      .catch(() => setStaff([]))
  }, [])

  async function handleSave() {
    if (!form.subjectName || !form.teacherId) {
      setError('Subject and teacher are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let sid = scheduleId
      if (!sid) {
        sid = await ensureSchedule()
        if (!sid) { setError('Failed to create schedule. Please try again.'); setSaving(false); return }
      }
      const res = await fetch(`/api/tenant/timetable/class-schedules?scheduleId=${sid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSlotId,
          dayOfWeek,
          subjectId: form.subjectName.toLowerCase().replace(/\s+/g, '-'),
          subjectName: form.subjectName,
          teacherId: form.teacherId,
          teacherName: form.teacherName,
          roomId: form.roomId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save entry'); return }
      onSaved()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Assign Subject</p>
            <p className="text-xs text-gray-500">{classId} • {DAY_NAMES[dayOfWeek]}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Subject</Label>
            <Select value={form.subjectName} onValueChange={v => setForm(f => ({ ...f, subjectName: v }))}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Teacher</Label>
            <Select
              value={form.teacherId}
              onValueChange={v => {
                const member = staff.find(s => s.id === v)
                setForm(f => ({ ...f, teacherId: v, teacherName: member?.name || v }))
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {staff.length === 0 ? (
                  <SelectItem value="__none" disabled>No staff loaded</SelectItem>
                ) : (
                  staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Room (optional)</Label>
            <Input
              value={form.roomId}
              onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
              placeholder="e.g. CR2, Lab A"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Assign'}</Button>
        </div>
      </div>
    </div>
  )
}
