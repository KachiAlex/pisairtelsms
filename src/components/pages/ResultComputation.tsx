import React, { useState, useEffect, useCallback } from 'react'
import { PlayCircle, RefreshCw, AlertCircle, CheckCircle2, Loader2, Calculator, Database, FileCheck } from 'lucide-react'

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
import { tenantApiGet, tenantApiPut } from '../../lib/tenantApi'

interface RecomputeDetail {
  studentId: string
  subject: string
  class: string
  oldTotal: number
  newTotal: number
}

interface CompiledResultRow {
  student_id: string
  subject: string
  class: string
  total_score: number
  grade: string
  remark: string
  class_average: number
  highest_score: number
  lowest_score: number
  subject_position: number
  overall_total: number
  overall_average: number
  class_position: number
  total_students: number
  attendance_percent: number
  principal_comment: string
  status: string
  compiled_at: string
}

interface ScoreSummary {
  id: string
  studentId: string
  subject: string
  class: string
  totalScore: number
  submissionStatus: string
  updatedAt: string
}

export function ResultComputation() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [academicSession, setAcademicSession] = useState('')
  const [term, setTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [computing, setComputing] = useState(false)
  const [loadingScores, setLoadingScores] = useState(false)
  const [recomputeResult, setRecomputeResult] = useState<{ recomputed: number; details: RecomputeDetail[] } | null>(null)
  const [compiling, setCompiling] = useState(false)
  const [compileResult, setCompileResult] = useState<{ compiled: number; results: any[] } | null>(null)
  const [compiledResults, setCompiledResults] = useState<CompiledResultRow[]>([])
  const [loadingCompiled, setLoadingCompiled] = useState(false)
  const [allScores, setAllScores] = useState<ScoreSummary[]>([])

  const currentYear = new Date().getFullYear()
  const defaultSession = `${currentYear}/${currentYear + 1}`

  useEffect(() => {
    setAcademicSession(defaultSession)
    setTerm('First Term')
  }, [])

  const loadScores = useCallback(async () => {
    if (!academicSession || !term) return
    setLoadingScores(true)
    try {
      const params = new URLSearchParams({ academicSession, term })
      if (selectedClass) params.set('class', selectedClass)
      const res = await tenantApiGet(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAllScores(data.data || [])
      }
    } catch { /* silent */ } finally {
      setLoadingScores(false)
    }
  }, [academicSession, term, selectedClass])

  useEffect(() => {
    if (academicSession && term) loadScores()
  }, [academicSession, term, selectedClass, loadScores])

  const loadCompiled = useCallback(async () => {
    if (!academicSession || !term) return
    setLoadingCompiled(true)
    try {
      const params = new URLSearchParams({ action: 'compiled', academicSession, term })
      if (selectedClass) params.set('class', selectedClass)
      const res = await tenantApiGet(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCompiledResults(data.data || [])
      }
    } catch { /* silent */ } finally {
      setLoadingCompiled(false)
    }
  }, [academicSession, term, selectedClass])

  useEffect(() => {
    if (academicSession && term) loadCompiled()
  }, [academicSession, term, selectedClass, loadCompiled])

  const handleCompile = async () => {
    setCompiling(true)
    setCompileResult(null)
    try {
      const params = new URLSearchParams({ action: 'compile', academicSession, term })
      if (selectedClass) params.set('class', selectedClass)
      const res = await tenantApiPut(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCompileResult({ compiled: data.compiled, results: data.results || [] })
        toast({
          title: 'Results compiled',
          description: `${data.compiled} result(s) compiled with grades, rankings, and remarks.`,
        })
        loadCompiled()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data.error || 'Failed to compile', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setCompiling(false)
    }
  }

  const handleRecompute = async () => {
    setComputing(true)
    setRecomputeResult(null)
    try {
      const params = new URLSearchParams({ action: 'recompute', academicSession, term })
      if (selectedClass) params.set('class', selectedClass)
      const res = await tenantApiPut(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setRecomputeResult({ recomputed: data.recomputed, details: data.details || [] })
        toast({
          title: 'Recompute complete',
          description: `${data.recomputed} score(s) updated with current CA Configuration weights.`,
        })
        loadScores()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data.error || 'Failed to recompute', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setComputing(false)
    }
  }

  const totalScores = allScores.length
  const submittedScores = allScores.filter(s => s.submissionStatus === 'submitted').length
  const draftScores = allScores.filter(s => s.submissionStatus === 'draft').length
  const approvedScores = allScores.filter(s => s.submissionStatus === 'approved').length

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
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Result computation</p>
          <h1 className="text-2xl font-bold text-gray-900">Result Computation</h1>
          <p className="text-sm text-gray-600">Recompute weighted totals using current CA Configuration. Apply updated weights to existing scores.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleCompile} disabled={compiling || !academicSession || !term}>
            {compiling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
            {compiling ? 'Compiling...' : 'Compile Results'}
          </Button>
          <Button onClick={handleRecompute} disabled={computing || !academicSession || !term}>
            {computing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            {computing ? 'Computing...' : 'Trigger Recompute'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total scores</p>
          <p className="text-3xl font-semibold text-gray-900">{totalScores}</p>
          <p className="text-xs text-gray-500">For {term} {academicSession}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Submitted</p>
          <p className="text-3xl font-semibold text-blue-600">{submittedScores}</p>
          <p className="text-xs text-gray-500">Ready for computation</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Drafts</p>
          <p className="text-3xl font-semibold text-amber-600">{draftScores}</p>
          <p className="text-xs text-gray-500">Not yet submitted by teachers</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Approved</p>
          <p className="text-3xl font-semibold text-emerald-600">{approvedScores}</p>
          <p className="text-xs text-gray-500">Cleared for publishing</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Computation Controls</CardTitle>
          <CardDescription>Select scope and trigger recompute to apply current CA Configuration weights to all scores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label className="text-xs text-gray-500">Class (optional - leave empty for all)</Label>
              <ClassArmSelect value={selectedClass} onChange={setSelectedClass} allowAll allLabel="All Classes" />
            </div>
          </div>

          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertDescription>
              Recompute will recalculate the total score for every student using the published CA Configuration weights.
              Only scores where the total has changed will be updated.
            </AlertDescription>
          </Alert>

          {compileResult && (
        <Alert>
          <FileCheck className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">{compileResult.compiled}</span> result(s) compiled successfully.
            Grades assigned, class positions calculated, and remarks generated.
          </AlertDescription>
        </Alert>
      )}

      {recomputeResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">{recomputeResult.recomputed}</span> score(s) were updated.
                {recomputeResult.details.length > 0 && (
                  <span className="block mt-1 text-xs">See details below in the recompute log.</span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {recomputeResult && recomputeResult.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recompute Log</CardTitle>
            <CardDescription>Students whose totals changed after applying updated weights.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Old Total</TableHead>
                  <TableHead>New Total</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recomputeResult.details.map((d, i) => {
                  const change = (d.newTotal - d.oldTotal).toFixed(2)
                  const isPositive = d.newTotal > d.oldTotal
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900">{d.studentId}</TableCell>
                      <TableCell>{d.subject}</TableCell>
                      <TableCell>{d.class}</TableCell>
                      <TableCell>{d.oldTotal}</TableCell>
                      <TableCell className="font-medium">{d.newTotal}</TableCell>
                      <TableCell>
                        <Badge variant={isPositive ? 'default' : 'destructive'}>
                          {isPositive ? '+' : ''}{change}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Compiled Results Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Compiled Results</CardTitle>
            <CardDescription>Grades, rankings, and remarks generated by the compilation pipeline.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadCompiled} disabled={loadingCompiled}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingCompiled ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loadingCompiled ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading compiled results...
            </div>
          ) : compiledResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No compiled results yet. Click "Compile Results" to generate grades and rankings.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Subj Pos</TableHead>
                  <TableHead>Class Pos</TableHead>
                  <TableHead>Class Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compiledResults.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-gray-900">{r.student_id}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell>{r.class}</TableCell>
                    <TableCell className="font-medium">{Number(r.total_score)}</TableCell>
                    <TableCell><Badge variant={r.grade.startsWith('A') || r.grade.startsWith('B') ? 'default' : r.grade.startsWith('F') ? 'destructive' : 'secondary'}>{r.grade}</Badge></TableCell>
                    <TableCell className="text-sm text-gray-600">{r.remark}</TableCell>
                    <TableCell>{r.subject_position}</TableCell>
                    <TableCell>{r.class_position} of {r.total_students}</TableCell>
                    <TableCell>{Number(r.class_average)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {compiledResults.length > 50 && (
            <p className="text-xs text-gray-400 mt-2 text-center">Showing first 50 of {compiledResults.length} records</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Score Records</CardTitle>
            <CardDescription>All computed scores for the selected term and session.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadScores} disabled={loadingScores}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingScores ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loadingScores ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading scores...
            </div>
          ) : allScores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No scores found for {term} {academicSession}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Total Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allScores.slice(0, 50).map((score) => (
                  <TableRow key={score.id}>
                    <TableCell className="font-medium text-gray-900">{score.studentId}</TableCell>
                    <TableCell>{score.subject}</TableCell>
                    <TableCell>{score.class}</TableCell>
                    <TableCell className="font-medium">{score.totalScore}</TableCell>
                    <TableCell>{statusBadge(score.submissionStatus)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{new Date(score.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {allScores.length > 50 && (
            <p className="text-xs text-gray-400 mt-2 text-center">Showing first 50 of {allScores.length} records</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default ResultComputation;
