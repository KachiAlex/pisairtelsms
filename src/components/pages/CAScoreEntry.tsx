import React, { useState, useEffect, useCallback } from 'react'
import { Save, Send, CheckCircle2, AlertCircle, RefreshCw, Users, Loader2, CalendarCheck, Search } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { ClassArmSelect } from '../ui/class-arm-select'
import { useTenant } from '../../contexts/TenantContext'
import { useToast } from '../ui/use-toast'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'
import { useTimetableTerms } from '../../hooks/useTimetableTerms'
import { useAcademicPeriod } from '../../hooks/useAcademicPeriod'

interface SubjectItem { id: string; name: string }
interface StudentItem { id: string; name: string; admissionNo?: string }
interface StudentScore {
  id: string; studentId: string; subject: string; academicSession: string; term: string
  caScore: number; examScore: number; totalScore: number; attendancePercentage: number
  class: string; testsScore: number | null; assignmentsScore: number | null
  projectsScore: number | null; examsScore: number | null
  testsMax: number | null; assignmentsMax: number | null
  projectsMax: number | null; examsMax: number | null
  submittedBy: string | null; submittedByName: string | null
  submissionStatus: 'draft' | 'submitted' | 'approved'
  studentName?: string; admissionNo?: string
  createdAt: string; updatedAt: string
}
interface CAWeights { tests: number; assignments: number; projects: number; exams: number }
interface CAConfigShape { primary: CAWeights; jss: CAWeights; sss: CAWeights }
interface TeacherSubmission {
  submittedBy: string; submittedByName: string; subject: string
  class: string; status: string; updatedAt: string
}
interface ScoreInput {
  studentId: string; studentName: string; admissionNo?: string
  testsScore: string; assignmentsScore: string
  projectsScore: string; examsScore: string; attendance: string
}

