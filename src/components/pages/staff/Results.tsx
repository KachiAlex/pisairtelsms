import React, { useState, useEffect, useCallback } from 'react'
import { Save, CheckCircle2, AlertCircle, RefreshCw, Loader2, CalendarCheck, FileSpreadsheet, Send } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Alert, AlertDescription } from '../../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { AcademicSessionSelect } from '../../ui/academic-session-select'
import { useToast } from '../../ui/use-toast'
import { tenantApiGet, tenantApiPost, tenantApiFetch } from '../../../lib/tenantApi'
import { useTimetableTerms } from '../../../hooks/useTimetableTerms'
import { useAcademicPeriod } from '../../../hooks/useAcademicPeriod'

interface AllocatedClass {
  id: string
  name: string
  arm?: string
  studentCount?: number
  subjects: string[]
  formTeacherId?: string | null
  formTeacherName?: string | null
  isFormTeacher?: boolean
}
interface StudentItem { id: string; name: string; admissionNo?: string }
interface StudentScore {
  studentId: string
  totalScore: number
  attendancePercentage: number
  testsScore: number | null; assignmentsScore: number | null
  projectsScore: number | null; examsScore: number | null
  testsMax: number | null; assignmentsMax: number | null
  projectsMax: number | null; examsMax: number | null
  submissionStatus: string
}
interface CAWeights { tests: number; assignments: number; projects: number; exams: number }
interface CAConfigShape { primary: CAWeights; jss: CAWeights; sss: CAWeights }
interface TeacherSubmission {
  submittedBy: string; submittedByName: string; subject: string
  class: string; status: string; updatedAt: string
}
interface CompiledRow {
  student_id: string; student_name?: string; subject: string
  total_score: number; grade?: string; remark?: string
  subject_position?: number; overall_total?: number; overall_average?: number
  class_position?: number; total_students?: number; status: string
}
interface BroadsheetStudent {
  studentId: string; studentName: string; admissionNo: string
  classPosition: number; totalStudents: number
  overallTotal: number; overallAverage: number; attendancePercent: number
  subjects: Record<string, { score: number; grade: string; position: number; remark: string }>
}
interface BroadsheetData {
  className: string; academicSession: string; term: string
  subjects: string[]; students: BroadsheetStudent[]
  statusBreakdown: Record<string, number>
}
interface ScoreInput {
  studentId: string; studentName: string; admissionNo?: string
  testsScore: string; assignmentsScore: string
  projectsScore: string; examsScore: string; attendance: string
}

const classLabel = (c: AllocatedClass) => (c.arm ? `${c.name} ${c.arm}` : c.name)

