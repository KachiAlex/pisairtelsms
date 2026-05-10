import React, { useMemo, useState, useEffect } from 'react'
import { BookOpen, GraduationCap, Layers3, Filter, Download, Sparkles, AlertTriangle, Plus, X } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { tenantApiFetch } from '../../lib/tenantApi'

const subjectStats = [
  { label: 'Subjects catalogued', value: '74', detail: '52 core • 22 elective', icon: BookOpen, color: 'text-blue-600' },
  { label: 'Curriculum versions', value: '4', detail: 'Last review Jan 2026', icon: Layers3, color: 'text-purple-600' },
  { label: 'Digital resources', value: '89%', detail: '61 subjects synced', icon: Sparkles, color: 'text-emerald-600' },
  { label: 'Pending QA flags', value: '3', detail: 'Scheme of work upload missing', icon: AlertTriangle, color: 'text-rose-600' },
]

const departmentSummary = [
  { department: 'Sciences', subjects: 14, coverage: '96%', owner: 'Dr. Olajumoke', priority: 'High' },
  { department: 'Humanities', subjects: 12, coverage: '88%', owner: 'Mr. Eze', priority: 'Medium' },
  { department: 'Commercial', subjects: 9, coverage: '92%', owner: 'Mrs. Bello', priority: 'Low' },
  { department: 'Languages', subjects: 11, coverage: '84%', owner: 'Ms. Iboroma', priority: 'Medium' },
]

const departmentFilters = ['All', 'Sciences', 'Humanities', 'Commercial', 'Languages']

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
  const [activeDepartment, setActiveDepartment] = useState('All')
  const [addSubjectOpen, setAddSubjectOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [newSubject, setNewSubject] = useState({
    code: '',
    name: '',
    levels: [] as string[],
    type: 'Core' as 'Core' | 'Elective',
    department: 'Sciences',
    description: ''
  })

  const filteredSubjects = useMemo(() =>
    activeDepartment === 'All' ? subjects : subjects.filter((subject) => subject.department === activeDepartment),
    [activeDepartment, subjects])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const res = await tenantApiFetch('/api/tenant/cbt/subjects')
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
      alert('Please fill in all required fields: Subject Code, Name, and Levels.');
      return;
    }

    try {
      const res = await tenantApiFetch('/api/tenant/cbt/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubject),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Subject "${newSubject.name}" (${newSubject.code}) added successfully to ${newSubject.department} department!`);
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
        alert(`Error adding subject: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Error adding subject. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Curriculum registry</p>
          <h1 className="text-2xl font-bold text-gray-900">Subjects catalog</h1>
          <p className="text-sm text-gray-600">Control core and elective subjects, curriculum versions, and resources.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => alert('Advanced filtering functionality - would open filter dialog')}>
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>
          <Button variant="outline" onClick={() => alert('Export CSV functionality - would download subjects catalog')}>
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
                        <SelectValue placeholder="Select type" />
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
                        <SelectValue placeholder="Select department" />
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
        {subjectStats.map((stat) => {
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
            {departmentSummary.map((dept) => (
              <div key={dept.department} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{dept.department}</p>
                  <p className="text-xs text-gray-500">{dept.subjects} subjects • Lead: {dept.owner}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{dept.coverage}</p>
                  <p className="text-[11px] uppercase tracking-wide text-blue-500">Priority: {dept.priority}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality controls</CardTitle>
            <CardDescription>Automated checks across resources and compliance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Scheme of work uploads</span>
                <span>92%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: '92%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Exam blueprint alignment</span>
                <span>87%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: '87%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Content freshness</span>
                <span>71%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: '71%' }} />
              </div>
            </div>
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
            <Input placeholder="Search by subject name or code" className="lg:w-72" />
            <div className="flex flex-wrap gap-2 text-xs">
              {departmentFilters.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setActiveDepartment(dept)}
                  className={`px-3 py-1 rounded-full border transition ${
                    activeDepartment === dept ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-transparent bg-gray-100 text-gray-600 hover:text-gray-900'
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
                {filteredSubjects.map((subject) => (
                  <TableRow key={subject.code}>
                    <TableCell className="font-semibold text-gray-900">{subject.code}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subject.levels.map((level) => (
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
                          <Button size="sm" variant="outline" className="text-[11px] h-6" onClick={() => alert(`Requesting assets for ${subject.name} - would send notification to subject owner`)}>
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
