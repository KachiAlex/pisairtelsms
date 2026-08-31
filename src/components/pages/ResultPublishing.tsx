import React, { useState, useEffect, useCallback } from 'react'
import { Rocket, Undo2, RefreshCw, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ClassArmSelect } from '../ui/class-arm-select'
import { useToast } from '../ui/use-toast'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'

interface PublishingStats {
  total: number
  compiled: number
  approved: number
  published: number
  studentsNotified: number
}

interface ClassSummary {
  class: string
  total: number
  compiled: number
  approved: number
  published: number
  students: number
}

interface PublishedResult {
  class: string
  student_id: string
  published_at: string
  subjects: number
  overall_total: number
  overall_average: number
  class_position: number
  attendance_percent: number
}

export function ResultPublishing() {
  const { toast } = useToast()
  const [academicSession, setAcademicSession] = useState('')
  const [term, setTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')

  const [stats, setStats] = useState<PublishingStats | null>(null)
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([])
  const [publishedList, setPublishedList] = useState<PublishedResult[]>([])

  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const y = now.getFullYear()
    setAcademicSession(`${y}/${y + 1}`)
    setTerm('First Term')
  }, [])

  const loadData = useCallback(async () => {
    if (!academicSession || !term) return
    setLoading(true)
    setError(null)
    try {
      const classParam = selectedClass ? `&class=${encodeURIComponent(selectedClass)}` : ''
      const [statsRes, classRes, pubRes] = await Promise.all([
        tenantApiGet(`/api/tenant/result-publishing/stats?academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}${classParam}`),
        tenantApiGet(`/api/tenant/result-publishing/class-summaries?academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}`),
        tenantApiGet(`/api/tenant/result-publishing/published-list?academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}${classParam}`),
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        if (data.success) setStats(data.data)
      }
      if (classRes.ok) {
        const data = await classRes.json()
        if (data.success) setClassSummaries(data.data || [])
      }
      if (pubRes.ok) {
        const data = await pubRes.json()
        if (data.success) setPublishedList(data.data || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load publishing data')
    } finally {
      setLoading(false)
    }
  }, [academicSession, term, selectedClass])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePublish = async () => {
    if (!academicSession || !term) return
    setPublishing(true)
    try {
      const classParam = selectedClass ? `&class=${encodeURIComponent(selectedClass)}` : ''
      const res = await tenantApiPost(`/api/tenant/result-publishing/publish?academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}${classParam}`)
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Results published', description: data.message })
        loadData()
      } else {
        toast({ title: 'Publishing failed', description: data.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' })
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!academicSession || !term) return
    setUnpublishing(true)
    try {
      const classParam = selectedClass ? `&class=${encodeURIComponent(selectedClass)}` : ''
      const res = await tenantApiPost(`/api/tenant/result-publishing/unpublish?academicSession=${encodeURIComponent(academicSession)}&term=${encodeURIComponent(term)}${classParam}`)
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Results unpublished', description: data.message })
        loadData()
      } else {
        toast({ title: 'Unpublish failed', description: data.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' })
    } finally {
      setUnpublishing(false)
    }
  }

  const canPublish = (stats?.approved ?? 0) > 0
  const canUnpublish = (stats?.published ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Release operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Result publishing</h1>
          <p className="text-sm text-gray-600">Publish approved results so students and parents can view them.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={handlePublish} disabled={publishing || !canPublish}>
            <Rocket className="h-4 w-4 mr-2" /> {publishing ? 'Publishing...' : 'Publish results'}
          </Button>
          <Button variant="outline" onClick={handleUnpublish} disabled={unpublishing || !canUnpublish}>
            <Undo2 className="h-4 w-4 mr-2" /> {unpublishing ? 'Reverting...' : 'Unpublish'}
          </Button>
        </div>
      </div>

      {/* Selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Academic session</Label>
              <Input value={academicSession} onChange={e => setAcademicSession(e.target.value)} placeholder="e.g. 2025/2026" />
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
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total results</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.total ?? 0}</p>
            <p className="text-xs text-gray-500">All compiled results</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Awaiting approval</p>
            <p className="text-3xl font-semibold text-amber-600">{stats?.compiled ?? 0}</p>
            <p className="text-xs text-gray-500">Compiled, not yet approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Ready to publish</p>
            <p className="text-3xl font-semibold text-blue-600">{stats?.approved ?? 0}</p>
            <p className="text-xs text-gray-500">Approved, awaiting publication</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Published</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats?.published ?? 0}</p>
            <p className="text-xs text-gray-500">Visible to students & parents</p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow guidance */}
      {stats && stats.total > 0 && stats.approved > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>{stats.approved}</strong> result(s) are approved and ready to publish.
            Click "Publish results" to make them visible to students and parents.
          </AlertDescription>
        </Alert>
      )}

      {stats && stats.total > 0 && stats.approved === 0 && stats.published === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All results are compiled but none have been approved yet. Use the <strong>Result Approval</strong> tab to approve results before publishing.
          </AlertDescription>
        </Alert>
      )}

      {stats && stats.total === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No compiled results found for this session/term. Use the <strong>Result Computation</strong> tab to compile results first, then approve them before publishing.
          </AlertDescription>
        </Alert>
      )}

      {/* Class summaries */}
      {!selectedClass && classSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Class summary</CardTitle>
            <CardDescription>Per-class breakdown of result statuses for this session and term.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Total results</TableHead>
                  <TableHead>Compiled</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSummaries.map((cs) => (
                  <TableRow key={cs.class}>
                    <TableCell className="font-medium text-gray-900">{cs.class}</TableCell>
                    <TableCell>{cs.students}</TableCell>
                    <TableCell>{cs.total}</TableCell>
                    <TableCell>{cs.compiled}</TableCell>
                    <TableCell>{cs.approved}</TableCell>
                    <TableCell>{cs.published}</TableCell>
                    <TableCell>
                      {cs.published > 0 && cs.published === cs.total ? (
                        <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> Published</Badge>
                      ) : cs.approved > 0 ? (
                        <Badge variant="secondary">Ready to publish</Badge>
                      ) : cs.compiled > 0 ? (
                        <Badge variant="warning">Awaiting approval</Badge>
                      ) : (
                        <Badge variant="secondary">No data</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Published results list */}
      {publishedList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Published results</CardTitle>
            <CardDescription>
              {selectedClass
                ? `Published results for ${selectedClass} — ${publishedList.length} student(s).`
                : `${publishedList.length} student(s) with published results.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Overall total</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Published at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedList.map((r, i) => (
                  <TableRow key={`${r.class}-${r.student_id}-${i}`}>
                    <TableCell className="font-medium text-gray-900">{r.class}</TableCell>
                    <TableCell className="text-gray-600">{r.student_id}</TableCell>
                    <TableCell>{r.subjects}</TableCell>
                    <TableCell>{Number(r.overall_total).toFixed(2)}</TableCell>
                    <TableCell>{Number(r.overall_average).toFixed(2)}%</TableCell>
                    <TableCell>{r.class_position || '—'}</TableCell>
                    <TableCell>{Number(r.attendance_percent).toFixed(1)}%</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {r.published_at ? new Date(r.published_at).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Published visibility indicator */}
      {stats && stats.published > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5" />
            <p>{stats.published} result(s) are currently published and visible to students and parents. Use "Unpublish" to revoke access.</p>
          </div>
        </div>
      )}

      {stats && stats.published === 0 && stats.total > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-center gap-3">
            <EyeOff className="h-5 w-5" />
            <p>No results are currently published. Students and parents cannot see results until you publish them.</p>
          </div>
        </div>
      )}
    </div>
  )
}
export default ResultPublishing;
