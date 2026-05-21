import React, { useState } from 'react'
import { Plus, Trash2, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import type { ExamPeriod, Term } from './ConfigureTab'

interface Props {
  examPeriods: ExamPeriod[]
  terms: Term[]
  onRefresh: () => void
}

export function ExamPeriodManager({ examPeriods, terms, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ termId: terms[0]?.id || '', name: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cancelForm() {
    setShowForm(false)
    setForm({ termId: terms[0]?.id || '', name: '', startDate: '', endDate: '' })
    setError(null)
  }

  async function handleSave() {
    if (!form.termId || !form.name || !form.startDate || !form.endDate) {
      setError('All fields are required')
      return
    }
    if (form.startDate >= form.endDate) {
      setError('Start date must be before end date')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/timetable/calendar?resource=exam-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save exam period'); return }
      cancelForm()
      onRefresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exam period?')) return
    try {
      const res = await fetch(`/api/tenant/timetable/calendar?resource=exam-periods&id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to delete'); return }
      onRefresh()
    } catch {
      alert('Network error')
    }
  }

  const termName = (id: string) => terms.find(t => t.id === id)?.name || id

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-purple-600" />
            Exam Periods
          </CardTitle>
          <CardDescription>Define exam windows within each term</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Exam Period
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-purple-800">New Exam Period</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Term</Label>
                <Select value={form.termId} onValueChange={v => setForm(f => ({ ...f, termId: v }))}>
                  <SelectTrigger><SelectValue placeholder={terms.length === 0 ? 'No terms available' : undefined} /></SelectTrigger>
                  <SelectContent>
                    {terms.length === 0
                      ? <SelectItem value="__none" disabled>Create a term first</SelectItem>
                      : terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academicYear})</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Exam Period Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. First Term Exams" />
              </div>
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelForm}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        )}

        {examPeriods.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 text-center py-4">No exam periods configured yet.</p>
        )}

        {examPeriods.map(ep => (
          <div key={ep.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{ep.name}</p>
              <p className="text-xs text-gray-500">{termName(ep.termId)} • {ep.startDate} → {ep.endDate}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(ep.id)}>
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
