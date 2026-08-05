import React, { useState, useEffect } from 'react'
import { BarChart3, Filter, RefreshCcw, AlertTriangle, Target, Layers, Atom, ClipboardCheck } from 'lucide-react'

import { tenantApiGet } from '../../lib/tenantApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Stable: 'default',
  'Low disc': 'warning',
  Spike: 'warning',
  Weak: 'secondary',
  Healthy: 'default',
  'Within band': 'default',
  Review: 'warning',
}

export function ExamItemAnalysis() {
  const [items, setItems] = useState<any[]>([])
  const [distractors, setDistractors] = useState<any[]>([])
  const [blueprints, setBlueprints] = useState<any[]>([])
  const [anchors, setAnchors] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exams, setExams] = useState<any[]>([])
  const [selectedExam, setSelectedExam] = useState('')

  useEffect(() => {
    fetchExams()
  }, [])

  useEffect(() => {
    if (selectedExam) {
      fetchData()
    }
  }, [selectedExam])

  const fetchExams = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/exams?status=Completed&limit=50')
      if (res.ok) {
        const data = await res.json()
        const examList = data.data || []
        setExams(examList)
        if (examList.length > 0 && !selectedExam) {
          setSelectedExam(examList[0].id)
        }
      }
    } catch {
      // exams list is optional — user can still use the page if item-analysis backend is available
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [itemsRes, distractorsRes, blueprintsRes, anchorsRes, statsRes] = await Promise.all([
        tenantApiGet(`/api/tenant/exams/item-analysis?examId=${selectedExam}&type=items`),
        tenantApiGet(`/api/tenant/exams/item-analysis?examId=${selectedExam}&type=distractors`),
        tenantApiGet(`/api/tenant/exams/item-analysis?examId=${selectedExam}&type=blueprints`),
        tenantApiGet(`/api/tenant/exams/item-analysis?examId=${selectedExam}&type=anchors`),
        tenantApiGet(`/api/tenant/exams/item-analysis?examId=${selectedExam}&type=statistics`),
      ])

      if (!itemsRes.ok || !distractorsRes.ok || !blueprintsRes.ok || !anchorsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const itemsData = await itemsRes.json()
      const distractorsData = await distractorsRes.json()
      const blueprintsData = await blueprintsRes.json()
      const anchorsData = await anchorsRes.json()
      const statsData = await statsRes.json()

      setItems(itemsData.data || [])
      setDistractors(distractorsData.data || [])
      setBlueprints(blueprintsData.data || [])
      setAnchors(anchorsData.data || [])
      setStatistics(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  if (!selectedExam) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Exam item analysis</h1>
          <p className="text-sm text-gray-600">Inspect item difficulty drift, distractor performance, and blueprint coverage before high-stakes sittings.</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          No completed exams available for analysis. Complete an exam to see item-level analytics here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Exam item analysis</h1>
          <p className="text-sm text-gray-600">Inspect item difficulty drift, distractor performance, and blueprint coverage before high-stakes sittings.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            disabled={exams.length === 0}
          >
            {exams.length === 0 && <option value="">No completed exams</option>}
            {exams.map((exam: any) => (
              <option key={exam.id} value={exam.id}>{exam.title}</option>
            ))}
          </select>
          <Button variant="outline" onClick={fetchData} disabled={!selectedExam}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Recompute indices
          </Button>
          <Button disabled={!selectedExam}>
            <Filter className="h-4 w-4 mr-2" /> Apply filters
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Items analyzed</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.itemsAnalyzed || 0}</p>
            <p className="text-xs text-gray-500">Across papers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Flagged variance</p>
            <p className="text-3xl font-semibold text-amber-600">{statistics?.flaggedVariance || 0}%</p>
            <p className="text-xs text-gray-500">Need psychometric review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Anchor stability</p>
            <p className="text-3xl font-semibold text-emerald-600">{statistics?.anchorStability || 0}</p>
            <p className="text-xs text-gray-500">Within tolerance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg success rate</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.averageSuccessRate || 0}%</p>
            <p className="text-xs text-gray-500">Student performance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item quality matrix</CardTitle>
          <CardDescription>Difficulty (p-value) vs discrimination (point-biserial).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Discrimination</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-gray-900">{item.itemCode}</TableCell>
                    <TableCell>{(item.difficulty * 100).toFixed(1)}%</TableCell>
                    <TableCell>{(item.discrimination * 100).toFixed(1)}%</TableCell>
                    <TableCell>{item.responses}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[item.flagged] || 'secondary'}>{item.flagged}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">No items found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distractor analysis</CardTitle>
            <CardDescription>Distractor quality and pick rates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {distractors.length > 0 ? (
              distractors.slice(0, 5).map((d) => (
                <div key={d.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{d.itemCode} - {d.distractor}</p>
                      <p className="text-sm text-gray-500">{d.picks} picks</p>
                    </div>
                    <Badge variant={statusVariant[d.quality] || 'secondary'}>{d.quality}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No distractor data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blueprint coverage</CardTitle>
            <CardDescription>Content strand coverage analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blueprints.length > 0 ? (
              blueprints.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{b.strand}</p>
                    <p className="text-sm text-gray-500">{b.coverage}%</p>
                  </div>
                  <Progress value={b.coverage} />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No blueprint data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anchor stability</CardTitle>
          <CardDescription>Equating anchor performance across test forms.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anchor Set</TableHead>
                <TableHead>Drift</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anchors.length > 0 ? (
                anchors.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-gray-900">{a.anchor}</TableCell>
                    <TableCell>{a.drift}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[a.status] || 'secondary'}>{a.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500">No anchor data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
export default ExamItemAnalysis;
