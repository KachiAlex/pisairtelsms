import React, { useState, useEffect, useCallback } from 'react'
import { Download, Printer, AlertCircle, Loader2, Grid, Search } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useToast } from '../ui/use-toast'
import { tenantApiGet } from '../../lib/tenantApi'

interface SubjectEntry {
  score: number
  grade: string
  position: number
  remark: string
}

interface BroadsheetStudent {
  studentId: string
  studentName: string
  classPosition: number
  totalStudents: number
  overallTotal: number
  overallAverage: number
  attendancePercent: number
  subjects: Record<string, SubjectEntry>
}

interface BroadsheetData {
  className: string
  academicSession: string
  term: string
  subjects: string[]
  students: BroadsheetStudent[]
  statusBreakdown: Record<string, number>
}

const gradeColor = (grade: string) => {
  if (grade.startsWith('A')) return 'text-green-700 bg-green-50'
  if (grade.startsWith('B')) return 'text-blue-700 bg-blue-50'
  if (grade.startsWith('C')) return 'text-amber-700 bg-amber-50'
  if (grade.startsWith('D') || grade.startsWith('E')) return 'text-orange-700 bg-orange-50'
  return 'text-red-700 bg-red-50'
}

export function Broadsheets() {
  const { toast } = useToast()

  const [academicSession, setAcademicSession] = useState('')
  const [term, setTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [data, setData] = useState<BroadsheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const currentYear = new Date().getFullYear()
  const defaultSession = `${currentYear}/${currentYear + 1}`

  useEffect(() => {
    setAcademicSession(defaultSession)
    setTerm('First Term')
  }, [])

  const loadBroadsheet = useCallback(async () => {
    if (!academicSession || !term || !selectedClass) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        action: 'broadsheet',
        academicSession,
        term,
        class: selectedClass,
      })
      const res = await tenantApiGet(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
      } else if (res.status === 404) {
        setData(null)
        setError('No compiled results found for this class/term. Run Result Computation first to generate broadsheet data.')
      } else {
        setData(null)
        setError('Failed to load broadsheet data.')
      }
    } catch {
      setData(null)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [academicSession, term, selectedClass])

  useEffect(() => {
    if (academicSession && term && selectedClass) loadBroadsheet()
  }, [academicSession, term, selectedClass, loadBroadsheet])

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!data || data.students.length === 0) return
    const headers = ['Position', 'Student ID', 'Name', ...data.subjects, 'Total', 'Average', 'Attendance %']
    const rows = data.students.map(s => {
      const scores = data.subjects.map(subj => {
        const entry = s.subjects[subj]
        return entry ? String(entry.score) : '-'
      })
      return [String(s.classPosition), s.studentId, s.studentName, ...scores, String(s.overallTotal), String(s.overallAverage), String(s.attendancePercent)]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `broadsheet_${selectedClass}_${term}_${academicSession}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'CSV exported', description: `${data.students.length} students exported.` })
  }

  const filteredStudents = data
    ? data.students.filter(s =>
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const totalStudents = data?.students.length ?? 0
  const compiledCount = data?.statusBreakdown['compiled'] ?? 0
  const approvedCount = data?.statusBreakdown['approved'] ?? 0
  const publishedCount = data?.statusBreakdown['published'] ?? 0
  const subjectCount = data?.subjects.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Academic intelligence</p>
          <h1 className="text-2xl font-bold text-gray-900">Broadsheets</h1>
          <p className="text-sm text-gray-600">View class rankings, subject performance, and export printable grids.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportCSV} disabled={!data || data.students.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={handlePrint} disabled={!data || data.students.length === 0}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Select Broadsheet</CardTitle>
          <CardDescription>Choose academic session, term, and class to view the broadsheet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Academic Session</Label>
              <Input value={academicSession} onChange={e => setAcademicSession(e.target.value)} placeholder="2025/2026" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Class</Label>
              <Input value={selectedClass} onChange={e => setSelectedClass(e.target.value)} placeholder="e.g. JSS 2A" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && !loading && (
        <Alert className="print:hidden">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500 print:hidden">
          <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading broadsheet...
        </div>
      )}

      {/* Empty state - no class selected */}
      {!loading && !error && !data && !selectedClass && (
        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Grid className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500">Select a class, session, and term above to view the broadsheet.</p>
          </CardContent>
        </Card>
      )}

      {/* Broadsheet data */}
      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Students</p>
                <p className="text-3xl font-semibold text-gray-900">{totalStudents}</p>
                <p className="text-xs text-gray-500">In {selectedClass}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Subjects</p>
                <p className="text-3xl font-semibold text-gray-900">{subjectCount}</p>
                <p className="text-xs text-gray-500">{term} {academicSession}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Compiled</p>
                <p className="text-3xl font-semibold text-blue-600">{compiledCount}</p>
                <p className="text-xs text-gray-500">Subject entries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {approvedCount > 0 && <Badge variant="default">{approvedCount} approved</Badge>}
                  {publishedCount > 0 && <Badge variant="default">{publishedCount} published</Badge>}
                  {compiledCount > 0 && <Badge variant="secondary">{compiledCount} compiled</Badge>}
                  {approvedCount === 0 && publishedCount === 0 && compiledCount === 0 && (
                    <span className="text-sm text-gray-400">No data</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Print header (only visible when printing) */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">Broadsheet — {selectedClass}</h1>
            <p className="text-sm">{term} {academicSession}</p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 print:hidden">
            <div className="relative flex-1 max-w-xs">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search student..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-gray-500">{filteredStudents.length} of {totalStudents} students</p>
          </div>

          {/* Broadsheet grid */}
          <Card>
            <CardHeader className="print:hidden">
              <CardTitle>Broadsheet — {selectedClass}</CardTitle>
              <CardDescription>
                {term} {academicSession} · {totalStudents} students · {subjectCount} subjects
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10 min-w-[40px]">Pos</TableHead>
                    <TableHead className="sticky left-0 bg-white z-10 min-w-[160px]">Student</TableHead>
                    {data.subjects.map(subj => (
                      <TableHead key={subj} className="text-center min-w-[80px]">{subj}</TableHead>
                    ))}
                    <TableHead className="text-center font-semibold">Total</TableHead>
                    <TableHead className="text-center font-semibold">Avg</TableHead>
                    <TableHead className="text-center">Attend %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={data.subjects.length + 5} className="text-center text-gray-500 py-8">
                        No students found matching "{searchQuery}"
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.studentId} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900 sticky left-0 bg-white">{student.classPosition}</TableCell>
                        <TableCell className="font-medium text-gray-900 sticky left-0 bg-white">
                          {student.studentName}
                          <p className="text-xs text-gray-400">{student.studentId}</p>
                        </TableCell>
                        {data.subjects.map(subj => {
                          const entry = student.subjects[subj]
                          if (!entry) {
                            return <TableCell key={subj} className="text-center text-gray-300">-</TableCell>
                          }
                          return (
                            <TableCell key={subj} className="text-center">
                              <span className="font-medium text-gray-700">{entry.score}</span>
                              <span className={`ml-1 inline-block rounded px-1 text-xs ${gradeColor(entry.grade)}`}>{entry.grade}</span>
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-center font-semibold text-gray-900">{student.overallTotal}</TableCell>
                        <TableCell className="text-center font-semibold text-gray-900">{student.overallAverage}</TableCell>
                        <TableCell className="text-center text-gray-600">{student.attendancePercent}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top performers */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Top 5 students by overall average in {selectedClass}.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.slice(0, 5).map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium text-gray-900">#{student.classPosition}</TableCell>
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell className="font-semibold">{student.overallTotal}</TableCell>
                      <TableCell className="font-semibold">{student.overallAverage}</TableCell>
                      <TableCell>{student.attendancePercent}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default Broadsheets;
