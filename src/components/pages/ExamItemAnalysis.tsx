import React from 'react'
import { BarChart3, Filter, RefreshCcw, AlertTriangle, Target, Layers, Atom, ClipboardCheck } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const itemHighlights = [
  { code: 'MTH-22-Q18', difficulty: 0.42, discrimination: 0.68, flagged: 'Stable', responses: 864 },
  { code: 'PHY-11-Q05', difficulty: 0.83, discrimination: 0.22, flagged: 'Low disc', responses: 752 },
  { code: 'ENG-33-Q09', difficulty: 0.57, discrimination: 0.61, flagged: 'Stable', responses: 902 },
]

const distractorStats = [
  { code: 'CHE-09-Q14', distractor: 'B', picks: 41, quality: 'Spike' },
  { code: 'GEO-04-Q02', distractor: 'D', picks: 12, quality: 'Weak' },
  { code: 'BIO-15-Q11', distractor: 'C', picks: 63, quality: 'Healthy' },
]

const blueprintCoverage = [
  { strand: 'Quantitative Reasoning', coverage: 78 },
  { strand: 'Applied Sciences', coverage: 62 },
  { strand: 'Language Skills', coverage: 91 },
]

const anchorStability = [
  { anchor: 'Anchor Set A', drift: '0.28σ', status: 'Within band' },
  { anchor: 'Anchor Set B', drift: '0.72σ', status: 'Review' },
  { anchor: 'Anchor Set C', drift: '0.11σ', status: 'Within band' },
]

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
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Exam item analysis</h1>
          <p className="text-sm text-gray-600">Inspect item difficulty drift, distractor performance, and blueprint coverage before high-stakes sittings.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Recompute indices
          </Button>
          <Button>
            <Filter className="h-4 w-4 mr-2" /> Apply filters
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Items analyzed</p>
            <p className="text-3xl font-semibold text-gray-900">1,240</p>
            <p className="text-xs text-gray-500">Across 14 papers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Flagged variance</p>
            <p className="text-3xl font-semibold text-amber-600">4.8%</p>
            <p className="text-xs text-gray-500">Need psychometric review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Anchor stability</p>
            <p className="text-3xl font-semibold text-emerald-600">92%</p>
            <p className="text-xs text-gray-500">Within tolerance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Blueprint coverage</p>
            <p className="text-3xl font-semibold text-gray-900">88%</p>
            <p className="text-xs text-gray-500">Target ≥ 90%</p>
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
                <TableHead>Item code</TableHead>
                <TableHead>Difficulty (p)</TableHead>
                <TableHead>Discrimination</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemHighlights.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="font-medium text-gray-900">{item.code}</TableCell>
                  <TableCell>{(item.difficulty * 100).toFixed(0)}%</TableCell>
                  <TableCell>{item.discrimination.toFixed(2)}</TableCell>
                  <TableCell>{item.responses.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.flagged] || 'secondary'}>{item.flagged}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distractor diagnostics</CardTitle>
            <CardDescription>Spot answer choices that attract abnormal picks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {distractorStats.map((entry) => (
              <div key={entry.code} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{entry.code}</p>
                  <p className="text-sm text-gray-500">Distractor {entry.distractor} • {entry.picks} picks</p>
                </div>
                <Badge variant={statusVariant[entry.quality] || 'secondary'}>{entry.quality}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" /> View IRT chart
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blueprint coverage</CardTitle>
            <CardDescription>Distribution across curriculum strands.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blueprintCoverage.map((strand) => (
              <div key={strand.strand} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{strand.strand}</p>
                  <span className="text-sm text-gray-500">{strand.coverage}%</span>
                </div>
                <div className="mt-2">
                  <Progress value={strand.coverage} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Layers className="h-4 w-4 mr-2" /> Edit blueprint
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anchor stability</CardTitle>
          <CardDescription>Monitor drift for linked test forms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {anchorStability.map((anchor) => (
            <div key={anchor.anchor} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{anchor.anchor}</p>
                <p className="text-sm text-gray-500">Drift {anchor.drift}</p>
              </div>
              <Badge variant={statusVariant[anchor.status] || 'secondary'}>{anchor.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Physics item PHY-11-Q05 has low discrimination. Flag for content review before adopting in March session.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Target className="h-4 w-4 mr-2" /> Assign reviewer
          </Button>
          <Button size="sm">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Approve replacement
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <Atom className="h-5 w-5 text-slate-500" />
          <p>Need deeper psychometric modeling? Export calibrated parameters to the research workspace.</p>
        </div>
        <Button variant="outline" size="sm">
          <Layers className="h-4 w-4 mr-2" /> Export IRT params
        </Button>
      </div>
    </div>
  )
}
export default ExamItemAnalysis;
