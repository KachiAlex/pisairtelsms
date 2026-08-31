import React, { useState, useEffect, useCallback } from 'react'
import { Layers, GraduationCap, Building, Sparkles } from 'lucide-react'

import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'

export function AcademicStructureOverview() {
  const { toast } = useToast()
  const [addProgramOpen, setAddProgramOpen] = useState(false)
  const [addDepartmentOpen, setAddDepartmentOpen] = useState(false)
  const [newProgram, setNewProgram] = useState({ name: '', level: '', description: '' })
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' })
  const [classArmsCount, setClassArmsCount] = useState(0)
  const [subjectsCount, setSubjectsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadOverviewData = useCallback(async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        tenantApiGet('/api/tenant/cbt/classes'),
        tenantApiGet('/api/tenant/academics/subjects'),
      ])
      if (classesRes.ok) {
        const data = await classesRes.json()
        setClassArmsCount(data.data?.length || 0)
      }
      if (subjectsRes.ok) {
        const data = await subjectsRes.json()
        setSubjectsCount(data.data?.length || 0)
      }
    } catch (error) {
      console.error('Error loading overview data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverviewData()
  }, [loadOverviewData])

  const liveMetrics = [
    {
      label: 'Streams & Arms',
      value: String(classArmsCount),
      detail: 'Active class arms',
      icon: GraduationCap,
      color: 'text-emerald-600',
    },
    {
      label: 'Subjects',
      value: String(subjectsCount),
      detail: 'Registered subjects',
      icon: Layers,
      color: 'text-red-600',
    },
  ]

  const handleAddProgram = async () => {
    if (!newProgram.name.trim()) {
      toast({ title: 'Validation error', description: 'Program name is required.', variant: 'destructive' })
      return
    }
    try {
      const res = await tenantApiPost('/api/tenant/academics/programs', newProgram)
      if (res.ok) {
        toast({ title: 'Program added', description: `${newProgram.name} has been created.` })
        setNewProgram({ name: '', level: '', description: '' })
        setAddProgramOpen(false)
        loadOverviewData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to add program', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Network error', description: 'Failed to add program.', variant: 'destructive' })
    }
  }

  const handleAddDepartment = async () => {
    if (!newDepartment.name.trim()) {
      toast({ title: 'Validation error', description: 'Department name is required.', variant: 'destructive' })
      return
    }
    try {
      const res = await tenantApiPost('/api/tenant/academics/departments', newDepartment)
      if (res.ok) {
        toast({ title: 'Department added', description: `${newDepartment.name} has been created.` })
        setNewDepartment({ name: '', description: '' })
        setAddDepartmentOpen(false)
        loadOverviewData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to add department', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Network error', description: 'Failed to add department.', variant: 'destructive' })
    }
  }
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Academic control center</p>
            <h1 className="text-2xl font-bold text-gray-900">Academic structure</h1>
            <p className="text-sm text-gray-600">Orchestrate levels, subjects, and policies powering Pisairtel-Schools experiences.</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Academic control center</p>
          <h1 className="text-2xl font-bold text-gray-900">Academic structure</h1>
          <p className="text-sm text-gray-600">Orchestrate levels, subjects, and policies powering Pisairtel-Schools experiences.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setAddProgramOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" /> Add new program
          </Button>
          <Button onClick={() => setAddDepartmentOpen(true)}>
            <Building className="h-4 w-4 mr-2" /> Add new department
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {liveMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="p-4 space-y-2">
                <div className={`rounded-full bg-gray-50 w-10 h-10 flex items-center justify-center ${metric.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{metric.label}</p>
                <p className="text-3xl font-semibold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.detail}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {addProgramOpen && (
        <Dialog open={addProgramOpen} onOpenChange={setAddProgramOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Program</DialogTitle>
              <DialogDescription>Create a new academic program for the structure.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="programName">Program Name</Label>
                <Input id="programName" placeholder="e.g., Primary Education" value={newProgram.name} onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="level">Level</Label>
                <Input id="level" placeholder="e.g., Primary" value={newProgram.level} onChange={(e) => setNewProgram({ ...newProgram, level: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Program description" value={newProgram.description} onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddProgramOpen(false)}>Cancel</Button>
              <Button onClick={() => { handleAddProgram(); setAddProgramOpen(false) }}>Add Program</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {addDepartmentOpen && (
        <Dialog open={addDepartmentOpen} onOpenChange={setAddDepartmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
              <DialogDescription>Create a new department for the academic structure.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="departmentName">Department Name</Label>
                <Input id="departmentName" placeholder="e.g., Science Department" value={newDepartment.name} onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Department description" value={newDepartment.description} onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDepartmentOpen(false)}>Cancel</Button>
              <Button onClick={() => { handleAddDepartment(); setAddDepartmentOpen(false) }}>Add Department</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}
export default AcademicStructureOverview;
