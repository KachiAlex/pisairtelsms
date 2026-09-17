import React, { useState, useEffect, useCallback } from 'react'
import { UserCheck, AlertTriangle, Search, Shuffle, Users, Activity, Sparkles } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { useToast } from '../ui/use-toast'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'

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

const BASE = '/api/tenant/teacher-allocation-handler'

interface CoverageStat { label: string; value: string; detail: string; color: string }
interface TeacherCard { name: string; level: string; risk: string; subjects: string[]; allocation: number; contractHours: number }
interface AllocationRow { class: string; subject: string; teacher: string; coverage: string; warnings: number }
interface PeriodBucket { day: string; periods: number }
interface SubLog { slot: string; priority: string; action: string; relief: string; eta: string; impacted: string[] }

export function TeacherAllocation() {
  const { toast } = useToast()
  const [assignOpen, setAssignOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [coverageStats, setCoverageStats] = useState<CoverageStat[]>([])
  const [teacherCards, setTeacherCards] = useState<TeacherCard[]>([])
  const [allocationMatrix, setAllocationMatrix] = useState<AllocationRow[]>([])
  const [openPeriodTimeline, setOpenPeriodTimeline] = useState<PeriodBucket[]>([])
  const [substitutionLog, setSubstitutionLog] = useState<SubLog[]>([])
  const [editableSlots, setEditableSlots] = useState<(AllocationRow & { id: number; assignedTeacher: string })[]>([])
  const [search, setSearch] = useState('')
  const [savingRow, setSavingRow] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const headers = tenantHeaders()
    const [statsRes, teachersRes, matrixRes, periodsRes, subRes] = await Promise.all([
      tenantApiGet(`${BASE}?action=coverage-stats`).then((r) => r.json()).catch(() => ({})),
      tenantApiGet(`${BASE}?action=teachers`).then((r) => r.json()).catch(() => ({})),
      tenantApiGet(`${BASE}?action=matrix`).then((r) => r.json()).catch(() => ({})),
      tenantApiGet(`${BASE}?action=open-periods`).then((r) => r.json()).catch(() => ({})),
      tenantApiGet(`${BASE}?action=substitution-log`).then((r) => r.json()).catch(() => ({})),
    ])
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
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleAutoBalance = async () => {
    try {
      const res = await tenantApiPost(`${BASE}?action=auto-balance`)
      const data = await res.json()
      if (res.ok) {
        if (data.data) setAllocationMatrix(data.data)
        toast({ title: 'Load balanced', description: data.message || 'Teacher assignments have been redistributed.' })
        loadAll()
      } else {
        toast({ title: 'Auto-balance failed', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  const handleAssignRow = async (row: AllocationRow, teacher: string) => {
    const key = `${row.class}::${row.subject}`
    setSavingRow(key)
    try {
      const res = await tenantApiPost(`${BASE}?action=assign`, {
        assignments: [{ class: row.class, subject: row.subject, teacher }],
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: teacher ? `${row.class} / ${row.subject} assigned` : 'Slot opened',
          description: teacher ? `Teacher: ${teacher}` : 'No teacher assigned.',
        })
        loadAll()
      } else {
        toast({ title: 'Assignment failed', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setSavingRow(null)
    }
  }

  const handleGenerateSlots = async (classes: string[], subjects: string[]) => {
    try {
      const res = await tenantApiPost(`${BASE}?action=generate-slots`, { classes, subjects })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Slots generated', description: data.message })
        setGenerateOpen(false)
        loadAll()
      } else {
        toast({ title: 'Failed to generate slots', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  const handleAutoGenerate = async () => {
    try {
      const res = await tenantApiPost(`${BASE}?action=auto-generate`)
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Slots generated', description: data.message })
        loadAll()
      } else {
        toast({ title: 'Auto-generate failed', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  const filteredMatrix = search.trim()
    ? allocationMatrix.filter((row) =>
        [row.class, row.subject, row.teacher].some((v) => (v || '').toLowerCase().includes(search.trim().toLowerCase()))
      )
    : allocationMatrix

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Coverage intelligence</p>
          <h1 className="text-2xl font-bold text-gray-900">Teacher allocation</h1>
          <p className="text-sm text-gray-600">Balance loads, fill gaps, and monitor risks across timetable slots.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleAutoGenerate}>
            <Sparkles className="h-4 w-4 mr-2" /> Auto-generate slots
          </Button>
          <Button variant="outline" onClick={() => setGenerateOpen(true)}>
            Custom selection
          </Button>
          <Button variant="outline" onClick={handleAutoBalance}>
            <Shuffle className="h-4 w-4 mr-2" /> Auto-balance load
          </Button>
          <Button variant="outline" onClick={() => setAssignOpen(true)}>
            <UserCheck className="h-4 w-4 mr-2" /> Assign slots
          </Button>
        </div>
      </div>

      <GenerateSlotsDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerate={handleGenerateSlots}
      />

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
                {teacherCards.length === 0 && <p className="text-sm text-gray-500">No teachers found.</p>}
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
                {editableSlots.length === 0 && <p className="text-sm text-gray-500">No open slots. Generate slots first.</p>}
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
                const res = await tenantApiPost(`${BASE}?action=assign`, {
                  assignments: assignedSlots.map(s => ({ class: s.class, subject: s.subject, teacher: s.assignedTeacher })),
                })
                const data = await res.json()
                if (res.ok) {
                  if (data.data) setAllocationMatrix(data.data)
                  toast({ title: `${assignedSlots.length} slot(s) assigned`, description: 'Allocation matrix updated.' })
                  setAssignOpen(false)
                  loadAll()
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
            <div className="relative lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search class, subject, or teacher" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
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
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500">Loading…</TableCell>
                    </TableRow>
                  )}
                  {!loading && filteredMatrix.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500">
                        No allocation slots yet. Use “Generate slots” to create them from your classes and subjects.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredMatrix.map((row) => (
                    <TableRow key={`${row.class}-${row.subject}`}>
                      <TableCell className="font-semibold text-gray-900">{row.class}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell>
                        <Select
                          value={row.teacher || '__vacant__'}
                          onValueChange={(v) => handleAssignRow(row, v === '__vacant__' ? '' : v)}
                          disabled={savingRow === `${row.class}::${row.subject}`}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="Vacant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__vacant__">Vacant</SelectItem>
                            {teacherCards
                              .filter((t) => t.name)
                              .sort((a, b) => {
                                const aMatch = (a.subjects || []).includes(row.subject) ? -1 : 0
                                const bMatch = (b.subjects || []).includes(row.subject) ? -1 : 0
                                return aMatch - bMatch || a.name.localeCompare(b.name)
                              })
                              .map((t) => (
                                <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
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
                <p className="text-xs text-gray-500 mt-2">{(teacher.subjects || []).join(' • ')}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Allocation: {teacher.allocation} / {teacher.contractHours} periods</span>
                  <span>{teacher.contractHours > 0 ? Math.round((teacher.allocation / teacher.contractHours) * 100) : 0}% load</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-1.5 rounded-full ${teacher.risk === 'Overload' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(teacher.contractHours > 0 ? (teacher.allocation / teacher.contractHours) * 100 : 0, 120)}%` }}
                  />
                </div>
              </div>
            ))}
            {teacherCards.length === 0 && <p className="text-sm text-gray-500">No teachers found.</p>}
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
          {substitutionLog.length === 0 && <p className="text-sm text-gray-500">No substitution events recorded.</p>}
          <Button variant="outline" className="w-full" size="sm" onClick={() => setAssignOpen(true)}>
            <UserCheck className="h-4 w-4 mr-2" /> Assign substitute
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface ClassOption { name: string; arm?: string; level?: string }
interface SubjectOption { name: string; levels?: string[] }

// Normalise a class name like "JSS1" / "SS 2" to the level token used in
// subjects.levels ("JSS 1" / "SS 2"). Returns null for unmappable names.
function classLevelToken(className: string): string | null {
  const m = className.trim().match(/^(JSS|SS|JS)\s*(\d)/i)
  if (!m) return null
  const band = /^S/i.test(m[1]) ? 'SS' : 'JSS'
  return `${band} ${m[2]}`
}

function subjectMatchesClass(subjectLevels: string[] | undefined, className: string): boolean {
  const token = classLevelToken(className)
  if (!token) return true // can't determine level — don't hide it
  return (subjectLevels || []).includes(token)
}

function GenerateSlotsDialog({
  open, onOpenChange, onGenerate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (classes: string[], subjects: string[]) => void
}) {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([])
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!open) return
    setFetching(true)
    Promise.all([
      tenantApiGet('/api/tenant/academics/classes').then(r => r.json()).catch(() => ({})),
      tenantApiGet('/api/tenant/academics/subjects').then(r => r.json()).catch(() => ({})),
    ]).then(([clsRes, subRes]) => {
      setClassOptions(clsRes.data || [])
      setSubjectOptions(subRes.data || [])
      setFetching(false)
    })
  }, [open])

  const toggle = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  // Only show subjects whose levels cover at least one selected class.
  const selectedClassList = classOptions.filter(c => selectedClasses.has(c.name))
  const visibleSubjects = selectedClassList.length === 0
    ? subjectOptions
    : subjectOptions.filter(s => selectedClassList.some(c => subjectMatchesClass(s.levels, c.name)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate allocation slots</DialogTitle>
          <DialogDescription>
            Pick the classes and subjects — a slot is created for each pair. Subjects are
            filtered to the levels your selected classes belong to. Existing pairs are skipped.
          </DialogDescription>
        </DialogHeader>
        {fetching ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading classes and subjects…</p>
        ) : (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Classes</label>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => setSelectedClasses(
                  selectedClasses.size === classOptions.length
                    ? new Set()
                    : new Set(classOptions.map(c => c.name))
                )}
              >
                {selectedClasses.size === classOptions.length ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-2">
              {classOptions.map(c => (
                <label key={c.name} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                  <Checkbox
                    checked={selectedClasses.has(c.name)}
                    onCheckedChange={() => toggle(selectedClasses, c.name, setSelectedClasses)}
                  />
                  <span>{c.name}{c.arm ? ` ${c.arm}` : ''}</span>
                  {c.level && <span className="text-xs text-gray-400 ml-auto">{c.level}</span>}
                </label>
              ))}
              {classOptions.length === 0 && <p className="text-xs text-gray-400 p-1">No classes found — create them in Classes &amp; Arms first.</p>}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Subjects</label>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => setSelectedSubjects(
                  selectedSubjects.size === visibleSubjects.length
                    ? new Set()
                    : new Set(visibleSubjects.map(s => s.name))
                )}
              >
                {selectedSubjects.size === visibleSubjects.length ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-2">
              {visibleSubjects.map(s => (
                <label key={s.name} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                  <Checkbox
                    checked={selectedSubjects.has(s.name)}
                    onCheckedChange={() => toggle(selectedSubjects, s.name, setSelectedSubjects)}
                  />
                  <span>{s.name}</span>
                </label>
              ))}
              {visibleSubjects.length === 0 && <p className="text-xs text-gray-400 p-1">No subjects match the selected classes.</p>}
            </div>
          </div>
        </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            {selectedClasses.size * selectedSubjects.size > 0
              ? `${selectedClasses.size * selectedSubjects.size} slot(s) will be created`
              : 'Select at least one class and one subject'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={() => onGenerate(Array.from(selectedClasses), Array.from(selectedSubjects))}
              disabled={selectedClasses.size === 0 || selectedSubjects.size === 0}
            >
              Generate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default TeacherAllocation;
