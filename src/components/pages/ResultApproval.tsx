import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, ShieldCheck, Send, Loader2, RefreshCw, FileCheck } from 'lucide-react'

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

interface CompiledRow {
  id: string
  student_id: string
  subject: string
  class: string
  academic_session: string
  term: string
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

export function ResultApproval() {
  const { tenant } = useTenant()
  const { toast } = useToast()

  const [academicSession, setAcademicSession] = useState('')
  const [term, setTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [compiled, setCompiled] = useState<CompiledRow[]>([])
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)

  const currentYear = new Date().getFullYear()
  const defaultSession = `${currentYear}/${currentYear + 1}`

  useEffect(() => {
    setAcademicSession(defaultSession)
    setTerm('First Term')
  }, [])

  const loadCompiled = useCallback(async () => {
    if (!academicSession || !term) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'compiled', academicSession, term })
      if (selectedClass) params.set('class', selectedClass)
      const res = await tenantApiGet(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCompiled(data.data || [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [academicSession, term, selectedClass])

  useEffect(() => {
    if (academicSession && term) loadCompiled()
  }, [academicSession, term, selectedClass, loadCompiled])

  // Group by class for summary
  const classGroups: Record<string, CompiledRow[]> = {}
  for (const row of compiled) {
    const cls = row.class || 'Unknown'
    if (!classGroups[cls]) classGroups[cls] = []
    classGroups[cls].push(row)
  }

  const classSummaries = Object.keys(classGroups).map(cls => {
    const rows = classGroups[cls]
    const students = new Set(rows.map(r => r.student_id)).size
    const subjects = new Set(rows.map(r => r.subject)).size
    const pending = rows.filter(r => r.status === 'compiled').length
    const approved = rows.filter(r => r.status === 'approved').length
    const published = rows.filter(r => r.status === 'published').length
    return { class: cls, students, subjects, pending, approved, published, total: rows.length }
  })

  const totalCompiled = compiled.length
  const totalApproved = compiled.filter(r => r.status === 'approved').length
  const totalPublished = compiled.filter(r => r.status === 'published').length
  const totalPending = compiled.filter(r => r.status === 'compiled').length

  const handleApprove = async (className?: string) => {
    setApproving(true)
    try {
      const params = new URLSearchParams({ action: 'approve', academicSession, term })
      if (className) params.set('class', className)
      const res = await tenantApiPut(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        toast({
          title: 'Results approved',
          description: `${data.approved || 0} result(s) approved for ${className || 'all classes'}.`,
        })
        loadCompiled()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data.error || 'Failed to approve', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setApproving(false)
    }
  }

  const handlePublish = async (className?: string) => {
    setApproving(true)
    try {
      const params = new URLSearchParams({ action: 'publish', academicSession, term })
      if (className) params.set('class', className)
      const res = await tenantApiPut(`/api/tenant/results?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        toast({
          title: 'Results published',
          description: `${data.published || 0} result(s) published for ${className || 'all classes'}.`,
        })
        loadCompiled()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data.error || 'Failed to publish', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setApproving(false)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'published') return <Badge variant="default">Published</Badge>
    if (status === 'approved') return <Badge variant="default">Approved</Badge>
    if (status === 'compiled') return <Badge variant="secondary">Pending Approval</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Finalization workflow</p>
          <h1 className="text-2xl font-bold text-gray-900">Result Approval</h1>
          <p className="text-sm text-gray-600">Review compiled results, approve, and publish to students and parents.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => handleApprove()} disabled={approving || totalPending === 0}>
            {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Approve All Pending
          </Button>
          <Button onClick={() => handlePublish()} disabled={approving || totalApproved === 0}>
            {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Publish Approved
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total compiled</p>
          <p className="text-3xl font-semibold text-gray-900">{totalCompiled}</p>
          <p className="text-xs text-gray-500">{classSummaries.length} classes</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Pending approval</p>
          <p className="text-3xl font-semibold text-amber-600">{totalPending}</p>
          <p className="text-xs text-gray-500">Awaiting review</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Approved</p>
          <p className="text-3xl font-semibold text-blue-600">{totalApproved}</p>
          <p className="text-xs text-gray-500">Ready to publish</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">Published</p>
          <p className="text-3xl font-semibold text-emerald-600">{totalPublished}</p>
          <p className="text-xs text-gray-500">Visible to students/parents</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scope Selection</CardTitle>
          <CardDescription>Select academic session, term, and optional class filter.</CardDescription>
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
              <Label className="text-xs text-gray-500">Class (optional)</Label>
              <ClassArmSelect value={selectedClass} onChange={setSelectedClass} allowAll allLabel="All Classes" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class-level approval summary */}
      {classSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Class Approval Summary</CardTitle>
            <CardDescription>Review and approve results by class before publishing.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSummaries.map(cs => (
                  <TableRow key={cs.class}>
                    <TableCell className="font-medium text-gray-900">{cs.class}</TableCell>
                    <TableCell>{cs.students}</TableCell>
                    <TableCell>{cs.subjects}</TableCell>
                    <TableCell>{cs.total}</TableCell>
                    <TableCell><Badge variant="secondary">{cs.pending}</Badge></TableCell>
                    <TableCell><Badge variant="default">{cs.approved}</Badge></TableCell>
                    <TableCell><Badge variant="default">{cs.published}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleApprove(cs.class)} disabled={approving || cs.pending === 0} title="Approve class">
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePublish(cs.class)} disabled={approving || cs.approved === 0} title="Publish class">
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed compiled results */}
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Compiled Results Detail</CardTitle>
            <CardDescription>Individual student results with grades, positions, and remarks.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadCompiled} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading compiled results...
            </div>
          ) : compiled.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No compiled results for {term} {academicSession}.</p>
              <p className="text-xs text-gray-400 mt-1">Compile results in Result Computation first, then return here to approve.</p>
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compiled.slice(0, 100).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-gray-900">{r.student_id}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell>{r.class}</TableCell>
                    <TableCell className="font-medium">{Number(r.total_score)}</TableCell>
                    <TableCell>
                      <Badge variant={r.grade.startsWith('A') || r.grade.startsWith('B') ? 'default' : r.grade.startsWith('F') ? 'destructive' : 'secondary'}>
                        {r.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{r.remark}</TableCell>
                    <TableCell>{r.subject_position}</TableCell>
                    <TableCell>{r.class_position} of {r.total_students}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {compiled.length > 100 && (
            <p className="text-xs text-gray-400 mt-2 text-center">Showing first 100 of {compiled.length} records</p>
          )}
        </CardContent>
      </Card>

      {totalPending > 0 && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            {totalPending} result(s) are pending approval. Review the compiled grades and positions above,
            then click "Approve All Pending" to move them to the approval stage. Once approved, click "Publish Approved" to make results visible to students and parents.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
export default ResultApproval;
