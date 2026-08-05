import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Printer, AlertCircle, Loader2, ChevronDown, ChevronUp, TrendingUp, User } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useToast } from '../ui/use-toast'
import { tenantApiGet } from '../../lib/tenantApi'

interface ClassItem { id: string; name: string; arm?: string }
interface StudentItem { id: string; name: string; admissionNo?: string; class?: string }

interface SubjectResult {
  subject: string
  teacher: string
  caScore: number
  examScore: number
  totalScore: number
  testsScore: number
  assignmentsScore: number
  projectsScore: number
  examsScore: number
  grade: string
  remark: string
  classAverage: number
  highestScore: number
  lowestScore: number
  position: number
}

interface TermResult {
  term: string
  academicSession: string
  subjects: SubjectResult[]
  totalScore: number
  averageScore: number
  classPosition: string
  totalStudents: number
  attendancePercent: number
  conduct: string
  nextTermResumption: string
  principalComment: string
}

interface TranscriptData {
  student: { id: string; name: string; admissionNumber: string; class: string; arm: string; gender: string }
  sessions: TermResult[]
  cumulativeGPA: number
  totalSubjectsTaken: number
  caWeights?: { tests: number; assignments: number; projects: number; exams: number }
}

const gradeColors: Record<string, string> = {
  A1: 'text-green-700 bg-green-50',
  B2: 'text-blue-700 bg-blue-50',
  B3: 'text-blue-700 bg-blue-50',
  C4: 'text-amber-700 bg-amber-50',
  C5: 'text-amber-700 bg-amber-50',
  C6: 'text-amber-700 bg-amber-50',
  D7: 'text-orange-700 bg-orange-50',
  E8: 'text-red-700 bg-red-50',
  F9: 'text-red-800 bg-red-100',
}

function getGradeColor(grade: string): string {
  return gradeColors[grade] || 'text-gray-700 bg-gray-50'
}

