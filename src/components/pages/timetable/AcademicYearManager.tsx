import React, { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import type { Term } from './ConfigureTab'

interface Props {
  terms: Term[]
  onRefresh: () => void
}

export function AcademicYearManager({ terms, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [editYear, setEditYear] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract unique academic years from existing terms
  const academicYears = useMemo(() => {
    const years = Array.from(new Set(terms.map(t => t.academicYear).filter(Boolean)))
    return years.sort((a, b) => b.localeCompare(a))
  }, [terms])

  // Count terms per academic year
  const yearStats = useMemo(() => {
    const stats: Record<string, { terms: number; startDate: string; endDate: string }> = {}
    terms.forEach(term => {
      if (!stats[term.academicYear]) {
        stats[term.academicYear] = { terms: 0, startDate: term.startDate, endDate: term.endDate }
      }
      stats[term.academicYear].terms++
      if (term.startDate < stats[term.academicYear].startDate) {
        stats[term.academicYear].startDate = term.startDate
      }
      if (term.endDate > stats[term.academicYear].endDate) {
        stats[term.academicYear].endDate = term.endDate
      }
    })
    return stats
  }, [terms])

  function startEdit(year: string) {
    setEditYear(year)
    setEditValue(year)
    setShowForm(false)
    setError(null)
  }

  function cancelEdit() {
    setEditYear(null)
    setEditValue('')
    setError(null)
  }

  function cancelForm() {
    setShowForm(false)
    setNewYear('')
    setError(null)
  }

  // Note: Academic years are managed through terms. 
  // This UI shows existing years and allows updating all terms with that year.
  
  async function handleAddYear(year: string) {
    if (!year.trim()) {
      setError('Academic year is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Create a default term with the new academic year
      const res = await fetch('/api/tenant/timetable/calendar?resource=terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'First Term',
          academicYear: year,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create academic year')
      }

      cancelForm()
      onRefresh()
    } catch (e: any) {
      setError(e.message || 'Failed to create academic year')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateYear(oldYear: string, newYearValue: string) {
    if (!newYearValue.trim()) {
      setError('Academic year is required')
      return
    }
    if (newYearValue === oldYear) {
      cancelEdit()
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Update all terms with the old academic year
      const termsToUpdate = terms.filter(t => t.academicYear === oldYear)
      
      for (const term of termsToUpdate) {
        const res = await fetch(`/api/tenant/timetable/calendar?resource=terms&id=${term.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ academicYear: newYearValue }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Failed to update term: ${term.name}`)
        }
      }

      cancelEdit()
      onRefresh()
    } catch (e: any) {
      setError(e.message || 'Failed to update academic year')
    } finally {
      setSaving(false)
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
        <Button size="sm" onClick={() => { setShowForm(true); setEditYear(null); setNewYear('') }}>
          <Plus className="h-4 w-4 mr-1" /> Add Year
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add New Year Form */}
        {showForm && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">New Academic Year</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="space-y-2">
              <Label className="text-xs">Academic Year Name</Label>
              <Input 
                value={newYear} 
                onChange={e => setNewYear(e.target.value)} 
                placeholder="e.g. 2025/2026"
                className="max-w-xs"
              />
              <p className="text-xs text-gray-500">
                Note: Create a term with this academic year to fully set it up.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelForm}>Cancel</Button>
              <Button 
                size="sm" 
                onClick={() => handleAddYear(newYear)}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* Edit Year Form */}
        {editYear && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800">Edit Academic Year</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="space-y-2">
              <Label className="text-xs">Academic Year Name</Label>
              <Input 
                value={editValue} 
                onChange={e => setEditValue(e.target.value)} 
                placeholder="e.g. 2024/2025"
                className="max-w-xs"
              />
              <p className="text-xs text-amber-700">
                Warning: This will update the academic year for {yearStats[editYear]?.terms || 0} term(s).
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
              <Button 
                size="sm" 
                onClick={() => handleUpdateYear(editYear, editValue)}
                disabled={saving}
              >
                {saving ? 'Updating…' : 'Update'}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {academicYears.length === 0 && !showForm && (
          <p className="text-sm text-gray-500 text-center py-4">
            No academic years configured yet. Add your first year.
          </p>
        )}

        {/* List of Academic Years */}
        {academicYears.map(year => (
          <div key={year} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{year}</p>
              <p className="text-xs text-gray-500">
                {yearStats[year]?.terms || 0} term(s) • {yearStats[year]?.startDate || '-'} → {yearStats[year]?.endDate || '-'}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(year)}>
                <Pencil className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
