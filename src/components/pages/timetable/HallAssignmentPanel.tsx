import React, { useEffect, useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import type { ExamSchedule } from './ExamScheduleTab'

interface ExamHall {
  id: string
  name: string
  capacity: number
}

interface Props {
  exam: ExamSchedule
  onRefresh: () => void
}

export function HallAssignmentPanel({ exam, onRefresh }: Props) {
  const [halls, setHalls] = useState<ExamHall[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ hallId: '', studentCount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tenant/timetable/exam-schedules?halls=true')
      .then(r => r.json())
      .then(d => {
        const hallList = Array.isArray(d.data) ? d.data : []
        setHalls(hallList)
        if (hallList.length > 0) setForm(f => f.hallId ? f : { ...f, hallId: hallList[0].id })
      })
      .catch(() => {})
  }, [])

  async function handleAssign() {
    if (!form.hallId || !form.studentCount) { setError('Hall and student count are required'); return }
    const count = parseInt(form.studentCount)
    if (isNaN(count) || count <= 0) { setError('Student count must be a positive number'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenant/timetable/exam-schedules?examId=${exam.id}&action=hall-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hallId: form.hallId, studentCount: count }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to assign hall'); return }
      setShowForm(false)
      setForm({ hallId: '', studentCount: '' })
      onRefresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const selectedHall = halls.find(h => h.id === form.hallId)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          Hall Assignments
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Assign Hall
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {showForm && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div>
              <Label className="text-xs">Hall</Label>
              <Select value={form.hallId} onValueChange={v => setForm(f => ({ ...f, hallId: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={halls.length === 0 ? 'No halls available' : undefined} /></SelectTrigger>
                <SelectContent>
                  {halls.map(h => <SelectItem key={h.id} value={h.id}>{h.name} (cap. {h.capacity})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                Student Count {selectedHall && <span className="text-gray-400">/ {selectedHall.capacity} max</span>}
              </Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={form.studentCount}
                onChange={e => setForm(f => ({ ...f, studentCount: e.target.value }))}
                placeholder="e.g. 120"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAssign} disabled={saving}>{saving ? '…' : 'Assign'}</Button>
            </div>
          </div>
        )}

        {(!exam.hallAssignments || exam.hallAssignments.length === 0) && !showForm && (
          <p className="text-xs text-gray-400 text-center py-2">No halls assigned yet</p>
        )}

        {(exam.hallAssignments || []).map(a => (
          <div key={a.id} className="flex items-center justify-between text-xs rounded-lg border border-gray-100 p-2">
            <span className="font-medium text-gray-800">{a.hallName}</span>
            <span className="text-gray-500">{a.studentCount} students</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
