import React, { useEffect, useState } from 'react'
import { Plus, UserCheck, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Label } from '../../ui/label'
import type { ExamSchedule } from './ExamScheduleTab'

interface StaffMember {
  id: string
  name: string
  role: string
}

interface ExamHall {
  id: string
  name: string
  capacity: number
}

interface Props {
  exam: ExamSchedule
  onRefresh: () => void
}

export function InvigilatorAssignmentPanel({ exam, onRefresh }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [halls, setHalls] = useState<ExamHall[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ staffId: '', hallId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/tenant/staff').then(r => r.json()),
      fetch('/api/tenant/timetable/exam-schedules?halls=true').then(r => r.json()),
    ]).then(([staffData, hallsData]) => {
      const members = staffData.data || []
      const hallList = hallsData.data || []
      setStaff(members)
      setHalls(hallList)
      setForm(f => ({
        staffId: f.staffId || members[0]?.id || '',
        hallId: f.hallId || hallList[0]?.id || '',
      }))
    }).catch(() => {})
  }, [])

  async function handleAssign() {
    if (!form.staffId || !form.hallId) { setError('Staff member and hall are required'); return }
    setSaving(true)
    setError(null)
    try {
      const member = staff.find(s => s.id === form.staffId)
      const res = await fetch(`/api/tenant/timetable/exam-schedules?examId=${exam.id}&action=invigilators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: form.staffId, staffName: member?.name || form.staffId, hallId: form.hallId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to assign invigilator'); return }
      setShowForm(false)
      setForm({ staffId: '', hallId: '' })
      onRefresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(invigilatorId: string) {
    try {
      await fetch(`/api/tenant/timetable/exam-schedules?examId=${exam.id}&action=invigilators&subId=${invigilatorId}`, { method: 'DELETE' })
      onRefresh()
    } catch {
      alert('Failed to remove invigilator')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-emerald-600" />
          Invigilators
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {showForm && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 space-y-2">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div>
              <Label className="text-xs">Staff Member</Label>
              <Select value={form.staffId} onValueChange={v => setForm(f => ({ ...f, staffId: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={staff.length === 0 ? 'No staff available' : undefined} /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assigned Hall</Label>
              <Select value={form.hallId} onValueChange={v => setForm(f => ({ ...f, hallId: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={halls.length === 0 ? 'No halls available' : undefined} /></SelectTrigger>
                <SelectContent>
                  {halls.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAssign} disabled={saving}>{saving ? '…' : 'Assign'}</Button>
            </div>
          </div>
        )}

        {exam.invigilators.length === 0 && !showForm && (
          <p className="text-xs text-gray-400 text-center py-2">No invigilators assigned yet</p>
        )}

        {exam.invigilators.map(inv => (
          <div key={inv.id} className="flex items-center justify-between text-xs rounded-lg border border-gray-100 p-2">
            <span className="font-medium text-gray-800">{inv.staffName}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{halls.find(h => h.id === inv.hallId)?.name || inv.hallId}</span>
              <button onClick={() => handleRemove(inv.id)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
