import React, { useState, useEffect, useCallback } from 'react'
import { CalendarRange } from 'lucide-react'

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
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'

export function AcademicCalendar() {
  const { toast } = useToast()
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false)
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    date: '',
    owner: '',
    status: 'Tentative' as 'Tentative' | 'Live' | 'Locked' | 'High priority'
  })
  const [milestones, setMilestones] = useState<Array<{ title: string; date: string; owner: string; status: string }>>([])
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

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) {
      toast({ title: 'Validation error', description: 'Title is required.', variant: 'destructive' })
      return
    }
    try {
      const res = await tenantApiPost('/api/tenant/academics/calendar/milestones', newMilestone)
      if (res.ok) {
        toast({ title: 'Milestone added', description: `${newMilestone.title} has been created.` })
        setNewMilestone({ title: '', date: '', owner: '', status: 'Tentative' })
        setAddMilestoneOpen(false)
        loadMilestones()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to add milestone', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Network error', description: 'Failed to add milestone.', variant: 'destructive' })
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
          <Button onClick={() => setAddMilestoneOpen(true)}>
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
                <div key={item.title} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.owner}</p>
                    <p className="text-[11px] text-gray-400">{item.date}</p>
                  </div>
                  <Badge variant={item.status === 'High priority' ? 'destructive' : 'secondary'} className="text-[11px] uppercase tracking-wide">
                    {item.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Milestone</DialogTitle>
            <DialogDescription>Create a new academic milestone for the calendar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="milestone-title">Title</Label>
              <Input
                id="milestone-title"
                placeholder="e.g., Mid-term break"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-date">Date</Label>
              <Input
                id="milestone-date"
                placeholder="e.g., 01 Mar"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-owner">Owner</Label>
              <Input
                id="milestone-owner"
                placeholder="e.g., Principal"
                value={newMilestone.owner}
                onChange={(e) => setNewMilestone({ ...newMilestone, owner: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="milestone-status">Status</Label>
              <Select value={newMilestone.status} onValueChange={(value: typeof newMilestone.status) => setNewMilestone({ ...newMilestone, status: value })}>
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
            <Button variant="outline" onClick={() => setAddMilestoneOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              handleAddMilestone()
            }}>Add Milestone</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
export default AcademicCalendar;
