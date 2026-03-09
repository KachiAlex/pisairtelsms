import React from 'react'
import { Scale, Edit3, Save, ShieldCheck, Calculator, AlertTriangle, FileText, ArrowUpWideNarrow } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const gradingBands = [
  { grade: 'A1', range: '80 - 100', remark: 'Distinction', weight: '4.0', color: 'text-emerald-600' },
  { grade: 'B2', range: '70 - 79', remark: 'Very Good', weight: '3.6', color: 'text-emerald-500' },
  { grade: 'B3', range: '65 - 69', remark: 'Good', weight: '3.2', color: 'text-emerald-500' },
  { grade: 'C4', range: '60 - 64', remark: 'Credit', weight: '3.0', color: 'text-amber-500' },
  { grade: 'C5', range: '55 - 59', remark: 'Credit', weight: '2.8', color: 'text-amber-500' },
  { grade: 'C6', range: '50 - 54', remark: 'Satisfactory', weight: '2.5', color: 'text-amber-600' },
  { grade: 'D7', range: '45 - 49', remark: 'Pass', weight: '2.0', color: 'text-rose-500' },
  { grade: 'E8', range: '40 - 44', remark: 'Marginal', weight: '1.5', color: 'text-rose-500' },
  { grade: 'F9', range: '0 - 39', remark: 'Fail', weight: '0.0', color: 'text-rose-600' },
]

const equivalencySets = [
  { id: 'WAEC', status: 'Live', description: 'Nigeria senior secondary examinations equivalence', coverage: 100 },
  { id: 'Cambridge', status: 'Draft', description: 'IGCSE/A-Level translation for transcripts', coverage: 72 },
  { id: 'Local Primary', status: 'Live', description: 'Primary bands for term reports', coverage: 94 },
]

const policyRules = [
  { label: 'Minimum pass mark', value: '45%', owner: 'Academics', status: 'Active' },
  { label: 'Distinction threshold', value: '80%', owner: 'Academic Board', status: 'Active' },
  { label: 'Remediation trigger', value: 'Average < 50%', owner: 'Student Support', status: 'Active' },
]

const auditFeed = [
  { id: 'AUD-982', actor: 'QA Desk', event: 'Adjusted C5 range to start @55', time: 'Today 08:14' },
  { id: 'AUD-979', actor: 'Academic Director', event: 'Published Cambridge equivalence draft', time: 'Yesterday' },
  { id: 'AUD-974', actor: 'System', event: 'Synced grading weights to computation engine', time: 'Mon' },
]

const statusVariant: Record<string, 'default' | 'secondary'> = {
  Live: 'default',
  Draft: 'secondary',
}

export function GradingScale() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900">Grading scale</h1>
          <p className="text-sm text-gray-600">Control grade bands, GPA weights, and equivalency mappings for every division.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Edit3 className="h-4 w-4 mr-2" /> Edit ranges
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" /> Publish update
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Grade bands</p>
            <p className="text-3xl font-semibold text-gray-900">9</p>
            <p className="text-xs text-gray-500">Primary + Secondary</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <Calculator className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">GPA weight model</p>
            <p className="text-3xl font-semibold text-gray-900">4.0</p>
            <p className="text-xs text-gray-500">Weighted per subject credits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Policy version</p>
            <p className="text-3xl font-semibold text-gray-900">v3.1</p>
            <p className="text-xs text-gray-500">Effective Feb 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Open alerts</p>
            <p className="text-3xl font-semibold text-rose-600">1</p>
            <p className="text-xs text-gray-500">Cambridge mapping needs review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grade bands</CardTitle>
          <CardDescription>Used on report cards, transcripts, and analytics.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Range</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>GPA weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradingBands.map((band) => (
                <TableRow key={band.grade}>
                  <TableCell className={`font-semibold ${band.color}`}>{band.grade}</TableCell>
                  <TableCell>{band.range}</TableCell>
                  <TableCell>{band.remark}</TableCell>
                  <TableCell>{band.weight}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equivalency sets</CardTitle>
            <CardDescription>Map Scholix scores to regional reporting standards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {equivalencySets.map((set) => (
              <div key={set.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{set.id}</p>
                  <p className="text-sm text-gray-600">{set.description}</p>
                  <p className="text-xs text-gray-400">Coverage: {set.coverage}% of subjects</p>
                </div>
                <Badge variant={statusVariant[set.status] || 'secondary'}>{set.status}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <ArrowUpWideNarrow className="h-4 w-4 mr-2" /> Import mapping
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy rules</CardTitle>
            <CardDescription>Guardrails consumed by result computation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {policyRules.map((rule) => (
              <div key={rule.label} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{rule.label}</p>
                  <p className="text-sm text-gray-500">{rule.value}</p>
                </div>
                <Badge variant="secondary">Owner: {rule.owner}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Scale className="h-4 w-4 mr-2" /> Edit policy
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit feed</CardTitle>
          <CardDescription>Every grading scale change is logged with actor context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditFeed.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{entry.actor}</p>
                <p className="text-sm text-gray-500">{entry.event}</p>
              </div>
              <p className="text-xs text-gray-400">{entry.time}</p>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full">
            <FileText className="h-4 w-4 mr-2" /> Export change log
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Cambridge mapping coverage is 72%. Finish the remaining subjects before transcript season.</p>
        </div>
        <Button size="sm">
          <ShieldCheck className="h-4 w-4 mr-2" /> Assign reviewer
        </Button>
      </div>
    </div>
  )
}
export default GradingScale;