export function Transcripts() {
  const { toast } = useToast()

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [data, setData] = useState<TranscriptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/classes')
      if (res.ok) {
        const json = await res.json()
        setClasses(json.data || json.classes || [])
      }
    } catch { /* silent */ }
  }

  const loadStudents = useCallback(async () => {
    if (!selectedClass) return
    try {
      const res = await tenantApiGet(`/api/tenant/students?class=${encodeURIComponent(selectedClass)}`)
      if (res.ok) {
        const json = await res.json()
        setStudents(json.data || [])
      }
    } catch { /* silent */ }
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass) loadStudents()
    else setStudents([])
    setSelectedStudent('')
  }, [selectedClass, loadStudents])

  const loadTranscript = useCallback(async () => {
    if (!selectedStudent) return
    setLoading(true)
    setError(null)
    try {
      const res = await tenantApiGet(`/api/tenant/transcript?studentId=${encodeURIComponent(selectedStudent)}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
        // Expand all terms by default
        const keys = (json.data?.sessions || []).map((s: TermResult) => `${s.term}|${s.academicSession}`)
        setExpandedTerms(new Set(keys))
      } else if (res.status === 404) {
        setData(null)
        setError('Student not found.')
      } else {
        setData(null)
        setError('Failed to load transcript.')
      }
    } catch {
      setData(null)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedStudent])

  useEffect(() => {
    if (selectedStudent) loadTranscript()
  }, [selectedStudent, loadTranscript])

  const toggleTerm = (key: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!data || data.sessions.length === 0) return
    const rows: string[][] = []
    rows.push(['Term', 'Session', 'Subject', 'CA Score', 'Exam Score', 'Total', 'Grade', 'Remark', 'Class Avg', 'Highest', 'Lowest', 'Position'])
    for (const session of data.sessions) {
      for (const subj of session.subjects) {
        rows.push([
          session.term, session.academicSession, subj.subject,
          String(subj.caScore), String(subj.examScore), String(subj.totalScore),
          subj.grade, subj.remark,
          String(Math.round(subj.classAverage)), String(subj.highestScore), String(subj.lowestScore),
          String(subj.position),
        ])
      }
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript_${data.student.name.replace(/\s+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'CSV exported', description: `${data.sessions.length} term(s) exported.` })
  }

  const classDisplayName = (c: ClassItem) => c.arm ? `${c.name} ${c.arm}` : c.name

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Records & transcripts</p>
          <h1 className="text-2xl font-bold text-gray-900">Transcripts</h1>
          <p className="text-sm text-gray-600">View and print student transcripts with full academic history.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportCSV} disabled={!data || data.sessions.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={handlePrint} disabled={!data}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Selectors */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
          <CardDescription>Choose a class and student to view their transcript.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={classDisplayName(c)}>{classDisplayName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass || students.length === 0}>
                <SelectTrigger><SelectValue placeholder={selectedClass ? (students.length === 0 ? 'No students found' : 'Select student') : 'Select a class first'} /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.admissionNo ? ` (${s.admissionNo})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && !loading && (
        <Alert className="print:hidden">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500 print:hidden">
          <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading transcript...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !data && !selectedStudent && (
        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500">Select a class and student above to view their transcript.</p>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!loading && !error && data && data.sessions.length === 0 && (
        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-amber-300 mb-3" />
            <p className="text-gray-500">No academic records found for this student. Ensure scores have been entered and compiled.</p>
          </CardContent>
        </Card>
      )}

      {/* Transcript data */}
      {!loading && data && data.sessions.length > 0 && (
        <>
          {/* Student info card */}
          <Card>
            <CardHeader className="print:hidden">
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{data.student.name}</p>
                    <p className="text-sm text-gray-500">Admission No: {data.student.admissionNumber || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-400">Class</p>
                    <p className="font-medium text-gray-900">{data.student.class || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Arm</p>
                    <p className="font-medium text-gray-900">{data.student.arm || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Gender</p>
                    <p className="font-medium text-gray-900">{data.student.gender || '—'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-400">Cumulative Average</p>
                  <p className="text-2xl font-bold text-gray-900">{data.cumulativeGPA}</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-400">Total Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">{data.totalSubjectsTaken}</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-400">Terms Recorded</p>
                  <p className="text-2xl font-bold text-gray-900">{data.sessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Print header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">Transcript — {data.student.name}</h1>
            <p className="text-sm">Admission No: {data.student.admissionNumber} · Class: {data.student.class} {data.student.arm}</p>
          </div>

          {/* Term-by-term results */}
          {data.sessions.map((session) => {
            const termKey = `${session.term}|${session.academicSession}`
            const expanded = expandedTerms.has(termKey)
            return (
              <Card key={termKey}>
                <CardHeader
                  className="cursor-pointer print:cursor-default"
                  onClick={() => toggleTerm(termKey)}
                >
                  <div className="flex items-center justify-between print:hidden">
                    <div>
                      <CardTitle className="text-lg">{session.term} — {session.academicSession}</CardTitle>
                      <CardDescription>
                        {session.subjects.length} subjects · Average: {session.averageScore} · Position: {session.classPosition || '—'} of {session.totalStudents}
                      </CardDescription>
                    </div>
                    {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="hidden print:block">
                    <CardTitle className="text-lg">{session.term} — {session.academicSession}</CardTitle>
                    <CardDescription>
                      {session.subjects.length} subjects · Average: {session.averageScore} · Position: {session.classPosition || '—'} of {session.totalStudents}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className={`overflow-x-auto ${expanded ? '' : 'hidden'} print:block`}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">CA</TableHead>
                          <TableHead className="text-center">Exam</TableHead>
                          <TableHead className="text-center font-semibold">Total</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-center">Position</TableHead>
                          <TableHead className="text-center">Class Avg</TableHead>
                          <TableHead>Remark</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {session.subjects.map((subj) => (
                          <TableRow key={subj.subject}>
                            <TableCell className="font-medium text-gray-900">
                              {subj.subject}
                              {subj.teacher && <p className="text-xs text-gray-400">{subj.teacher}</p>}
                            </TableCell>
                            <TableCell className="text-center text-gray-700">{subj.caScore}</TableCell>
                            <TableCell className="text-center text-gray-700">{subj.examScore}</TableCell>
                            <TableCell className="text-center font-semibold text-gray-900">{subj.totalScore}</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getGradeColor(subj.grade)}`}>
                                {subj.grade}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-gray-700">{subj.position}</TableCell>
                            <TableCell className="text-center text-gray-500">{Math.round(subj.classAverage)}</TableCell>
                            <TableCell className="text-sm text-gray-600">{subj.remark}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Term summary */}
                    <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-400">Total Score</p>
                        <p className="text-lg font-semibold text-gray-900">{session.totalScore}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-400">Average</p>
                        <p className="text-lg font-semibold text-gray-900">{session.averageScore}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-400">Attendance</p>
                        <p className="text-lg font-semibold text-gray-900">{session.attendancePercent}%</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-400">Conduct</p>
                        <p className="text-lg font-semibold text-gray-900">{session.conduct}</p>
                      </div>
                    </div>

                    {session.principalComment && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-600">Principal's Comment</p>
                        <p className="text-sm text-blue-900 mt-1">{session.principalComment}</p>
                      </div>
                    )}

                    {session.nextTermResumption && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                        <TrendingUp className="h-4 w-4" />
                        Next term resumption: <span className="font-medium text-gray-700">{session.nextTermResumption}</span>
                      </div>
                    )}
                  </CardContent>
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}

export default Transcripts;
