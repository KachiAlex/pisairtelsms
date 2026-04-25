import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

const SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Geography', 'Economics', 'Civic Education', 'History', 'ICT',
  'Further Mathematics', 'Literature', 'Government', 'Commerce', 'Accounting',
]

const EXAM_TYPES = [
  { value: 'written', label: 'Written' },
  { value: 'cbt', label: 'CBT (Computer-Based)' },
  { value: 'practical', label: 'Practical' },
  { value: 'oral', label: 'Oral' },
]

interface Props {
  examPeriodId: string
  onSaved: () => void
  onClose: () => void
}

export function ExamEntryModal({ examPeriodId, onSaved, onClose }: Props) {
  const [form, setForm] = useState({
    subjectName: '',
    examDate: '',
    startTime: '',
    endTime: '',
    examType: 'written',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!form.subjectName || !form.examDate || !form.startTime || !form.endTime) {
      setError('All fields are required')
      return
    }
    if (form.startTime >= form.endTime) {
      setError('Start time must be before end time')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/timetable/exam-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examPeriodId,
          subjectId: form.subjectName.toLowerCase().replace(/\s+/g, '-'),
          subjectName: form.subjectName,
          examDate: form.examDate,
          startTime: form.startTime,
          endTime: form.endTime,
          examType: form.examType,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save exam'); return }
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
          <p className="font-semibold text-gray-900">Schedule New Exam</p>
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
            <Label className="text-xs">Exam Type</Label>
            <Select value={form.examType} onValueChange={v => setForm(f => ({ ...f, examType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Exam Date</Label>
            <Input type="date" value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Schedule Exam'}</Button>
        </div>
      </div>
    </div>
  )
}