export function StaffResults() {
  const { toast } = useToast()

  const [allocatedClasses, setAllocatedClasses] = useState<AllocatedClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [academicSession, setAcademicSession] = useState('')
  const [term, setTerm] = useState('')
  const [caConfig, setCaConfig] = useState<CAConfigShape | null>(null)

  const [roster, setRoster] = useState<StudentItem[]>([])
  const [existingScores, setExistingScores] = useState<StudentScore[]>([])
  const [scoreInputs, setScoreInputs] = useState<Record<string, ScoreInput>>({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [colMaxes, setColMaxes] = useState<CAWeights>({ tests: 100, assignments: 100, projects: 100, exams: 100 })
  const [loadingScores, setLoadingScores] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autoFillingAttendance, setAutoFillingAttendance] = useState(false)

  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([])
  const [compiled, setCompiled] = useState<CompiledRow[]>([])
  const [loadingCompile, setLoadingCompile] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [compileError, setCompileError] = useState<string | null>(null)

  const [broadsheet, setBroadsheet] = useState<BroadsheetData | null>(null)
  const [loadingBroadsheet, setLoadingBroadsheet] = useState(false)
  const [broadsheetError, setBroadsheetError] = useState<string | null>(null)

  const { session: resolvedSession, term: resolvedTerm } = useAcademicPeriod()
  const { termNames } = useTimetableTerms(term, academicSession || resolvedSession)

  useEffect(() => {
    if (!academicSession && resolvedSession) setAcademicSession(resolvedSession)
  }, [resolvedSession])
  useEffect(() => {
    if (!term && resolvedTerm) setTerm(resolvedTerm)
  }, [resolvedTerm])

  // Staff can only pick from classes/subjects they are allocated to.
  useEffect(() => {
    setLoadingClasses(true)
    tenantApiGet('/api/staff/classes')
      .then(r => (r.ok ? r.json() : { classes: [] }))
      .then(d => setAllocatedClasses(d.classes || []))
      .catch(() => setAllocatedClasses([]))
      .finally(() => setLoadingClasses(false))
    tenantApiGet('/api/tenant/ca-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.data?.published) setCaConfig(d.data.published) })
      .catch(() => {})
  }, [])

  const selectedClassObj = allocatedClasses.find(c => classLabel(c) === selectedClass)
  const subjectsForClass = selectedClassObj?.subjects || []

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

  // ── Score entry loading ──────────────────────────────────────────
  const loadSheet = useCallback(async () => {
    if (!selectedClass || !selectedSubject || !academicSession || !term) return
    setLoadingScores(true)
    setRowErrors({})
    try {
      const [rosterRes, scoresRes] = await Promise.all([
        tenantApiGet(`/api/tenant/students?class=${encodeURIComponent(selectedClass)}`),
        tenantApiGet(
          `/api/tenant/results?action=class-scores&class=${encodeURIComponent(selectedClass)}&subject=${encodeURIComponent(selectedSubject)}&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}`
        ),
      ])
      const rosterData = rosterRes.ok ? await rosterRes.json() : { data: [] }
      const scoresData = scoresRes.ok ? await scoresRes.json() : { data: [] }
      if (!scoresRes.ok) {
        const err = await scoresRes.json().catch(() => ({}))
        toast({ title: 'Could not load scores', description: err.error || 'Request failed', variant: 'destructive' })
      }
      const students: StudentItem[] = rosterData.data || []
      const scores: StudentScore[] = scoresData.data || []
      setRoster(students)
      setExistingScores(scores)

      const first = scores[0]
      if (first) {
        const adopt = (key: keyof CAWeights, stored: number | null) => {
          if (stored && stored > 0) setColMaxes(prev => (prev[key] === 100 ? { ...prev, [key]: stored } : prev))
        }
        adopt('tests', first.testsMax)
        adopt('assignments', first.assignmentsMax)
        adopt('projects', first.projectsMax)
        adopt('exams', first.examsMax)
      }
      const toRaw = (score: number | null, max: number | null): string => {
        if (score === null || score === undefined) return ''
        if (max && max > 0) return String(Math.round((score * max) / 100 * 100) / 100)
        return String(score)
      }
      const inputs: Record<string, ScoreInput> = {}
      for (const stu of students) {
        inputs[stu.id] = {
          studentId: stu.id, studentName: stu.name, admissionNo: stu.admissionNo,
          testsScore: '', assignmentsScore: '', projectsScore: '', examsScore: '', attendance: '',
        }
      }
      for (const s of scores) {
        if (!inputs[s.studentId]) continue
        inputs[s.studentId] = {
          ...inputs[s.studentId],
          testsScore: toRaw(s.testsScore, s.testsMax),
          assignmentsScore: toRaw(s.assignmentsScore, s.assignmentsMax),
          projectsScore: toRaw(s.projectsScore, s.projectsMax),
          examsScore: toRaw(s.examsScore, s.examsMax),
          attendance: s.attendancePercentage?.toString() || '',
        }
      }
      setScoreInputs(inputs)
    } catch {
      toast({ title: 'Error', description: 'Failed to load the score sheet', variant: 'destructive' })
    } finally {
      setLoadingScores(false)
    }
  }, [selectedClass, selectedSubject, academicSession, term, toast])

  useEffect(() => {
    if (selectedClass && selectedSubject && academicSession && term) loadSheet()
  }, [selectedClass, selectedSubject, academicSession, term, loadSheet])

  const handleScoreChange = (studentId: string, field: keyof ScoreInput, value: string) => {
    setScoreInputs(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
    setRowErrors(prev => {
      if (!prev[studentId]) return prev
      const next = { ...prev }
      delete next[studentId]
      return next
    })
  }

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

  const rowPayload = (input: ScoreInput) => ({
    studentId: input.studentId,
    attendancePercentage: input.attendance ? Number(input.attendance) : 0,
    testsScore: input.testsScore ? Number(input.testsScore) : 0,
    assignmentsScore: input.assignmentsScore ? Number(input.assignmentsScore) : 0,
    projectsScore: input.projectsScore ? Number(input.projectsScore) : 0,
    examsScore: input.examsScore ? Number(input.examsScore) : 0,
    testsMax: colMaxes.tests,
    assignmentsMax: colMaxes.assignments,
    projectsMax: colMaxes.projects,
    examsMax: colMaxes.exams,
  })

  // One HTTP call for the whole sheet — the server upserts each row and
  // reports per-row failures without discarding the successful ones.
  const handleSaveAll = async () => {
    const inputs = Object.values(scoreInputs)
    if (inputs.length === 0) return
    const invalid: Record<string, string> = {}
    const rows = inputs.filter(i => {
      const v = exceedsMax(i)
      if (v) { invalid[i.studentId] = v; return false }
      return true
    }).map(rowPayload)
    setRowErrors(invalid)
    if (rows.length === 0) {
      toast({ title: 'Nothing to save', description: 'Every row has a score above its "out of" maximum.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await tenantApiPost('/api/tenant/results?action=scores-batch', {
        class: selectedClass, subject: selectedSubject,
        academicSession, term, rows,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && !data.saved) {
        toast({ title: 'Save failed', description: data.error || 'Batch save failed', variant: 'destructive' })
      } else {
        const errs: Record<string, string> = { ...invalid }
        for (const e of data.errors || []) errs[e.studentId] = e.error
        setRowErrors(errs)
        toast({
          title: 'Save complete',
          description: `${data.saved ?? 0} saved${data.failed ? `, ${data.failed} failed — see highlighted rows` : ''}${Object.keys(invalid).length ? `, ${Object.keys(invalid).length} skipped (over max)` : ''}.`,
          variant: (data.failed || Object.keys(invalid).length) ? 'destructive' : 'default',
        })
        if (data.saved > 0) loadSheet()
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
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
        const map: Record<string, number> = data.data || {}
        setScoreInputs(prev => {
          const next = { ...prev }
          for (const [sid, pct] of Object.entries(map)) {
            if (next[sid]) next[sid] = { ...next[sid], attendance: String(pct) }
          }
          return next
        })
        toast({ title: 'Attendance filled', description: `Auto-filled for ${Object.keys(map).length} student(s).` })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Auto-fill failed', description: data.error || 'Could not compute attendance', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setAutoFillingAttendance(false)
    }
  }

  // ── Compile tab ──────────────────────────────────────────────────
  const loadCompileView = useCallback(async () => {
    if (!selectedClass || !academicSession || !term) return
    setLoadingCompile(true)
    setCompileError(null)
    try {
      const [subRes, compRes] = await Promise.all([
        tenantApiGet(
          `/api/tenant/results?action=teacher-submissions&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}&class=${encodeURIComponent(selectedClass)}`
        ),
        tenantApiGet(
          `/api/tenant/results?action=compiled&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}&class=${encodeURIComponent(selectedClass)}`
        ),
      ])
      if (subRes.ok) setSubmissions((await subRes.json()).data || [])
      if (compRes.ok) setCompiled((await compRes.json()).data || [])
      else setCompiled([])
      if (!subRes.ok && !compRes.ok) setCompileError('Failed to load submission status for this class.')
    } catch {
      setCompileError('Network error loading compile view.')
    } finally {
      setLoadingCompile(false)
    }
  }, [selectedClass, academicSession, term])

  useEffect(() => { loadCompileView() }, [loadCompileView])

  const handleCompile = async () => {
    if (!selectedClass || !academicSession || !term) return
    setCompiling(true)
    setCompileError(null)
    try {
      const res = await tenantApiFetch(
        `/api/tenant/results?action=compile&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}&class=${encodeURIComponent(selectedClass)}`,
        { method: 'PUT' }
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast({ title: 'Compilation complete', description: data.message || `Compiled ${data.compiled ?? ''} result row(s) for ${selectedClass}.` })
        loadCompileView()
      } else {
        setCompileError(data.error || 'Compilation failed')
      }
    } catch {
      setCompileError('Network error during compilation')
    } finally {
      setCompiling(false)
    }
  }

  // ── Broadsheet tab ───────────────────────────────────────────────
  const loadBroadsheet = useCallback(async () => {
    if (!selectedClass || !academicSession || !term) return
    setLoadingBroadsheet(true)
    setBroadsheetError(null)
    setBroadsheet(null)
    try {
      const res = await tenantApiGet(
        `/api/tenant/results?action=broadsheet&class=${encodeURIComponent(selectedClass)}&academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}`
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setBroadsheet(data.data)
      } else {
        setBroadsheetError(data.error || 'Failed to load broadsheet')
      }
    } catch {
      setBroadsheetError('Network error loading broadsheet')
    } finally {
      setLoadingBroadsheet(false)
    }
  }, [selectedClass, academicSession, term])

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

  const statusBadge = (status: string) => {
    if (status === 'submitted') return <Badge variant="default">Submitted</Badge>
    if (status === 'draft') return <Badge variant="secondary">Draft</Badge>
    if (status === 'approved' || status === 'compiled') return <Badge variant="default" className="capitalize">{status}</Badge>
    if (status === 'published') return <Badge variant="default" className="bg-green-600">Published</Badge>
    return <Badge variant="secondary" className="capitalize">{status}</Badge>
  }

  const renderPickers = (withSubject: boolean) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">Class (your allocations)</Label>
        <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSubject('') }}>
          <SelectTrigger><SelectValue placeholder={loadingClasses ? 'Loading…' : 'Select class'} /></SelectTrigger>
          <SelectContent>
            {allocatedClasses.map(c => (
              <SelectItem key={c.id} value={classLabel(c)}>
                {classLabel(c)}{c.studentCount !== undefined ? ` (${c.studentCount})` : ''}
              </SelectItem>
            ))}
            {!loadingClasses && allocatedClasses.length === 0 && (
              <SelectItem value="__none" disabled>No class allocations</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      {withSubject && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjectsForClass.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">Academic Session</Label>
        <AcademicSessionSelect value={academicSession} onChange={setAcademicSession} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">Term</Label>
        <Select value={term} onValueChange={setTerm}>
          <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
          <SelectContent>
            {termNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            {termNames.length === 0 && <SelectItem value="__none" disabled>No terms configured</SelectItem>}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  // Compiled view: pivot rows into student × subject
  const compiledByStudent = React.useMemo(() => {
    const map = new Map<string, { name: string; position: number; average: number; status: string; subjects: CompiledRow[] }>()
    for (const r of compiled) {
      if (!map.has(r.student_id)) {
        map.set(r.student_id, {
          name: r.student_name || r.student_id,
          position: Number(r.class_position) || 0,
          average: Number(r.overall_average) || 0,
          status: r.status,
          subjects: [],
        })
      }
      map.get(r.student_id)!.subjects.push(r)
    }
    return [...map.values()].sort((a, b) => a.position - b.position)
  }, [compiled])

  const compiledStatus = compiled[0]?.status

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Assessment</p>
        <h1 className="text-2xl font-bold text-gray-900">Results</h1>
        <p className="text-sm text-gray-600">
          Enter scores for your allocated classes, compile class results, and view the broadsheet.
          Approval and publishing are handled by the school administrator.
        </p>
      </div>

      <Tabs defaultValue="entry">
        <TabsList>
          <TabsTrigger value="entry">Score Entry</TabsTrigger>
          <TabsTrigger value="compile">Compile</TabsTrigger>
          <TabsTrigger value="broadsheet">Broadsheet</TabsTrigger>
        </TabsList>

        {/* ── Score Entry ── */}
        <TabsContent value="entry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score Entry</CardTitle>
              <CardDescription>
                Pick a class and subject you teach, then enter scores for the whole class in one sheet.
                Totals use the school's published CA weights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderPickers(true)}

              {loadingClasses && (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your classes…
                </div>
              )}

              {!loadingClasses && allocatedClasses.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have no class allocations yet. Ask the administrator to assign you classes and subjects
                    in Academic Structure → Teacher Allocation.
                  </AlertDescription>
                </Alert>
              )}

              {!loadingClasses && allocatedClasses.length > 0 && (!selectedClass || !selectedSubject) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Select a class and subject to load the score sheet.</AlertDescription>
                </Alert>
              )}

              {selectedClass && selectedSubject && (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-500">
                      {loadingScores ? 'Loading score sheet…' : `${Object.keys(scoreInputs).length} students · ${existingScores.length} saved`}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleAutoFillAttendance} disabled={autoFillingAttendance || saving}>
                        {autoFillingAttendance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarCheck className="h-4 w-4 mr-2" />}
                        Auto-fill Attendance
                      </Button>
                      <Button size="sm" onClick={handleSaveAll} disabled={saving || Object.keys(scoreInputs).length === 0}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save &amp; Submit All
                      </Button>
                    </div>
                  </div>

                  {!loadingScores && Object.keys(scoreInputs).length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>No students found in {selectedClass}.</AlertDescription>
                    </Alert>
                  )}

                  {Object.keys(scoreInputs).length > 0 && (
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(scoreInputs).map(input => {
                            const err = rowErrors[input.studentId]
                            const existing = existingScores.find(s => s.studentId === input.studentId)
                            return (
                              <TableRow key={input.studentId} className={err ? 'bg-red-50' : ''}>
                                <TableCell className="font-medium text-gray-900">
                                  {input.studentName || input.studentId}
                                  <p className="text-xs text-gray-400">{input.admissionNo || input.studentId}</p>
                                  {existing && <p className="text-xs text-gray-400">saved total: {existing.totalScore}</p>}
                                  {err && <p className="text-xs text-red-600">{err}</p>}
                                </TableCell>
                                <TableCell><Input type="number" min="0" max={colMaxes.tests} className={`w-16 h-8 ${input.testsScore !== '' && Number(input.testsScore) > colMaxes.tests ? 'border-red-400 text-red-600' : ''}`} value={input.testsScore} onChange={e => handleScoreChange(input.studentId, 'testsScore', e.target.value)} /></TableCell>
                                <TableCell><Input type="number" min="0" max={colMaxes.assignments} className={`w-16 h-8 ${input.assignmentsScore !== '' && Number(input.assignmentsScore) > colMaxes.assignments ? 'border-red-400 text-red-600' : ''}`} value={input.assignmentsScore} onChange={e => handleScoreChange(input.studentId, 'assignmentsScore', e.target.value)} /></TableCell>
                                <TableCell><Input type="number" min="0" max={colMaxes.projects} className={`w-16 h-8 ${input.projectsScore !== '' && Number(input.projectsScore) > colMaxes.projects ? 'border-red-400 text-red-600' : ''}`} value={input.projectsScore} onChange={e => handleScoreChange(input.studentId, 'projectsScore', e.target.value)} /></TableCell>
                                <TableCell><Input type="number" min="0" max={colMaxes.exams} className={`w-16 h-8 ${input.examsScore !== '' && Number(input.examsScore) > colMaxes.exams ? 'border-red-400 text-red-600' : ''}`} value={input.examsScore} onChange={e => handleScoreChange(input.studentId, 'examsScore', e.target.value)} /></TableCell>
                                <TableCell><Input type="number" min="0" max="100" className="w-16 h-8" value={input.attendance} onChange={e => handleScoreChange(input.studentId, 'attendance', e.target.value)} /></TableCell>
                                <TableCell className="text-sm font-semibold text-gray-900">{liveTotal(input)}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Enter raw marks — each is scaled by its "of" value into the CA weight. E.g. a test marked
                      out of 20 with Tests worth {weights.tests}: a score of 10 contributes {weights.tests / 2}.
                      Leave "of" at 100 to enter percentages directly. Save &amp; Submit All sends the whole sheet
                      in one request.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Compile ── */}
        <TabsContent value="compile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Result Compilation</CardTitle>
              <CardDescription>
                Review which teachers have submitted scores for a class, then compile its results.
                The administrator reviews and approves compiled results before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderPickers(false)}

              {!selectedClass ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Select one of your allocated classes to review submissions.</AlertDescription>
                </Alert>
              ) : loadingCompile ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading submission status…
                </div>
              ) : (
                <>
                  {compileError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{compileError}</AlertDescription>
                    </Alert>
                  )}

                  {selectedClassObj?.formTeacherId && !selectedClassObj.isFormTeacher && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {selectedClassObj.formTeacherName || 'The assigned form teacher'} is the form teacher
                        for {selectedClass} — only they (or an administrator) can compile its results.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-500">
                      {submissions.length} subject submission(s) recorded for {selectedClass} · {term} {academicSession}
                      {selectedClassObj?.isFormTeacher ? ' · you are the form teacher' : ''}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={loadCompileView} disabled={loadingCompile}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingCompile ? 'animate-spin' : ''}`} /> Refresh
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCompile}
                        disabled={compiling || !selectedClass || !academicSession || !term || !!(selectedClassObj?.formTeacherId && !selectedClassObj.isFormTeacher)}
                      >
                        {compiling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                        Compile {selectedClass}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((s, i) => (
                          <TableRow key={`${s.subject}-${s.submittedBy}-${i}`}>
                            <TableCell className="font-medium">{s.subject}</TableCell>
                            <TableCell>{s.submittedByName || s.submittedBy}</TableCell>
                            <TableCell>{statusBadge(s.status)}</TableCell>
                            <TableCell className="text-sm text-gray-500">{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—'}</TableCell>
                          </TableRow>
                        ))}
                        {submissions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-6">
                              No scores submitted yet for this class and term.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {compiledByStudent.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">Compiled results</h3>
                        {compiledStatus && statusBadge(compiledStatus)}
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Pos</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Subjects</TableHead>
                              <TableHead>Average</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {compiledByStudent.map(stu => (
                              <TableRow key={stu.name + stu.position}>
                                <TableCell>{stu.position || '—'}</TableCell>
                                <TableCell className="font-medium">{stu.name}</TableCell>
                                <TableCell className="text-sm">
                                  {stu.subjects.map(r => (
                                    <span key={r.subject} className="inline-block mr-3">
                                      {r.subject}: <strong>{r.total_score}</strong>{r.grade ? ` (${r.grade})` : ''}
                                    </span>
                                  ))}
                                </TableCell>
                                <TableCell>{stu.average}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {compiledStatus !== 'approved' && compiledStatus !== 'published' && (
                        <Alert>
                          <Send className="h-4 w-4" />
                          <AlertDescription>
                            Results are compiled and awaiting administrator approval. Once approved and
                            published, students and parents can view them.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Broadsheet ── */}
        <TabsContent value="broadsheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Broadsheet</CardTitle>
              <CardDescription>Read-only summary of compiled results for one of your classes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderPickers(false)}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={loadBroadsheet} disabled={!selectedClass || !academicSession || !term || loadingBroadsheet}>
                  {loadingBroadsheet ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Load broadsheet
                </Button>
              </div>

              {broadsheetError && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{broadsheetError}</AlertDescription>
                </Alert>
              )}

              {broadsheet && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-gray-600">
                      {broadsheet.className} · {broadsheet.term} {broadsheet.academicSession} · {broadsheet.students.length} students
                    </p>
                    {Object.entries(broadsheet.statusBreakdown).map(([status, n]) => (
                      <span key={status} className="flex items-center gap-1">{statusBadge(status)}<span className="text-xs text-gray-400">×{n}</span></span>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pos</TableHead>
                          <TableHead>Student</TableHead>
                          {broadsheet.subjects.map(s => <TableHead key={s}>{s}</TableHead>)}
                          <TableHead>Total</TableHead>
                          <TableHead>Avg</TableHead>
                          <TableHead>Attend %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {broadsheet.students.map(stu => (
                          <TableRow key={stu.studentId}>
                            <TableCell>{stu.classPosition || '—'}</TableCell>
                            <TableCell className="font-medium">
                              {stu.studentName}
                              <p className="text-xs text-gray-400">{stu.admissionNo}</p>
                            </TableCell>
                            {broadsheet.subjects.map(s => {
                              const sub = stu.subjects[s]
                              return (
                                <TableCell key={s} className="text-sm">
                                  {sub ? <><strong>{sub.score}</strong> <span className="text-gray-400">{sub.grade}</span></> : '—'}
                                </TableCell>
                              )
                            })}
                            <TableCell className="font-semibold">{stu.overallTotal}</TableCell>
                            <TableCell>{stu.overallAverage}</TableCell>
                            <TableCell>{stu.attendancePercent}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
