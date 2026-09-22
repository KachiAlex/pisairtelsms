import React, { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { tenantApiGet, tenantApiPost, tenantApiPut, tenantApiDelete } from '../../../lib/tenantApi'

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

interface StaffMember {
  id: string
  name: string
  role: string
}

interface ExistingEntry {
  id: string
  subjectId?: string
  subjectName: string
  teacherId?: string
  teacherName: string
  roomId?: string
}

interface Props {
  scheduleId: string | null
  timeSlotId: string
  dayOfWeek: number
  classId: string
  termId: string
  /** When set, the modal edits this entry (PUT) instead of creating one (POST). */
  entry?: ExistingEntry
  onSaved: () => void
  onClose: () => void
  ensureSchedule: () => Promise<string | null>
}

export function TimetableEntryModal({ scheduleId, timeSlotId, dayOfWeek, classId, termId, entry, onSaved, onClose, ensureSchedule }: Props) {
  const isEditing = !!entry
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [form, setForm] = useState({
    subjectName: entry?.subjectName || '',
    teacherId: entry?.teacherId || '',
    teacherName: entry?.teacherName || '',
    roomId: entry?.roomId || '',
  })
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    tenantApiGet('/api/tenant/staff')
      .then(r => r.json())
      .then(d => {
        const members = d.data || []
        setStaff(members)
        if (members.length > 0) setForm(f => f.teacherId ? f : { ...f, teacherId: members[0].id, teacherName: members[0].name || members[0].id })
      })
      .catch(() => setStaff([]))

    tenantApiGet('/api/tenant/academics/subjects?namesOnly=true')
      .then(r => r.json())
      .then(d => {
        const list: string[] = Array.isArray(d.data) ? d.data.filter(Boolean) : []
        setSubjects(list)
        if (list.length > 0) setForm(f => f.subjectName ? f : { ...f, subjectName: list[0] })
      })
      .catch(() => setSubjects([]))
  }, [])

  // Entries saved before teacherId was tracked may lack it — match by name
  useEffect(() => {
    if (!form.teacherId && entry?.teacherName && staff.length > 0) {
      const match = staff.find(s => s.name === entry.teacherName)
      if (match) setForm(f => ({ ...f, teacherId: match.id }))
    }
  }, [staff, entry, form.teacherId])

  async function handleSave() {
    if (!form.subjectName || !form.teacherId) {
      setError('Subject and teacher are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        timeSlotId,
        dayOfWeek,
        subjectId: form.subjectName.toLowerCase().replace(/\s+/g, '-'),
        subjectName: form.subjectName,
        teacherId: form.teacherId,
        teacherName: form.teacherName,
        // Raw value (not `|| undefined`): on edit the API COALESCEs, so an
        // empty string is what actually clears a previously-set room.
        roomId: form.roomId,
      }
      let res: Response
      if (isEditing && scheduleId) {
        res = await tenantApiPut(
          `/api/tenant/timetable/class-schedules?scheduleId=${scheduleId}&entryId=${entry!.id}`,
          payload,
        )
      } else {
        let sid = scheduleId
        if (!sid) {
          sid = await ensureSchedule()
          if (!sid) { setError('Failed to create schedule. Please try again.'); setSaving(false); return }
        }
        res = await tenantApiPost(`/api/tenant/timetable/class-schedules?scheduleId=${sid}`, payload)
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Failed to save entry'); return }
      onSaved()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!entry || !scheduleId) return
    setRemoving(true)
    setError(null)
    try {
      const res = await tenantApiDelete(
        `/api/tenant/timetable/class-schedules?scheduleId=${scheduleId}&entryId=${entry.id}`,
      )
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to remove entry')
        return
      }
      onSaved()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{isEditing ? 'Edit Assignment' : 'Assign Subject'}</p>
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
              <SelectTrigger><SelectValue placeholder={subjects.length === 0 ? 'No subjects available' : undefined} /></SelectTrigger>
              <SelectContent>
                {form.subjectName && !subjects.includes(form.subjectName) && (
                  <SelectItem value={form.subjectName}>{form.subjectName}</SelectItem>
                )}
                {subjects.length === 0 && !form.subjectName
                  ? <SelectItem value="__none" disabled>Create subjects in the Subject Catalog first</SelectItem>
                  : subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                }
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
              <SelectTrigger><SelectValue placeholder={staff.length === 0 ? 'No staff available' : undefined} /></SelectTrigger>
              <SelectContent>
                {form.teacherId && !staff.some(s => s.id === form.teacherId) && (
                  <SelectItem value={form.teacherId}>{form.teacherName || form.teacherId}</SelectItem>
                )}
                {staff.length === 0 && !form.teacherId ? (
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

        <div className="flex gap-2 justify-between pt-2">
          <div>
            {isEditing && (
              <Button variant="outline" onClick={handleRemove} disabled={removing || saving} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-1" /> {removing ? 'Removing…' : 'Remove'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || removing}>{saving ? 'Saving…' : isEditing ? 'Save changes' : 'Assign'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
