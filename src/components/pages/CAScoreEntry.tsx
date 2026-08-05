import React, { useState, useEffect, useCallback } from 'react'
import { Save, Send, CheckCircle2, AlertCircle, RefreshCw, Users, Loader2, CalendarCheck } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ClassArmSelect } from '../ui/class-arm-select'
import { useTenant } from '../../contexts/TenantContext'
import { useToast } from '../ui/use-toast'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'

interface SubjectItem { id: string; name: string }
interface StudentScore {
  id: string; studentId: string; subject: string; academicSession: string; term: string
  caScore: number; examScore: number; totalScore: number; attendancePercentage: number
  class: string; testsScore: number | null; assignmentsScore: number | null
  projectsScore: number | null; examsScore: number | null
  submittedBy: string | null; submittedByName: string | null
  submissionStatus: 'draft' | 'submitted' | 'approved'
  createdAt: string; updatedAt: string
}
interface TeacherSubmission {
  submittedBy: string; submittedByName: string; subject: string
  class: string; status: string; updatedAt: string
}
interface ScoreInput {
  studentId: string; testsScore: string; assignmentsScore: string
  projectsScore: string; examsScore: string; attendance: string
}

export function CAScoreEntry() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [academicSession, setAcademicSession] = useState('')
  const [term, setTerm] = useState('')
  const [existingScores, setExistingScores] = useState<StudentScore[]>([])
  const [scoreInputs, setScoreInputs] = useState<Record<string, ScoreInput>>({})
  const [teacherSubmissions, setTeacherSubmissions] = useState<TeacherSubmission[]>([])
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [loadingScores, setLoadingScores] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [autoFillingAttendance, setAutoFillingAttendance] = useState(false)
  const [autoFilledStudents, setAutoFilledStudents] = useState<Set<string>>(new Set())

  const currentYear = new Date().getFullYear()
  const defaultSession = `${currentYear}/${currentYear + 1}`

  useEffect(() => {
    setAcademicSession(defaultSession)
    setTerm('First Term')
  }, [])

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    try {
      const subjectRes = await tenantApiGet('/api/tenant/academics/subjects')
      if (subjectRes.ok) {
        const data = await subjectRes.json()
        setSubjects(data.data || data.subjects || [])
      }
    } catch { /* silent */ } finally {
      setLoadingMeta(false)
    }
  }, [])

  useEffect(() => { loadMeta() }, [loadMeta])

  const loadScores = useCallback(async () => {
    if (!selectedClass || !selectedSubject || !academicSession || !term) return
    setLoadingScores(true)
    try {
      const res = await tenantApiGet(
        `/api/tenant/results?action=class-scores&class=${encodeURIComponent(selectedClass)}&subject=${encodeURIComponent(selectedSubject)}&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}`
      )
      if (res.ok) {
        const data = await res.json()
        setExistingScores(data.data || [])
      }
    } catch { /* silent */ } finally {
      setLoadingScores(false)
    }
  }, [selectedClass, selectedSubject, academicSession, term])

  useEffect(() => {
    if (selectedClass && selectedSubject && academicSession && term) loadScores()
  }, [selectedClass, selectedSubject, academicSession, term, loadScores])

  const loadSubmissions = useCallback(async () => {
    if (!academicSession || !term) return
    setLoadingSubmissions(true)
    try {
      const res = await tenantApiGet(
        `/api/tenant/results?action=teacher-submissions&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}`
      )
      if (res.ok) {
        const data = await res.json()
        setTeacherSubmissions(data.data || [])
      }
    } catch { /* silent */ } finally {
      setLoadingSubmissions(false)
    }
  }, [academicSession, term])

  useEffect(() => { loadSubmissions() }, [loadSubmissions])

  useEffect(() => {
    const inputs: Record<string, ScoreInput> = {}
    for (const score of existingScores) {
      inputs[score.studentId] = {
        studentId: score.studentId,
        testsScore: score.testsScore?.toString() || '',
        assignmentsScore: score.assignmentsScore?.toString() || '',
        projectsScore: score.projectsScore?.toString() || '',
        examsScore: score.examsScore?.toString() || '',
        attendance: score.attendancePercentage?.toString() || '',
      }
    }
    setScoreInputs(inputs)
  }, [existingScores])

  const handleScoreChange = (studentId: string, field: keyof ScoreInput, value: string) => {
    setScoreInputs(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  const handleAddStudent = () => {
    const studentId = prompt('Enter student ID:')
    if (!studentId || scoreInputs[studentId]) return
    setScoreInputs(prev => ({
      ...prev,
      [studentId]: { studentId, testsScore: '', assignmentsScore: '', projectsScore: '', examsScore: '', attendance: '' },
    }))
  }

  const handleSaveScore = async (studentId: string, status: 'draft' | 'submitted') => {
    const input = scoreInputs[studentId]
    if (!input) return
    setSaving(true)
    try {
      const res = await tenantApiPost('/api/tenant/results', {
        studentId, subject: selectedSubject, academicSession, term, class: selectedClass,
        attendancePercentage: input.attendance ? Number(input.attendance) : 0,
        testsScore: input.testsScore ? Number(input.testsScore) : 0,
        assignmentsScore: input.assignmentsScore ? Number(input.assignmentsScore) : 0,
        projectsScore: input.projectsScore ? Number(input.projectsScore) : 0,
        examsScore: input.examsScore ? Number(input.examsScore) : 0,
        submissionStatus: status,
      })
      if (res.ok) {
        toast({ title: status === 'draft' ? 'Draft saved' : 'Score submitted',
          description: `Scores for ${studentId} have been ${status === 'draft' ? 'saved as draft' : 'submitted'}.` })
        loadScores(); loadSubmissions()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data.error || 'Failed to save score', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleSaveAll = async () => {
    const studentIds = Object.keys(scoreInputs)
    if (studentIds.length === 0) {
      toast({ title: 'No scores to save', description: 'Add students first.', variant: 'destructive' })
      return
    }
    setSaving(true)
    let success = 0, failed = 0
    for (const studentId of studentIds) {
      const input = scoreInputs[studentId]
      try {
        const res = await tenantApiPost('/api/tenant/results', {
          studentId, subject: selectedSubject, academicSession, term, class: selectedClass,
          attendancePercentage: input.attendance ? Number(input.attendance) : 0,
          testsScore: input.testsScore ? Number(input.testsScore) : 0,
          assignmentsScore: input.assignmentsScore ? Number(input.assignmentsScore) : 0,
          projectsScore: input.projectsScore ? Number(input.projectsScore) : 0,
          examsScore: input.examsScore ? Number(input.examsScore) : 0,
          submissionStatus: 'submitted',
        })
        if (res.ok) success++; else failed++
      } catch { failed++ }
    }
    setSaving(false)
    toast({ title: 'Batch save complete',
      description: `${success} saved successfully${failed > 0 ? `, ${failed} failed` : ''}.`,
      variant: failed > 0 ? 'destructive' : 'default' })
    loadScores(); loadSubmissions()
  }

  const handleAutoFillAttendance = async () => {
    if (!selectedClass || !academicSession || !term) return
    setAutoFillingAttendance(true)
    try {
      const res = await tenantApiGet(
        `/api/tenant/results?action=attendance-batch&class=${encodeURIComponent(selectedClass)}&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}`
      )
      if (res.ok) {
        const data = await res.json()
        const attendanceMap: Record<string, number> = data.data || {}
        setScoreInputs(prev => {
          const updated = { ...prev }
          const filled = new Set<string>()
          for (const [studentId, pct] of Object.entries(attendanceMap)) {
            if (updated[studentId]) {
              updated[studentId] = { ...updated[studentId], attendance: String(pct) }
              filled.add(studentId)
            }
          }
          setAutoFilledStudents(filled)
          return updated
        })
        const count = Object.keys(attendanceMap).length
        toast({
          title: 'Attendance auto-filled',
          description: count > 0
            ? `${count} student(s) attendance populated from records. You can still edit individual values.`
            : 'No attendance records found for this class/term. Values left unchanged.',
        })
      } else {
        toast({ title: 'Error', description: 'Failed to fetch attendance data', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setAutoFillingAttendance(false)
    }
  }

  const submittedCount = teacherSubmissions.length
  const draftCount = teacherSubmissions.filter(s => s.status === 'draft').length

  const statusBadge = (status: string) => {
    if (status === 'submitted') return <Badge variant="default">Submitted</Badge>
    if (status === 'draft') return <Badge variant="secondary">Draft</Badge>
    if (status === 'approved') return <Badge variant="default">Approved</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Continuous assessment</p>
          <h1 className="text-2xl font-bold text-gray-900">CA Score Entry</h1>
          <p className="text-sm text-gray-600">Enter and manage student CA scores by assessment type. Weights are applied from CA Configuration.</p>
        </div>
        <Button variant="outline" onClick={loadSubmissions} disabled={loadingSubmissions}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingSubmissions ? 'animate-spin' : ''}`} /> Refresh submissions
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Teacher submissions</p>
          <p className="text-3xl font-semibold text-gray-900">{submittedCount}</p>
          <p className="text-xs text-gray-500">Across all classes this term</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Draft entries</p>
          <p className="text-3xl font-semibold text-amber-600">{draftCount}</p>
          <p className="text-xs text-gray-500">Awaiting final submission</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Classes available</p>
          <p className="text-3xl font-semibold text-gray-900">{classes.length}</p>
          <p className="text-xs text-gray-500">{subjects.length} subjects</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Current term</p>
          <p className="text-3xl font-semibold text-gray-900">{term || '—'}</p>
          <p className="text-xs text-gray-500">{academicSession || '—'}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Entry</CardTitle>
          <CardDescription>Select a class and subject to enter or edit student scores. Total is computed using CA Configuration weights.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Class</Label>
              <ClassArmSelect value={selectedClass} onChange={setSelectedClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {loadingMeta && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading classes and subjects...
            </div>
          )}

          {!loadingMeta && !selectedClass && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Select a class and subject to begin entering scores.</AlertDescription>
            </Alert>
          )}

          {selectedClass && selectedSubject && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {loadingScores ? 'Loading scores...' : `${Object.keys(scoreInputs).length} students`}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddStudent}>Add student</Button>
                  <Button variant="outline" size="sm" onClick={handleAutoFillAttendance} disabled={autoFillingAttendance || !selectedClass || !academicSession || !term}>
                    {autoFillingAttendance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarCheck className="h-4 w-4 mr-2" />}
                    Auto-fill Attendance
                  </Button>
                  <Button size="sm" onClick={handleSaveAll} disabled={saving || Object.keys(scoreInputs).length === 0}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save & Submit All
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="w-20">Tests</TableHead>
                      <TableHead className="w-20">Assignments</TableHead>
                      <TableHead className="w-20">Projects</TableHead>
                      <TableHead className="w-20">Exams</TableHead>
                      <TableHead className="w-20">Attend %</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(scoreInputs).map((input) => {
                      const existing = existingScores.find(s => s.studentId === input.studentId)
                      return (
                        <TableRow key={input.studentId}>
                          <TableCell className="font-medium text-gray-900">
                            {input.studentId}
                            {existing && <span className="ml-2 text-xs text-gray-400">(total: {existing.totalScore})</span>}
                          </TableCell>
                          <TableCell><Input type="number" min="0" max="100" className="w-16 h-8" value={input.testsScore} onChange={e => handleScoreChange(input.studentId, 'testsScore', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" min="0" max="100" className="w-16 h-8" value={input.assignmentsScore} onChange={e => handleScoreChange(input.studentId, 'assignmentsScore', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" min="0" max="100" className="w-16 h-8" value={input.projectsScore} onChange={e => handleScoreChange(input.studentId, 'projectsScore', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" min="0" max="100" className="w-16 h-8" value={input.examsScore} onChange={e => handleScoreChange(input.studentId, 'examsScore', e.target.value)} /></TableCell>
                          <TableCell>
                            <div className="relative">
                              <Input type="number" min="0" max="100" className="w-16 h-8" value={input.attendance} onChange={e => handleScoreChange(input.studentId, 'attendance', e.target.value)} />
                              {autoFilledStudents.has(input.studentId) && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" title="Auto-filled from attendance records" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleSaveScore(input.studentId, 'draft')} disabled={saving} title="Save as draft"><Save className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleSaveScore(input.studentId, 'submitted')} disabled={saving} title="Submit score"><Send className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Scores are weighted using the published CA Configuration. Total = (Tests x weight% + Assignments x weight% + Projects x weight% + Exams x weight%) / 100.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teacher Submission Feed</CardTitle>
          <CardDescription>Track which teachers have submitted scores across classes and subjects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSubmissions ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading submissions...
            </div>
          ) : teacherSubmissions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No teacher submissions yet for {term} {academicSession}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherSubmissions.map((sub, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900">{sub.submittedByName || sub.submittedBy}</TableCell>
                      <TableCell>{sub.subject}</TableCell>
                      <TableCell>{sub.class}</TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(sub.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default CAScoreEntry;
