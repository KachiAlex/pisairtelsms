import React, { useMemo, useState } from 'react'
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

const subjects = [
  { code: 'MAT-101', name: 'Mathematics', level: 'JSS 1-3', type: 'Core', teachers: 8, version: '2026.1', resources: 'Complete', owner: 'Dr. Olajumoke', audit: 'Jan 2026', department: 'Sciences' },
  { code: 'ENG-102', name: 'English Studies', level: 'JSS 1-3', type: 'Core', teachers: 7, version: '2025.4', resources: 'Complete', owner: 'Mr. Eze', audit: 'Dec 2025', department: 'Humanities' },
  { code: 'BSC-203', name: 'Basic Science', level: 'JSS 2-3', type: 'Core', teachers: 6, version: '2026.0', resources: 'Review', owner: 'Dr. Olajumoke', audit: 'Feb 2026', department: 'Sciences' },
  { code: 'BUS-411', name: 'Entrepreneurship', level: 'SS 1-3', type: 'Elective', teachers: 4, version: '2024.2', resources: 'Upload', owner: 'Mrs. Bello', audit: 'Oct 2025', department: 'Commercial' },
  { code: 'LAN-325', name: 'French Immersion', level: 'JSS 2-3', type: 'Elective', teachers: 3, version: '2026.0', resources: 'Complete', owner: 'Ms. Iboroma', audit: 'Jan 2026', department: 'Languages' },
  { code: 'ART-502', name: 'Fine Arts', level: 'SS 1-2', type: 'Elective', teachers: 2, version: '2025.2', resources: 'Review', owner: 'Mr. Eze', audit: 'Nov 2025', department: 'Humanities' },
]

const departmentFilters = ['All', 'Sciences', 'Humanities', 'Commercial', 'Languages']

export function SubjectsCatalog() {
  const [activeDepartment, setActiveDepartment] = useState('All')
  const [addSubjectOpen, setAddSubjectOpen] = useState(false)
  const [newSubject, setNewSubject] = useState({
    code: '',
    name: '',
    level: '',
    type: 'Core' as 'Core' | 'Elective',
    department: 'Sciences',
    description: ''
  })

  const filteredSubjects = useMemo(() =>
    activeDepartment === 'All' ? subjects : subjects.filter((subject) => subject.department === activeDepartment),
  [activeDepartment])

  const handleAddSubject = () => {
    if (!newSubject.code || !newSubject.name || !newSubject.level) {
      return // Basic validation
    }

    // Here you would typically save to backend
    console.log('Adding subject:', newSubject)

    // Reset form and close dialog
    setNewSubject({
      code: '',
      name: '',
      level: '',
      type: 'Core',
      department: 'Sciences',
      description: ''
    })
    setAddSubjectOpen(false)
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
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
            <DialogTrigger asChild>
              <Button>
                <GraduationCap className="h-4 w-4 mr-2" /> Add subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>
                  Add a new subject to the curriculum catalog.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                  <Label htmlFor="subject-level">Level</Label>
                  <Select value={newSubject.level} onValueChange={(value) => setNewSubject({ ...newSubject, level: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JSS 1-3">JSS 1-3</SelectItem>
                      <SelectItem value="JSS 1">JSS 1</SelectItem>
                      <SelectItem value="JSS 2">JSS 2</SelectItem>
                      <SelectItem value="JSS 3">JSS 3</SelectItem>
                      <SelectItem value="SS 1-3">SS 1-3</SelectItem>
                      <SelectItem value="SS 1">SS 1</SelectItem>
                      <SelectItem value="SS 2">SS 2</SelectItem>
                      <SelectItem value="SS 3">SS 3</SelectItem>
                      <SelectItem value="JSS 2-3">JSS 2-3</SelectItem>
                      <SelectItem value="SS 1-2">SS 1-2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddSubjectOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSubject} disabled={!newSubject.code || !newSubject.name || !newSubject.level}>
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
                  <TableHead>Teachers</TableHead>
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
                    <TableCell>{subject.level}</TableCell>
                    <TableCell>
                      <Badge variant={subject.type === 'Core' ? 'secondary' : 'outline'} className="text-xs">
                        {subject.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{subject.teachers}</TableCell>
                    <TableCell>{subject.version}</TableCell>
                    <TableCell>{subject.owner}</TableCell>
                    <TableCell>{subject.audit}</TableCell>
                    <TableCell className={subject.resources === 'Upload' ? 'text-rose-600 font-semibold' : ''}>
                      <div className="flex items-center gap-2">
                        <span>{subject.resources}</span>
                        {subject.resources === 'Upload' && (
                          <Button size="sm" variant="outline" className="text-[11px] h-6">Request assets</Button>
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
