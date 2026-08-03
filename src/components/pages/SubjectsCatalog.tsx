import React, { useMemo, useState, useEffect } from 'react'
import { BookOpen, GraduationCap, Layers3, Filter, Download, Sparkles, AlertTriangle, X } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'

interface Subject {
  id: string
  code: string
  name: string
  levels: string[]
  type: 'Core' | 'Elective'
  department: string
  description?: string
  version?: string
  resourcesStatus?: string
  owner?: string
  auditDate?: string
}

export function SubjectsCatalog() {
  const { toast } = useToast()
  const [activeDepartment, setActiveDepartment] = useState('All')
  const [addSubjectOpen, setAddSubjectOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newSubject, setNewSubject] = useState({
    code: '',
    name: '',
    levels: [] as string[],
    type: 'Core' as 'Core' | 'Elective',
    department: 'Sciences',
    description: ''
  })

  const departmentBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    subjects.forEach((subject) => {
      const key = subject.department || 'Unassigned'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [subjects])

  const departmentFilters = useMemo(() => ['All', ...departmentBreakdown.map(([dept]) => dept)], [departmentBreakdown])

  useEffect(() => {
    if (!departmentFilters.includes(activeDepartment)) {
      setActiveDepartment('All')
    }
  }, [departmentFilters, activeDepartment])

  const totalSubjects = subjects.length
  const coreCount = useMemo(() => subjects.filter((subject) => subject.type === 'Core').length, [subjects])
  const electiveCount = totalSubjects - coreCount
  const uniqueLevels = useMemo(
    () => Array.from(new Set(subjects.flatMap((subject) => subject.levels || []))),
    [subjects]
  )
  const resourcesComplete = useMemo(
    () => subjects.filter((subject) => (subject.resourcesStatus || '').toLowerCase() === 'complete').length,
    [subjects]
  )
  const resourceReadyPct = totalSubjects ? Math.round((resourcesComplete / totalSubjects) * 100) : 0
  const pendingResources = totalSubjects - resourcesComplete
  const descriptionGaps = useMemo(() => subjects.filter((subject) => !subject.description?.trim()).length, [subjects])
  const versionGaps = useMemo(() => subjects.filter((subject) => !subject.version?.trim()).length, [subjects])
  const descriptionPct = totalSubjects ? Math.round(((totalSubjects - descriptionGaps) / totalSubjects) * 100) : 0
  const versionPct = totalSubjects ? Math.round(((totalSubjects - versionGaps) / totalSubjects) * 100) : 0

  const departmentSummary = useMemo(
    () =>
      departmentBreakdown.map(([department, count]) => ({
        department,
        subjects: count,
        coverage: totalSubjects ? Math.round((count / totalSubjects) * 100) : 0,
      })),
    [departmentBreakdown, totalSubjects]
  )

  const statsData = useMemo(
    () => [
      {
        label: 'Subjects catalogued',
        value: totalSubjects.toString(),
        detail: totalSubjects ? `${coreCount} core • ${electiveCount} elective` : 'Add your first subject',
        icon: BookOpen,
        color: 'text-blue-600',
      },
      {
        label: 'Levels covered',
        value: uniqueLevels.length.toString(),
        detail:
          uniqueLevels.length === 0
            ? 'No levels assigned yet'
            : `${uniqueLevels.slice(0, 3).join(' • ')}${uniqueLevels.length > 3 ? ` +${uniqueLevels.length - 3}` : ''}`,
        icon: Layers3,
        color: 'text-purple-600',
      },
      {
        label: 'Departments',
        value: departmentSummary.length.toString(),
        detail: departmentSummary[0] ? `Most: ${departmentSummary[0].department}` : 'No departments yet',
        icon: Sparkles,
        color: 'text-emerald-600',
      },
      {
        label: 'Resource readiness',
        value: `${resourceReadyPct}%`,
        detail: pendingResources > 0 ? `${pendingResources} pending updates` : 'All up to date',
        icon: AlertTriangle,
        color: pendingResources > 0 ? 'text-rose-600' : 'text-gray-500',
      },
    ],
    [totalSubjects, coreCount, electiveCount, uniqueLevels, departmentSummary, resourceReadyPct, pendingResources]
  )

  const qualityMetrics = useMemo(
    () => [
      { label: 'Descriptions added', value: descriptionPct, color: 'bg-red-500' },
      { label: 'Version tracking', value: versionPct, color: 'bg-emerald-500' },
      { label: 'Resource readiness', value: resourceReadyPct, color: 'bg-amber-500' },
    ],
    [descriptionPct, versionPct, resourceReadyPct]
  )

  const filteredSubjects = useMemo(() => {
    const byDepartment = activeDepartment === 'All'
      ? subjects
      : subjects.filter((subject) => subject.department === activeDepartment)

    if (!searchTerm.trim()) {
      return byDepartment
    }

    const query = searchTerm.toLowerCase()
    return byDepartment.filter(
      (subject) =>
        subject.name.toLowerCase().includes(query) ||
        subject.code.toLowerCase().includes(query)
    )
  }, [activeDepartment, subjects, searchTerm])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const res = await tenantApiGet('/api/tenant/academics/subjects')
      if (res.ok) {
        const data = await res.json()
        setSubjects(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const handleAddSubject = async () => {
    if (!newSubject.code || !newSubject.name || newSubject.levels.length === 0) {
      toast({ title: 'Validation error', description: 'Please fill in all required fields: Subject Code, Name, and Levels.', variant: 'destructive' });
      return;
    }

    try {
      const res = await tenantApiPost('/api/tenant/academics/subjects', newSubject);

      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Subject added', description: `"${newSubject.name}" (${newSubject.code}) added to ${newSubject.department} department.` });
        fetchSubjects();
        setNewSubject({
          code: '',
          name: '',
          levels: [],
          type: 'Core',
          department: 'Sciences',
          description: ''
        });
        setAddSubjectOpen(false);
      } else {
        const errorData = await res.json();
        toast({ title: 'Error adding subject', description: errorData.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({ title: 'Network error', description: 'Error adding subject. Please try again.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Curriculum registry</p>
          <h1 className="text-2xl font-bold text-gray-900">Subjects catalog</h1>
          <p className="text-sm text-gray-600">Control core and elective subjects, curriculum versions, and resources.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast({ title: 'Advanced filters', description: 'Use the department pills and search below to filter subjects.' })}>
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>
          <Button variant="outline" onClick={() => {
            if (subjects.length === 0) { toast({ title: 'No subjects to export', variant: 'destructive' }); return }
            const headers = ['Code', 'Name', 'Levels', 'Type', 'Department', 'Version', 'Owner', 'Last Audit', 'Resources Status']
            const rows = filteredSubjects.map(s => [
              s.code, s.name, (s.levels || []).join('; '), s.type, s.department, s.version || '', s.owner || '', s.auditDate || '', s.resourcesStatus || ''
            ])
            const escapeCsv = (val: string) => {
              if (val.includes(',') || val.includes('"') || val.includes('\n')) return `"${val.replace(/"/g, '""')}"`
              return val
            }
            const csv = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `subjects_catalog_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
            <DialogTrigger asChild>
              <Button>
                <GraduationCap className="h-4 w-4 mr-2" /> Add subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>
                  Add a new subject to the curriculum catalog.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject-code">Subject Code</Label>
                  <Input
                    id="subject-code"
                    placeholder="e.g., MAT-101"
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject-name">Subject Name</Label>
                  <Input
                    id="subject-name"
                    placeholder="e.g., Mathematics"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Levels *</Label>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                    {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((level) => (
                      <label key={level} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition text-xs sm:text-sm">
                        <input
                          type="checkbox"
                          checked={newSubject.levels.includes(level)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSubject({ ...newSubject, levels: [...newSubject.levels, level] })
                            } else {
                              setNewSubject({ ...newSubject, levels: newSubject.levels.filter(l => l !== level) })
                            }
                          }}
                          className="w-4 h-4 shrink-0"
                        />
                        <span className="truncate">{level}</span>
                      </label>
                    ))}
                  </div>
                  {newSubject.levels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {newSubject.levels.map((level) => (
                        <Badge key={level} variant="secondary" className="text-xs">
                          {level}
                          <button
                            type="button"
                            onClick={() => setNewSubject({ ...newSubject, levels: newSubject.levels.filter(l => l !== level) })}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject-type">Type</Label>
                    <Select value={newSubject.type} onValueChange={(value: 'Core' | 'Elective') => setNewSubject({ ...newSubject, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Core">Core</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject-department">Department</Label>
                    <Select value={newSubject.department} onValueChange={(value) => setNewSubject({ ...newSubject, department: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sciences">Sciences</SelectItem>
                        <SelectItem value="Humanities">Humanities</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Languages">Languages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject-description">Description (Optional)</Label>
                  <Textarea
                    id="subject-description"
                    placeholder="Brief description of the subject"
                    value={newSubject.description}
                    onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2 flex-col-reverse sm:flex-row">
                <Button variant="outline" onClick={() => setAddSubjectOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleAddSubject} disabled={!newSubject.code || !newSubject.name || newSubject.levels.length === 0} className="w-full sm:w-auto">
                  Add Subject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 space-y-2">
                <div className={`rounded-full bg-gray-50 w-10 h-10 flex items-center justify-center ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.detail}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department coverage</CardTitle>
            <CardDescription>Ownership and completion signals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {departmentSummary.length === 0 && (
              <p className="text-sm text-gray-500">Add subjects to see department distribution.</p>
            )}
            {departmentSummary.map((dept) => (
              <div key={dept.department} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{dept.department}</p>
                  <p className="text-xs text-gray-500">{dept.subjects} subject{dept.subjects === 1 ? '' : 's'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{dept.coverage}%</p>
                  <p className="text-[11px] uppercase tracking-wide text-red-500">of catalog</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality controls</CardTitle>
            <CardDescription>Live signals based on stored subject metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qualityMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{metric.label}</span>
                  <span>{metric.value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <div className={`h-2 rounded-full ${metric.color}`} style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
            {totalSubjects === 0 && (
              <p className="text-xs text-gray-400">Metrics will populate once subjects are added.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subjects directory</CardTitle>
          <CardDescription>Track versions, delivery levels, and resource readiness.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              placeholder="Search by subject name or code"
              className="lg:w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 text-xs">
              {departmentFilters.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setActiveDepartment(dept)}
                  className={`px-3 py-1 rounded-full border transition ${
                    activeDepartment === dept ? 'border-red-500 bg-red-50 text-red-700 font-medium' : 'border-transparent bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Levels</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last audit</TableHead>
                  <TableHead>Resources</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-gray-500">
                      {loading ? 'Loading subjects…' : 'No subjects match the current filters.'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredSubjects.map((subject) => (
                  <TableRow key={subject.id || subject.code}>
                    <TableCell className="font-semibold text-gray-900">{subject.code}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(subject.levels || []).map((level) => (
                          <Badge key={level} variant="outline" className="text-xs">
                            {level}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={subject.type === 'Core' ? 'secondary' : 'outline'} className="text-xs">
                        {subject.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{subject.version || '-'}</TableCell>
                    <TableCell>{subject.owner || '-'}</TableCell>
                    <TableCell>{subject.auditDate || '-'}</TableCell>
                    <TableCell className={subject.resourcesStatus === 'Upload' ? 'text-rose-600 font-semibold' : ''}>
                      <div className="flex items-center gap-2">
                        <span>{subject.resourcesStatus || 'Pending'}</span>
                        {subject.resourcesStatus === 'Upload' && (
                          <Button size="sm" variant="outline" className="text-[11px] h-6" onClick={() => toast({ title: 'Asset request sent', description: `Notification sent to subject owner for ${subject.name}.` })}>
                            Request assets
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default SubjectsCatalog;
