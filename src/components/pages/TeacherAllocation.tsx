import React, { useState } from 'react'
import { UserCheck, AlertTriangle, Clock3, CalendarCheck, Search, Shuffle, Users, BarChart3, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

const DraggableTeacher = ({ teacher, onDragStart, onDragEnd }) => {
  const style = {
    cursor: 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 bg-blue-50 rounded-lg cursor-grab ${isDragging ? 'opacity-50' : ''}`}
    >
      {teacher.name}
    </div>
  )
}

const DroppableSlot = ({ slot }) => {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id })

  return (
    <div
      ref={setNodeRef}
      className={`p-3 border rounded-lg bg-gray-50 ${isOver ? 'bg-green-100 border-green-300' : ''}`}
    >
      {slot.class} - {slot.subject}
      {slot.assignedTeacher && <div className="mt-2 text-green-600 font-semibold">Assigned: {slot.assignedTeacher}</div>}
    </div>
  )
}

const coverageStats = []

const teacherCards = []

const allocationMatrix = []

const openPeriodTimeline = []

const substitutionLog = []

const subjects = []

export function TeacherAllocation() {
  const [assignOpen, setAssignOpen] = useState(false)
  const [editableSlots, setEditableSlots] = useState(
    allocationMatrix.filter(row => row.coverage === 'Open').map((row, index) => ({ ...row, id: index, assignedTeacher: '' }))
  )
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Coverage intelligence</p>
          <h1 className="text-2xl font-bold text-gray-900">Teacher allocation</h1>
          <p className="text-sm text-gray-600">Balance loads, fill gaps, and monitor risks across timetable slots.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => alert('Search teacher functionality - would open teacher search dialog')}>
            <Search className="h-4 w-4 mr-2" /> Search teacher
          </Button>
          <Button variant="outline" onClick={() => alert('Auto-balance load functionality - would automatically redistribute teacher assignments')}>
            <Shuffle className="h-4 w-4 mr-2" /> Auto-balance load
          </Button>
          <Button onClick={() => setAssignOpen(true)}>
            <CalendarCheck className="h-4 w-4 mr-2" /> Assign slots
          </Button>
        </div>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assign Teacher Slots</DialogTitle>
            <DialogDescription>Drag teachers to open slots to assign to classes and students.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-6 h-96">
            <div className="w-1/3">
              <h3 className="text-lg font-semibold mb-4">Teachers</h3>
              <div className="space-y-2 overflow-y-auto h-full">
                {teacherCards.map(teacher => (
                  <div
                    key={teacher.name}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', teacher.name)}
                    className="p-3 bg-blue-50 rounded-lg cursor-grab"
                  >
                    {teacher.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="w-2/3">
              <h3 className="text-lg font-semibold mb-4">Open Slots</h3>
              <div className="grid gap-2 overflow-y-auto h-full">
                {editableSlots.map(row => (
                  <div
                    key={row.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const teacher = e.dataTransfer.getData('text/plain')
                      setEditableSlots(prev => prev.map(r => r.id === row.id ? { ...r, assignedTeacher: teacher } : r))
                    }}
                    className="p-3 border rounded-lg bg-gray-50 hover:bg-green-50"
                  >
                    {row.class} - {row.subject}
                    {row.assignedTeacher && <div className="mt-2 text-green-600 font-semibold">Assigned: {row.assignedTeacher}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const assignedSlots = editableSlots.filter(slot => slot.assignedTeacher);
              if (assignedSlots.length > 0) {
                // Update the allocation matrix with new assignments
                const updatedMatrix = allocationMatrix.map(row => {
                  const assignedSlot = assignedSlots.find(slot => slot.class === row.class && slot.subject === row.subject);
                  if (assignedSlot && assignedSlot.assignedTeacher) {
                    return {
                      ...row,
                      teacher: assignedSlot.assignedTeacher,
                      coverage: 'Assigned' as const,
                      warnings: Math.max(0, row.warnings - 1) // Reduce warnings for assigned slots
                    };
                  }
                  return row;
                });
                // In a real app, you'd save this to backend
                alert(`Successfully assigned ${assignedSlots.length} teacher slot(s)!`);
                setAssignOpen(false);
              } else {
                alert('No slots have been assigned yet.');
              }
            }}>
              Assign Slots ({editableSlots.filter(slot => slot.assignedTeacher).length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {coverageStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.detail}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${stat.color}`} style={{ width: '100%' }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open period clustering</CardTitle>
          <CardDescription>Visualize when timetable gaps spike to prioritise hiring or substitutions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity className="h-4 w-4 text-amber-600" /> 19 uncovered periods this week (11 are STEM).
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {openPeriodTimeline.map((bucket) => (
              <div key={bucket.day} className="rounded-2xl border border-gray-100 p-3 flex flex-col gap-2 text-sm text-gray-600">
                <span className="text-xs uppercase tracking-wide text-gray-400">{bucket.day}</span>
                <div className="h-20 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ height: `${(bucket.periods / 6) * 100}%` }} />
                </div>
                <span className="text-gray-900 font-semibold">{bucket.periods} gaps</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active allocations</CardTitle>
            <CardDescription>Matrix of classes vs teachers highlighting gaps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search class, subject, or teacher" />
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class / Arm</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Warnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocationMatrix.map((row) => (
                    <TableRow key={`${row.class}-${row.subject}`}>
                      <TableCell className="font-semibold text-gray-900">{row.class}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell className={row.teacher === 'Vacant' ? 'text-rose-600 font-semibold' : ''}>{row.teacher}</TableCell>
                      <TableCell>
                        <Badge variant={row.coverage === 'Assigned' ? 'secondary' : 'outline'} className="text-xs">
                          {row.coverage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {row.warnings > 0 ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" /> {row.warnings}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher load insights</CardTitle>
            <CardDescription>Top signals needing action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherCards.map((teacher) => (
              <div key={teacher.name} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{teacher.name}</p>
                    <p className="text-xs text-gray-500">{teacher.level}</p>
                  </div>
                  <Badge variant={teacher.risk === 'Overload' ? 'destructive' : 'secondary'} className="text-[11px]">
                    {teacher.risk}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">{teacher.subjects.join(' • ')}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Allocation: {teacher.allocation} / {teacher.contractHours} periods</span>
                  <span>{Math.round((teacher.allocation / teacher.contractHours) * 100)}% load</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-1.5 rounded-full ${teacher.risk === 'Overload' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((teacher.allocation / teacher.contractHours) * 100, 120)}%` }}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => alert('View allocation board functionality - would open detailed teacher allocation interface')}>
              <Users className="h-4 w-4 mr-2" /> View allocation board
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk & substitution log</CardTitle>
          <CardDescription>Every open slot tracked with remediation steps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {substitutionLog.map((entry) => (
            <div key={entry.slot} className="rounded-2xl border border-dashed border-gray-200 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-gray-900">
                <span>{entry.slot}</span>
                <Badge variant="outline" className="text-xs">{entry.priority}</Badge>
              </div>
              <p className="text-xs text-gray-500">{entry.action}</p>
              <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                <span className="font-medium text-gray-900">{entry.relief}</span>
                <span>{entry.eta}</span>
                <span>Impacted: {entry.impacted.join(', ')}</span>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" size="sm" onClick={() => alert('Assign substitute functionality - would open substitute teacher assignment dialog')}>
            <UserCheck className="h-4 w-4 mr-2" /> Assign substitute
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
export default TeacherAllocation;
