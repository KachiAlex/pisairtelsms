import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import type { Term } from './ConfigureTab'
import { tenantApiGet, tenantApiPost, tenantApiPut, tenantApiDelete } from '../../../lib/tenantApi'

interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

interface Props {
  terms: Term[]
  onRefresh: () => void
}

interface FormState {
  name: string
  academicYear: string
  startDate: string
  endDate: string
}

const emptyForm: FormState = { name: '', academicYear: '', startDate: '', endDate: '' }

export function TermManager({ terms, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])

  useEffect(() => {
    fetchAcademicYears()
  }, [])

  async function fetchAcademicYears() {
    try {
      const res = await tenantApiGet('/api/tenant/timetable/calendar?resource=academic-years')
      const data = await res.json()
      setAcademicYears(Array.isArray(data.data) ? data.data : [])
    } catch {
      setAcademicYears([])
    }
  }

  function startEdit(term: Term) {
    setEditId(term.id)
    setForm({ name: term.name, academicYear: term.academicYear, startDate: term.startDate, endDate: term.endDate })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function handleSave() {
    if (!form.name || !form.academicYear || !form.startDate || !form.endDate) {
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
      const res = editId
        ? await tenantApiPut(`/api/tenant/timetable/calendar?resource=terms&id=${editId}`, form)
        : await tenantApiPost('/api/tenant/timetable/calendar?resource=terms', form)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save term'); return }
      cancelForm()
      onRefresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this term? This cannot be undone.')) return
    try {
      const res = await tenantApiDelete(`/api/tenant/timetable/calendar?resource=terms&id=${id}`)
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed to delete'); return }
      onRefresh()
    } catch {
      alert('Network error')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            Academic Terms
          </CardTitle>
          <CardDescription>Define terms for the academic year</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Term
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">{editId ? 'Edit Term' : 'New Term'}</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Term Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. First Term" />
              </div>
              <div>
                <Label className="text-xs">Academic Year</Label>
                <Select value={form.academicYear} onValueChange={v => setForm(f => ({ ...f, academicYear: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={academicYears.length === 0 ? 'No academic years yet' : 'Select academic year'} />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.length === 0 ? (
                      <SelectItem value="" disabled>No academic years available</SelectItem>
                    ) : (
                      academicYears.map(ay => (
                        <SelectItem key={ay.id} value={ay.name}>{ay.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {academicYears.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">Create a term with a new academic year first</p>
                )}
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

        {terms.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 text-center py-4">No terms configured yet. Add your first term.</p>
        )}

        {terms.map(term => (
          <div key={term.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{term.name}</p>
              <p className="text-xs text-gray-500">{term.academicYear} • {term.startDate} → {term.endDate}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(term)}>
                <Pencil className="h-3.5 w-3.5 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(term.id)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
