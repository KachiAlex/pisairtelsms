import React, { useState, useMemo, useEffect, Suspense } from 'react'
import {
  Search,
  Filter,
  Download,
  UserPlus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Label } from '../ui/label'
import { BulkImportStudents } from './BulkImportStudents'
import { fetchStudents, createStudent, createStudents, updateStudent, deleteStudent, exportStudentsToCSV, type Student, type StudentPayload } from '../../lib/studentsClient'

export default function StudentsList() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [classFilter, setClassFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | Student['status']>('all')
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Add Student form state
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    admissionNo: '',
    gender: 'Male',
    class: 'JSS 1',
    arm: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  })

  // Edit Student form state
  const [editStudent, setEditStudent] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male',
    class: 'JSS 1',
    arm: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    status: 'Active' as const,
  })

  // Load students from database on component mount
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchStudents()
        setStudents(data)
      } catch (err) {
        console.error('Error loading students:', err)
        setError('Failed to load students. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [])

  const handleAddStudent = async () => {
    try {
      const studentPayload: StudentPayload = {
        name: `${newStudent.firstName} ${newStudent.lastName}`,
        class: newStudent.class,
        arm: newStudent.arm,
        gender: newStudent.gender,
        status: 'Active',
        guardian: newStudent.guardianName,
        phone: newStudent.guardianPhone,
        guardianEmail: newStudent.guardianEmail || undefined,
      }

      const createdStudent = await createStudent(studentPayload)

      // Add to local state
      setStudents(prev => [...prev, createdStudent])

      // Reset form and close dialog
      setNewStudent({
        firstName: '',
        lastName: '',
        admissionNo: '',
        gender: 'Male',
        class: 'JSS 1',
        arm: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
      })
      setIsAddDialogOpen(false)
    } catch (err) {
      console.error('Error adding student:', err)
      setError('Failed to add student. Please try again.')
    }
  }

  const handleBulkImport = async (importedStudents: StudentPayload[]) => {
    try {
      const createdStudents = await createStudents(importedStudents)
      setStudents(prev => [...prev, ...createdStudents])
    } catch (err) {
      console.error('Error importing students:', err)
      setError('Failed to import students. Please try again.')
    }
  }

  const handleEditStudent = (student: Student) => {
    const [firstName, ...lastNameParts] = student.name.split(' ')
    setEditStudent({
      firstName,
      lastName: lastNameParts.join(' '),
      gender: student.gender,
      class: student.class,
      arm: student.arm,
      guardianName: student.guardian,
      guardianPhone: student.phone,
      guardianEmail: student.guardianEmail || '',
      status: student.status,
    })
    setSelectedStudent(student)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedStudent) return

    try {
      setIsSaving(true)
      const updatedPayload: Partial<StudentPayload> = {
        name: `${editStudent.firstName} ${editStudent.lastName}`,
        gender: editStudent.gender,
        class: editStudent.class,
        arm: editStudent.arm,
        guardian: editStudent.guardianName,
        phone: editStudent.guardianPhone,
        guardianEmail: editStudent.guardianEmail || undefined,
        status: editStudent.status,
      }

      const updated = await updateStudent(selectedStudent.id, updatedPayload)
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s))
      setIsEditDialogOpen(false)
      setSelectedStudent(null)
    } catch (err) {
      console.error('Error updating student:', err)
      setError('Failed to update student. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteStudent = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      return
    }

    try {
      setIsDeleting(true)
      await deleteStudent(student.id)
      setStudents(prev => prev.filter(s => s.id !== student.id))
    } catch (err) {
      console.error('Error deleting student:', err)
      setError('Failed to delete student. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkExport = () => {
    exportStudentsToCSV(filteredStudents)
  }

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.guardian.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClass = classFilter === 'all' || student.class === classFilter
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter
      return matchesSearch && matchesClass && matchesStatus
    })
  }, [students, searchTerm, classFilter, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-700'
      case 'Suspended':
        return 'bg-amber-100 text-amber-700'
      case 'Graduated':
        return 'bg-slate-100 text-slate-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const atRiskStudents = students.filter((student) => student.status !== 'Active').slice(0, 3)
  const totalActive = students.filter((student) => student.status === 'Active').length
  const totalMale = students.filter((student) => student.gender === 'Male').length
  const totalFemale = students.filter((student) => student.gender === 'Female').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Lifecycle</p>
          <h1 className="text-2xl font-bold text-gray-900">Student management</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor admissions, wellbeing, and documents in one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleBulkExport}>
            <Download className="w-4 h-4 mr-2" />
            Bulk export
          </Button>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Students
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, admission no, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value as typeof classFilter)}
              >
                <option value="all">All classes</option>
                {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Graduated">Graduated</option>
              </select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Advanced filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total students</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{students.length}</p>
            <p className="text-xs text-gray-500 mt-1">{students.length > 0 ? 'Live data' : 'No data yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{totalActive}</p>
            <p className="text-xs text-emerald-600 mt-1">{students.length > 0 ? `${Math.round((totalActive / students.length) * 100)}% active` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Male</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{totalMale}</p>
            <p className="text-xs text-gray-500 mt-1">{students.length > 0 ? `${Math.round((totalMale / students.length) * 100)}% of total` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Female</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{totalFemale}</p>
            <p className="text-xs text-gray-500 mt-1">{students.length > 0 ? `${Math.round((totalFemale / students.length) * 100)}% of total` : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk + pipelines */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              At-risk queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRiskStudents.length === 0 && <p className="text-sm text-gray-500">No escalations at the moment.</p>}
            {atRiskStudents.map((student) => (
              <div key={student.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.class} {student.arm} • Guardian {student.guardian}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    Open profile
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-red-600" />
              Enrollment signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Active students</span>
              <span className="font-semibold text-gray-900">{totalActive}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Suspended</span>
              <span className="font-semibold text-gray-900">{students.filter(s => s.status === 'Suspended').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Graduated</span>
              <span className="font-semibold text-gray-900">{students.filter(s => s.status === 'Graduated').length}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2">
              View pipeline
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All students ({filteredStudents.length})</CardTitle>
            <p className="text-xs text-gray-500">Showing filtered results</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.admissionNo}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.class} {student.arm}</TableCell>
                    <TableCell>{student.gender}</TableCell>
                    <TableCell>{student.guardian}</TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedStudent(student)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteStudent(student)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Student Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Admission number</p>
                  <p className="font-semibold text-gray-900">{selectedStudent.admissionNo}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedStudent.status)}>{selectedStudent.status}</Badge>
                </div>
                <div className="rounded-2xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Class & arm</p>
                  <p className="font-semibold text-gray-900">
                    {selectedStudent.class} {selectedStudent.arm}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="font-semibold text-gray-900">{selectedStudent.gender}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Guardian contact</p>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" /> {selectedStudent.guardian}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" /> {selectedStudent.phone}
                </div>
                {selectedStudent.guardianEmail && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" /> {selectedStudent.guardianEmail}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Fill in the student details below. Admission number will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  placeholder="Enter first name"
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  placeholder="Enter last name"
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Admission Number</Label>
                <Input placeholder="Auto-generated" disabled />
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={newStudent.gender}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, gender: e.target.value }))}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <Label>Class</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={newStudent.class}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, class: e.target.value }))}
                >
                  <option>JSS 1</option>
                  <option>JSS 2</option>
                  <option>JSS 3</option>
                  <option>SS 1</option>
                  <option>SS 2</option>
                  <option>SS 3</option>
                </select>
              </div>
              <div>
                <Label>Arm</Label>
                <Input
                  list="arm-options"
                  placeholder="Enter arm (A, B, C, D, etc.)"
                  className="w-full"
                  value={newStudent.arm}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, arm: e.target.value }))}
                />
                <datalist id="arm-options">
                  <option value="A" />
                  <option value="B" />
                  <option value="C" />
                  <option value="D" />
                  <option value="E" />
                  <option value="F" />
                  <option value="G" />
                  <option value="H" />
                  <option value="I" />
                  <option value="J" />
                  <option value="K" />
                  <option value="L" />
                  <option value="M" />
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Start typing or select from suggestions. Any custom arm is allowed.
                </p>
              </div>
              <div>
                <Label>Guardian Name</Label>
                <Input
                  placeholder="Enter guardian name"
                  value={newStudent.guardianName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, guardianName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Guardian Phone</Label>
                <Input
                  placeholder="Enter phone number"
                  value={newStudent.guardianPhone}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, guardianPhone: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label>Guardian Email</Label>
                <Input
                  type="email"
                  placeholder="Enter guardian email (parent portal access will be sent here)"
                  value={newStudent.guardianEmail}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, guardianEmail: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  An invitation with parent portal access will be sent to this email.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleAddStudent}
              >
                Add Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isBulkImportOpen && (
        <Suspense fallback={null}>
          <BulkImportStudents
            open={isBulkImportOpen}
            onClose={() => setIsBulkImportOpen(false)}
            onImport={handleBulkImport}
            currentStudentCount={students.length}
          />
        </Suspense>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  placeholder="Enter first name"
                  value={editStudent.firstName}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  placeholder="Enter last name"
                  value={editStudent.lastName}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={editStudent.gender}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, gender: e.target.value }))}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={editStudent.status}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, status: e.target.value as any }))}
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>
              <div>
                <Label>Class</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={editStudent.class}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, class: e.target.value }))}
                >
                  <option>JSS 1</option>
                  <option>JSS 2</option>
                  <option>JSS 3</option>
                  <option>SS 1</option>
                  <option>SS 2</option>
                  <option>SS 3</option>
                </select>
              </div>
              <div>
                <Label>Arm</Label>
                <Input
                  list="arm-options"
                  placeholder="Enter arm (A, B, C, D, etc.)"
                  className="w-full"
                  value={editStudent.arm}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, arm: e.target.value }))}
                />
                <datalist id="arm-options">
                  <option value="A" />
                  <option value="B" />
                  <option value="C" />
                  <option value="D" />
                  <option value="E" />
                  <option value="F" />
                  <option value="G" />
                  <option value="H" />
                  <option value="I" />
                  <option value="J" />
                  <option value="K" />
                  <option value="L" />
                  <option value="M" />
                </datalist>
              </div>
              <div>
                <Label>Guardian Name</Label>
                <Input
                  placeholder="Enter guardian name"
                  value={editStudent.guardianName}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, guardianName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Guardian Phone</Label>
                <Input
                  placeholder="Enter phone number"
                  value={editStudent.guardianPhone}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, guardianPhone: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label>Guardian Email</Label>
                <Input
                  type="email"
                  placeholder="Enter guardian email"
                  value={editStudent.guardianEmail}
                  onChange={(e) => setEditStudent(prev => ({ ...prev, guardianEmail: e.target.value }))}
                />
                {!selectedStudent?.guardianEmail && editStudent.guardianEmail && (
                  <p className="text-xs text-red-600 mt-1">Saving will provision parent portal access and send an invite email.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
