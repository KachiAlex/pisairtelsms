import React, { useState, useEffect, useCallback } from 'react'
import { CalendarRange, Pencil, Trash2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { tenantApiGet, tenantApiPost, tenantApiPut, tenantApiDelete } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'

type Milestone = {
  id?: string
  title: string
  date: string
  owner: string
  status: string
}

type MilestoneStatus = 'Tentative' | 'Live' | 'Locked' | 'High priority'

const emptyMilestone = (): Milestone => ({ title: '', date: '', owner: '', status: 'Tentative' })

export function AcademicCalendar() {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)
  const [form, setForm] = useState<Milestone>(emptyMilestone())
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  const loadMilestones = useCallback(async () => {
    try {
      const res = await tenantApiGet('/api/tenant/academics/calendar/milestones')
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setMilestones(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading milestones:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMilestones()
  }, [loadMilestones])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyMilestone())
    setDialogOpen(true)
  }

  const openEdit = (m: Milestone) => {
    setEditing(m)
    setForm({ title: m.title, date: m.date, owner: m.owner, status: m.status })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Validation error', description: 'Title is required.', variant: 'destructive' })
      return
    }
    if (!form.date) {
      toast({ title: 'Validation error', description: 'Date is required.', variant: 'destructive' })
      return
    }
    try {
      if (editing?.id) {
        const res = await tenantApiPut(`/api/tenant/academics/calendar/milestones?id=${editing.id}`, form)
        if (res.ok) {
          toast({ title: 'Milestone updated', description: `${form.title} has been updated.` })
          setDialogOpen(false)
          loadMilestones()
        } else {
          const err = await res.json().catch(() => ({}))
          toast({ title: 'Failed to update milestone', description: err.error || 'Unknown error', variant: 'destructive' })
        }
      } else {
        const res = await tenantApiPost('/api/tenant/academics/calendar/milestones', form)
        if (res.ok) {
          toast({ title: 'Milestone added', description: `${form.title} has been created.` })
          setDialogOpen(false)
          loadMilestones()
        } else {
          const err = await res.json().catch(() => ({}))
          toast({ title: 'Failed to add milestone', description: err.error || 'Unknown error', variant: 'destructive' })
        }
      }
    } catch (error) {
      toast({ title: 'Network error', description: 'Failed to save milestone.', variant: 'destructive' })
    }
  }

  const handleDelete = async (m: Milestone) => {
    if (!m.id) return
    if (!window.confirm(`Delete milestone "${m.title}"?`)) return
    try {
      const res = await tenantApiDelete(`/api/tenant/academics/calendar/milestones?id=${m.id}`)
      if (res.ok) {
        toast({ title: 'Milestone deleted', description: `${m.title} has been removed.` })
        loadMilestones()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to delete milestone', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Network error', description: 'Failed to delete milestone.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Session heartbeat</p>
          <h1 className="text-2xl font-bold text-gray-900">Academic calendar</h1>
          <p className="text-sm text-gray-600">Visualize term timelines, milestones, and alerts across campuses.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={openCreate}>
            <CalendarRange className="h-4 w-4 mr-2" /> Add milestone
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Milestone timeline</CardTitle>
            <CardDescription>All academic-critical events sorted by urgency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarRange className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No milestones yet. Add one to get started.</p>
              </div>
            ) : (
              milestones.map((item) => (
                <div key={item.id || item.title} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.owner}</p>
                    <p className="text-[11px] text-gray-400">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === 'High priority' ? 'destructive' : 'secondary'} className="text-[11px] uppercase tracking-wide">
                      {item.status}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} aria-label="Edit milestone">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} aria-label="Delete milestone">
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Milestone' : 'Add New Milestone'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the academic milestone details.' : 'Create a new academic milestone for the calendar.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="milestone-title">Title</Label>
              <Input
                id="milestone-title"
                placeholder="e.g., Mid-term break"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-date">Date</Label>
              <Input
                id="milestone-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-owner">Owner</Label>
              <Input
                id="milestone-owner"
                placeholder="e.g., Principal"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-status">Status</Label>
              <Select value={form.status} onValueChange={(value: MilestoneStatus) => setForm({ ...form, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tentative">Tentative</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Locked">Locked</SelectItem>
                  <SelectItem value="High priority">High priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save Changes' : 'Add Milestone'}</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
export default AcademicCalendar;
