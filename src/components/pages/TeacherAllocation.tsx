import React, { useState, useEffect } from 'react'
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
import { useToast } from '../ui/use-toast'

function tenantHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const auth = JSON.parse(stored);
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
    }
  } catch {
    // fall through
  }
  return headers;
}

interface CoverageStat { label: string; value: string; detail: string; color: string }
interface TeacherCard { name: string; level: string; risk: string; subjects: string[]; allocation: number; contractHours: number }
interface AllocationRow { class: string; subject: string; teacher: string; coverage: string; warnings: number }
interface PeriodBucket { day: string; periods: number }
interface SubLog { slot: string; priority: string; action: string; relief: string; eta: string; impacted: string[] }

export function TeacherAllocation() {
  const { toast } = useToast()
  const [assignOpen, setAssignOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [coverageStats, setCoverageStats] = useState<CoverageStat[]>([])
  const [teacherCards, setTeacherCards] = useState<TeacherCard[]>([])
  const [allocationMatrix, setAllocationMatrix] = useState<AllocationRow[]>([])
  const [openPeriodTimeline, setOpenPeriodTimeline] = useState<PeriodBucket[]>([])
  const [substitutionLog, setSubstitutionLog] = useState<SubLog[]>([])
  const [editableSlots, setEditableSlots] = useState<(AllocationRow & { id: number; assignedTeacher: string })[]>([])

  useEffect(() => {
    const headers = tenantHeaders()
    Promise.all([
      fetch('/api/tenant/teacher-allocation/coverage-stats', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/teacher-allocation/teachers', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/teacher-allocation/matrix', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/teacher-allocation/open-periods', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/teacher-allocation/substitution-log', { headers }).then((r) => r.json()).catch(() => ({})),
    ]).then(([statsRes, teachersRes, matrixRes, periodsRes, subRes]) => {
      if (statsRes.data) setCoverageStats(statsRes.data)
      if (teachersRes.data) setTeacherCards(teachersRes.data)
      if (matrixRes.data) {
        setAllocationMatrix(matrixRes.data)
        setEditableSlots(
          matrixRes.data
            .filter((row: AllocationRow) => row.coverage === 'Open')
            .map((row: AllocationRow, index: number) => ({ ...row, id: index, assignedTeacher: '' }))
        )
      }
      if (periodsRes.data) setOpenPeriodTimeline(periodsRes.data)
      if (subRes.data) setSubstitutionLog(subRes.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Coverage intelligence</p>
          <h1 className="text-2xl font-bold text-gray-900">Teacher allocation</h1>
          <p className="text-sm text-gray-600">Balance loads, fill gaps, and monitor risks across timetable slots.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast({ title: 'Search teacher', description: 'Use the search box in the Active allocations table below.' })}>
            <Search className="h-4 w-4 mr-2" /> Search teacher
          </Button>
          <Button variant="outline" onClick={async () => {
            try {
              const res = await fetch('/api/tenant/teacher-allocation/auto-balance', { method: 'POST', headers: tenantHeaders() })
              const data = await res.json()
              if (res.ok) {
                if (data.data) setAllocationMatrix(data.data)
                toast({ title: 'Load balanced', description: 'Teacher assignments have been redistributed.' })
              } else {
                toast({ title: 'Auto-balance failed', description: data.error, variant: 'destructive' })
              }
            } catch { toast({ title: 'Network error', variant: 'destructive' }) }
          }}>
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
                    className="p-3 bg-red-50 rounded-lg cursor-grab"
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
            <Button onClick={async () => {
              const assignedSlots = editableSlots.filter(slot => slot.assignedTeacher)
              if (assignedSlots.length === 0) {
                toast({ title: 'No slots assigned', description: 'Drag a teacher onto a slot first.', variant: 'destructive' })
                return
              }
              try {
                const res = await fetch('/api/tenant/teacher-allocation/assign', {
                  method: 'POST',
                  headers: tenantHeaders(),
                  body: JSON.stringify({ assignments: assignedSlots.map(s => ({ class: s.class, subject: s.subject, teacher: s.assignedTeacher })) }),
                })
                const data = await res.json()
                if (res.ok) {
                  if (data.data) setAllocationMatrix(data.data)
                  toast({ title: `${assignedSlots.length} slot(s) assigned`, description: 'Allocation matrix updated.' })
                  setAssignOpen(false)
                } else {
                  toast({ title: 'Assignment failed', description: data.error, variant: 'destructive' })
                }
              } catch { toast({ title: 'Network error', variant: 'destructive' }) }
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
            <Activity className="h-4 w-4 text-amber-600" /> {openPeriodTimeline.reduce((sum, b) => sum + b.periods, 0)} uncovered periods this week.
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
            <Button variant="outline" className="w-full" onClick={() => toast({ title: 'Allocation board', description: 'Full board view is available in the Active allocations table.' })}>
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
          <Button variant="outline" className="w-full" size="sm" onClick={() => setAssignOpen(true)}>
            <UserCheck className="h-4 w-4 mr-2" /> Assign substitute
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
export default TeacherAllocation;
