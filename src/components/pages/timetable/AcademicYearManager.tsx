import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, GraduationCap, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Badge } from '../../ui/badge'
import { tenantApiGet, tenantApiPost, tenantApiPut, tenantApiDelete } from '../../../lib/tenantApi'

interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

interface Props {
  onRefresh: () => void
}

export function AcademicYearManager({ onRefresh }: Props) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  function startEdit(ay: AcademicYear) {
    setEditId(ay.id)
    setForm({ name: ay.name, startDate: ay.startDate, endDate: ay.endDate, isCurrent: ay.isCurrent })
    setShowForm(false)
    setError(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm({ name: '', startDate: '', endDate: '', isCurrent: false })
    setError(null)
  }

  async function handleSave() {
    if (!form.name || !form.startDate || !form.endDate) {
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
      const url = editId 
        ? `/api/tenant/timetable/calendar?resource=academic-years&id=${editId}`
        : '/api/tenant/timetable/calendar?resource=academic-years'
      
      const res = editId
        ? await tenantApiPut(`/api/tenant/timetable/calendar?resource=academic-years&id=${editId}`, form)
        : await tenantApiPost('/api/tenant/timetable/calendar?resource=academic-years', form)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save academic year')
      }

      cancelForm()
      await fetchAcademicYears()
      onRefresh()
    } catch (e: any) {
      setError(e.message || 'Failed to save academic year')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this academic year? This will affect all associated terms.')) return
    try {
      const res = await tenantApiDelete(`/api/tenant/timetable/calendar?resource=academic-years&id=${id}`)
      if (!res.ok) {
        const d = await res.json()
        alert(d.error || 'Failed to delete')
        return
      }
      await fetchAcademicYears()
      onRefresh()
    } catch {
      alert('Network error')
    }
  }

  async function handleSetCurrent(id: string) {
    try {
      const res = await tenantApiPut(`/api/tenant/timetable/calendar?resource=academic-years&id=${id}`, { isCurrent: true })
      if (res.ok) {
        await fetchAcademicYears()
      }
    } catch {
      alert('Failed to set current academic year')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            Academic Years
          </CardTitle>
          <CardDescription>Manage academic sessions (e.g., 2024/2025)</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', startDate: '', endDate: '', isCurrent: false }) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Year
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add/Edit Form */}
        {(showForm || editId) && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">{editId ? 'Edit Academic Year' : 'New Academic Year'}</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Academic Year Name</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  placeholder="e.g. 2025/2026"
                />
              </div>
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isCurrent"
                  checked={form.isCurrent}
                  onChange={e => setForm(f => ({ ...f, isCurrent: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="isCurrent" className="text-xs">Set as current academic year</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelForm}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {academicYears.length === 0 && !showForm && !editId && (
          <p className="text-sm text-gray-500 text-center py-4">
            No academic years configured yet. Add your first year.
          </p>
        )}

        {/* List of Academic Years */}
        {academicYears.map(ay => (
          <div key={ay.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  {ay.name}
                  {ay.isCurrent && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Current</Badge>}
                </p>
                <p className="text-xs text-gray-500">{ay.startDate} → {ay.endDate}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {!ay.isCurrent && (
                <Button variant="ghost" size="icon" onClick={() => handleSetCurrent(ay.id)} title="Set as current">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => startEdit(ay)}>
                <Pencil className="h-3.5 w-3.5 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(ay.id)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