export function CAScoreEntry() {
  const { tenantId } = useTenant()
  const { toast } = useToast()

  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [roster, setRoster] = useState<StudentItem[]>([])
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [caConfig, setCaConfig] = useState<CAConfigShape | null>(null)
  // "Marked out of" per component — defaults to 100 (i.e. raw = percentage,
  // same as before). Change to e.g. 20 when the test was marked out of 20.
  const [colMaxes, setColMaxes] = useState<CAWeights>({ tests: 100, assignments: 100, projects: 100, exams: 100 })

  const { session: resolvedSession, term: resolvedTerm } = useAcademicPeriod()
  const { termNames } = useTimetableTerms(term, academicSession || resolvedSession)

  useEffect(() => {
    if (!academicSession && resolvedSession) setAcademicSession(resolvedSession)
  }, [resolvedSession])

  useEffect(() => {
    if (!term && resolvedTerm) setTerm(resolvedTerm)
  }, [resolvedTerm])

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    try {
      const [subjectRes, caRes] = await Promise.all([
        tenantApiGet('/api/tenant/academics/subjects'),
        tenantApiGet('/api/tenant/ca-config').catch(() => null),
      ])
      if (subjectRes.ok) {
        const data = await subjectRes.json()
        setSubjects(data.data || data.subjects || [])
      }
      if (caRes && caRes.ok) {
        const data = await caRes.json()
        if (data.data?.published) setCaConfig(data.data.published)
      }
    } catch { /* silent */ } finally {
      setLoadingMeta(false)
    }
  }, [])

  useEffect(() => { loadMeta() }, [loadMeta])

  // Mirrors api/tenant/_lib/grade-bands.ts getLevelForClass
  const levelForClass = (name: string): keyof CAConfigShape => {
    const upper = name.toUpperCase()
    if (upper.includes('JSS') || upper.includes('JUNIOR') || upper.includes('JS')) return 'jss'
    if (upper.includes('SSS') || upper.includes('SENIOR') || upper.includes('SS')) return 'sss'
    return 'primary'
  }

  const weights: CAWeights = caConfig
    ? caConfig[levelForClass(selectedClass || '')]
    : { tests: 30, assignments: 20, projects: 10, exams: 40 }

  const loadRoster = useCallback(async () => {
    if (!selectedClass) { setRoster([]); return }
    try {
      const res = await tenantApiGet(`/api/tenant/students?class=${encodeURIComponent(selectedClass)}`)
      if (res.ok) {
        const data = await res.json()
        setRoster(data.data || [])
      } else {
        setRoster([])
      }
    } catch { setRoster([]) }
  }, [selectedClass])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

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
    // If existing scores carry "marked out of" values, adopt them as the
    // column defaults so re-saving keeps the same raw scale.
    const adoptMax = (key: keyof CAWeights, stored: number | null) => {
      if (stored && stored > 0) {
        setColMaxes(prev => (prev[key] === 100 ? { ...prev, [key]: stored } : prev))
      }
    }
    const first = existingScores[0]
    if (first) {
      adoptMax('tests', first.testsMax)
      adoptMax('assignments', first.assignmentsMax)
      adoptMax('projects', first.projectsMax)
      adoptMax('exams', first.examsMax)
    }

    // Convert a stored normalized score back to the raw mark for display.
    const toRaw = (score: number | null, max: number | null): string => {
      if (score === null || score === undefined) return ''
      if (max && max > 0) return String(Math.round(score * max / 100 * 100) / 100)
      return String(score)
    }

    const inputs: Record<string, ScoreInput> = {}
    // Start from roster so every student in the class appears
    for (const stu of roster) {
      inputs[stu.id] = {
        studentId: stu.id,
        studentName: stu.name,
        admissionNo: stu.admissionNo,
        testsScore: '', assignmentsScore: '', projectsScore: '', examsScore: '', attendance: '',
      }
    }
    // Merge in existing scores from the database
    for (const score of existingScores) {
      inputs[score.studentId] = {
        studentId: score.studentId,
        studentName: inputs[score.studentId]?.studentName || score.studentName || score.studentId,
        admissionNo: inputs[score.studentId]?.admissionNo || score.admissionNo,
        testsScore: toRaw(score.testsScore, score.testsMax),
        assignmentsScore: toRaw(score.assignmentsScore, score.assignmentsMax),
        projectsScore: toRaw(score.projectsScore, score.projectsMax),
        examsScore: toRaw(score.examsScore, score.examsMax),
        attendance: score.attendancePercentage?.toString() || '',
      }
    }
    setScoreInputs(inputs)
  }, [existingScores, roster])

  const handleScoreChange = (studentId: string, field: keyof ScoreInput, value: string) => {
    setScoreInputs(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  const handleAddStudents = (students: { id: string; name: string; admissionNo?: string }[]) => {
    setScoreInputs(prev => {
      const next = { ...prev }
      for (const s of students) {
        if (!next[s.id]) {
          next[s.id] = {
            studentId: s.id, studentName: s.name || s.id, admissionNo: s.admissionNo,
            testsScore: '', assignmentsScore: '', projectsScore: '', examsScore: '', attendance: '',
          }
        }
      }
      return next
    })
  }

  // Client-side guard: a raw mark can't exceed its component's "marked out of".
  const exceedsMax = (input: ScoreInput): string | null => {
    const checks: [string, string, number][] = [
      [input.testsScore, 'Tests', colMaxes.tests],
      [input.assignmentsScore, 'Assignments', colMaxes.assignments],
      [input.projectsScore, 'Projects', colMaxes.projects],
      [input.examsScore, 'Exams', colMaxes.exams],
    ]
    for (const [raw, label, max] of checks) {
      if (raw !== '' && Number(raw) > max) return `${label}: ${raw} exceeds the "out of ${max}" maximum`
    }
    return null
  }

  const scorePayload = (input: ScoreInput, status: 'draft' | 'submitted') => ({
    studentId: input.studentId, subject: selectedSubject, academicSession, term, class: selectedClass,
    attendancePercentage: input.attendance ? Number(input.attendance) : 0,
    testsScore: input.testsScore ? Number(input.testsScore) : 0,
    assignmentsScore: input.assignmentsScore ? Number(input.assignmentsScore) : 0,
    projectsScore: input.projectsScore ? Number(input.projectsScore) : 0,
    examsScore: input.examsScore ? Number(input.examsScore) : 0,
    testsMax: colMaxes.tests,
    assignmentsMax: colMaxes.assignments,
    projectsMax: colMaxes.projects,
    examsMax: colMaxes.exams,
    submissionStatus: status,
  })

  const handleSaveScore = async (studentId: string, status: 'draft' | 'submitted') => {
    const input = scoreInputs[studentId]
    if (!input) return
    const violation = exceedsMax(input)
    if (violation) {
      toast({ title: 'Score out of range', description: violation, variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await tenantApiPost('/api/tenant/results', scorePayload(input, status))
      if (res.ok) {
        toast({ title: status === 'draft' ? 'Draft saved' : 'Score submitted',
          description: `Scores for ${input.studentName || studentId} have been ${status === 'draft' ? 'saved as draft' : 'submitted'}.` })
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
    let success = 0, failed = 0, invalid = 0
    for (const studentId of studentIds) {
      const input = scoreInputs[studentId]
      if (exceedsMax(input)) { invalid++; continue }
      try {
        const res = await tenantApiPost('/api/tenant/results', scorePayload(input, 'submitted'))
        if (res.ok) success++; else failed++
      } catch { failed++ }
    }
    setSaving(false)
    toast({ title: 'Batch save complete',
      description: `${success} saved successfully${failed > 0 ? `, ${failed} failed` : ''}${invalid > 0 ? `, ${invalid} skipped (score exceeds "out of" maximum)` : ''}.`,
      variant: failed > 0 || invalid > 0 ? 'destructive' : 'default' })
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

  // Live weighted total preview: contribution = raw/max × weight.
  const liveTotal = (input: ScoreInput): number => {
    const parts: [string, number, number][] = [
      [input.testsScore, colMaxes.tests, weights.tests],
      [input.assignmentsScore, colMaxes.assignments, weights.assignments],
      [input.projectsScore, colMaxes.projects, weights.projects],
      [input.examsScore, colMaxes.exams, weights.exams],
    ]
    let total = 0
    for (const [raw, max, w] of parts) {
      if (raw === '' || !(max > 0)) continue
      total += (Number(raw) / max) * w
    }
    return Math.round(total * 100) / 100
  }

  const MaxHead = ({ label, maxKey }: { label: string; maxKey: keyof CAWeights }) => (
    <TableHead className="w-28">
      <div className="text-xs font-medium text-gray-900">{label}</div>
      <div className="flex items-center gap-1 text-[10px] font-normal text-gray-400 mt-0.5">
        <span>of</span>
        <Input
          type="number" min={1}
          className="h-5 w-14 px-1 text-[10px]"
          value={colMaxes[maxKey]}
          onChange={e => setColMaxes(prev => ({ ...prev, [maxKey]: Math.max(1, Number(e.target.value) || 0) }))}
        />
        <span>· worth {weights[maxKey]}</span>
      </div>
    </TableHead>
  )

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
          <p className="text-xs uppercase tracking-wide text-gray-500">Subjects available</p>
          <p className="text-3xl font-semibold text-gray-900">{subjects.length}</p>
          <p className="text-xs text-gray-500">{roster.length} students in class</p>
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
                  {termNames.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  {termNames.length === 0 && <SelectItem value="__none" disabled>No terms configured</SelectItem>}
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
                  <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Add student</Button>
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
                      <TableHead>Student</TableHead>
                      <MaxHead label="Tests" maxKey="tests" />
                      <MaxHead label="Assignments" maxKey="assignments" />
                      <MaxHead label="Projects" maxKey="projects" />
                      <MaxHead label="Exams" maxKey="exams" />
                      <TableHead className="w-20">Attend %</TableHead>
                      <TableHead className="w-16">Total</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(scoreInputs).map((input) => {
                      const existing = existingScores.find(s => s.studentId === input.studentId)
                      return (
                        <TableRow key={input.studentId}>
                          <TableCell className="font-medium text-gray-900">
                            {input.studentName || input.studentId}
                            <p className="text-xs text-gray-400">{input.admissionNo || input.studentId}</p>
                            {existing && <span className="text-xs text-gray-400">(total: {existing.totalScore})</span>}
                          </TableCell>
                          <TableCell><Input type="number" min="0" max={colMaxes.tests} className={`w-16 h-8 ${input.testsScore !== '' && Number(input.testsScore) > colMaxes.tests ? 'border-red-400 text-red-600' : ''}`} value={input.testsScore} onChange={e => handleScoreChange(input.studentId, 'testsScore', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" min="0" max={colMaxes.assignments} className={`w-16 h-8 ${input.assignmentsScore !== '' && Number(input.assignmentsScore) > colMaxes.assignments ? 'border-red-400 text-red-600' : ''}`} value={input.assignmentsScore} onChange={e => handleScoreChange(input.studentId, 'assignmentsScore', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" min="0" max={colMaxes.projects} className={`w-16 h-8 ${input.projectsScore !== '' && Number(input.projectsScore) > colMaxes.projects ? 'border-red-400 text-red-600' : ''}`} value={input.projectsScore} onChange={e => handleScoreChange(input.studentId, 'projectsScore', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" min="0" max={colMaxes.exams} className={`w-16 h-8 ${input.examsScore !== '' && Number(input.examsScore) > colMaxes.exams ? 'border-red-400 text-red-600' : ''}`} value={input.examsScore} onChange={e => handleScoreChange(input.studentId, 'examsScore', e.target.value)} /></TableCell>
                          <TableCell>
                            <div className="relative">
                              <Input type="number" min="0" max="100" className="w-16 h-8" value={input.attendance} onChange={e => handleScoreChange(input.studentId, 'attendance', e.target.value)} />
                              {autoFilledStudents.has(input.studentId) && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" title="Auto-filled from attendance records" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-gray-900">{liveTotal(input)}</TableCell>
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
                  Enter raw marks — each is scaled by its "of" value into the CA Configuration weight. E.g. a test marked out of 20 with Tests worth 30: a score of 10 contributes 15. Leave "of" at 100 to enter percentages directly.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <StudentPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        existingIds={new Set(Object.keys(scoreInputs))}
        defaultClass={selectedClass}
        onAdd={handleAddStudents}
      />

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
interface PickerStudent { id: string; name: string; class?: string; admissionNo?: string }

function StudentPickerDialog({
  open, onOpenChange, existingIds, defaultClass, onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingIds: Set<string>
  defaultClass: string
  onAdd: (students: { id: string; name: string; admissionNo?: string }[]) => void
}) {
  const [students, setStudents] = useState<PickerStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelected(new Set())
    setClassFilter(defaultClass || '__all__')
    setLoading(true)
    tenantApiGet('/api/tenant/students')
      .then(r => r.json())
      .then(data => {
        const list: PickerStudent[] = (data.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          class: s.class,
          admissionNo: s.admissionNo || s.admission_number || s.admission_no || '',
        }))
        setStudents(list)
      })
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
  }, [open, defaultClass])

  const classOptions = Array.from(new Set(students.map(s => s.class).filter(Boolean) as string[])).sort()

  const filtered = students.filter(s => {
    if (classFilter && classFilter !== '__all__' && s.class !== classFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (s.name || '').toLowerCase().includes(q)
      || (s.id || '').toLowerCase().includes(q)
      || (s.admissionNo || '').toLowerCase().includes(q)
  })

  const addable = filtered.filter(s => !existingIds.has(s.id))
  const allFilteredSelected = addable.length > 0 && addable.every(s => selected.has(s.id))

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const s of addable) next.delete(s.id)
      } else {
        for (const s of addable) next.add(s.id)
      }
      return next
    })
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add students</DialogTitle>
          <DialogDescription>
            Pick individual students, or filter by class and select all. Students already in the grid are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search name, ID, or admission no"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All classes</SelectItem>
              {classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-gray-100">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleAll}
                disabled={addable.length === 0}
              />
              <span className="font-medium">Select all</span>
            </label>
            <span className="text-xs text-gray-400">{filtered.length} shown · {selected.size} selected</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading && <p className="text-sm text-gray-500 text-center py-8">Loading students…</p>}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No students match this filter.</p>
            )}
            {!loading && filtered.map(s => {
              const already = existingIds.has(s.id)
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2 border-b border-gray-50 text-sm ${already ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                >
                  <Checkbox
                    checked={already || selected.has(s.id)}
                    disabled={already}
                    onCheckedChange={() => toggleOne(s.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{s.name || s.id}</p>
                    <p className="text-xs text-gray-400">{s.admissionNo || s.id}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{s.class}{already ? ' · added' : ''}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={selected.size === 0}
            onClick={() => {
              const chosen = students.filter(s => selected.has(s.id) && !existingIds.has(s.id))
              onAdd(chosen)
              onOpenChange(false)
            }}
          >
            Add {selected.size > 0 ? `${selected.size} ` : ''}student{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CAScoreEntry;
