import React, { useMemo, useState } from 'react'
import { Scale, ShieldCheck, Layers, BookMarked, Download, Edit3, TrendingUp, FileText } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

const gradingBands = [
  { grade: 'A1', min: 80, max: 100, remark: 'Distinction', descriptor: 'Exemplary mastery of outcomes' },
  { grade: 'B2', min: 70, max: 79, remark: 'Very Good', descriptor: 'Above grade-level expectations' },
  { grade: 'B3', min: 65, max: 69, remark: 'Good', descriptor: 'Secure understanding with polish needed' },
  { grade: 'C4', min: 60, max: 64, remark: 'Credit', descriptor: 'Meets core outcomes' },
  { grade: 'C5', min: 55, max: 59, remark: 'Credit', descriptor: 'Requires targeted reinforcement' },
  { grade: 'C6', min: 50, max: 54, remark: 'Satisfactory', descriptor: 'Basic proficiency demonstrated' },
  { grade: 'D7', min: 45, max: 49, remark: 'Pass', descriptor: 'Below mastery; remediation recommended' },
  { grade: 'E8', min: 40, max: 44, remark: 'Marginal', descriptor: 'Significant reinforcement required' },
  { grade: 'F9', min: 0, max: 39, remark: 'Fail', descriptor: 'Does not meet minimum outcomes' },
]

const promotionRules = {
  core: [
    { label: 'Minimum average for promotion', value: '50%', status: 'Active' },
    { label: 'Maximum failed subjects allowed', value: '2 core subjects', status: 'Active' },
  ],
  elective: [
    { label: 'Minimum elective average', value: '45%', status: 'Active' },
    { label: 'Allowed elective drops', value: '1 per year', status: 'Active' },
  ],
  universal: [{ label: 'Mandatory remediation window', value: '4 weeks after term', status: 'Active' }],
}

const moderationTimeline = [
  { phase: 'Teacher upload', sla: '5 days post exam', owner: 'Subject teacher', status: 'On track' },
  { phase: 'HOD verification', sla: '3 days', owner: 'Department lead', status: 'On track' },
  { phase: 'QA moderation', sla: '2 days', owner: 'QA desk', status: 'Risk', delta: '+1.2d vs target' },
  { phase: 'Principal approval', sla: '2 days', owner: 'Academic head', status: 'On track' },
]

const reportPreview = {
  student: 'Kelechi Obasi',
  level: 'SS2 Science',
  summary: [
    { subject: 'Mathematics', score: 86, grade: 'A1', remark: 'Distinction', teacher: 'Angela Ojo' },
    { subject: 'Chemistry', score: 73, grade: 'B2', remark: 'Very Good', teacher: 'Sola Eke' },
    { subject: 'English', score: 65, grade: 'B3', remark: 'Good', teacher: 'Lara Ajayi' },
  ],
  footer: 'Promotion status: Eligible • Conduct: Excellent',
}

export function GradingPolicy() {
  const [ruleView, setRuleView] = useState<'core' | 'elective'>('core')

  const displayedRules = useMemo(() => {
    return ruleView === 'core'
      ? [...promotionRules.core, ...promotionRules.universal]
      : [...promotionRules.elective, ...promotionRules.universal]
  }, [ruleView])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Result governance</p>
          <h1 className="text-2xl font-bold text-gray-900">Grading policy</h1>
          <p className="text-sm text-gray-600">Control grade bands, promotion rules, and moderation guardrails.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export policy
          </Button>
          <Button>
            <Edit3 className="h-4 w-4 mr-2" /> Update version
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Current policy version</p>
            <p className="text-3xl font-semibold text-gray-900">v5.2</p>
            <p className="text-xs text-gray-500">Effective Jan 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Regulatory alignment</p>
            <p className="text-3xl font-semibold text-gray-900">WAEC</p>
            <p className="text-xs text-gray-500">NECO + Cambridge adjustments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Band templates</p>
            <p className="text-3xl font-semibold text-gray-900">3</p>
            <p className="text-xs text-gray-500">Primary • JSS • SSS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <BookMarked className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Moderation alerts</p>
            <p className="text-3xl font-semibold text-gray-900">2</p>
            <p className="text-xs text-gray-500">Outlier classes flagged</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grade bands</CardTitle>
          <CardDescription>Descriptors shown on report cards and transcripts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Score range</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradingBands.map((band) => (
                  <TableRow key={band.grade}>
                    <TableCell className="font-semibold text-gray-900">{band.grade}</TableCell>
                    <TableCell>
                      {band.min} - {band.max}
                    </TableCell>
                    <TableCell>{band.remark}</TableCell>
                    <TableCell className="text-sm text-gray-500">{band.descriptor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Promotion rules</CardTitle>
            <CardDescription>Default logic applied during result computation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 text-xs">
              {(['core', 'elective'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRuleView(mode)}
                  className={`px-3 py-1 rounded-full border transition ${
                    ruleView === mode ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {mode === 'core' ? 'Core criteria' : 'Elective criteria'}
                </button>
              ))}
            </div>
            {displayedRules.map((rule) => (
              <div key={rule.label} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{rule.label}</p>
                    <p className="text-xs text-gray-500">{rule.value}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{rule.status}</Badge>
                </div>
              </div>
            ))}
            <Button variant="outline">
              <Scale className="h-4 w-4 mr-2" /> Edit thresholds
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moderation timeline</CardTitle>
            <CardDescription>Track SLAs from teacher upload to approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moderationTimeline.map((phase) => (
              <div key={phase.phase} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{phase.phase}</p>
                  <p className="text-xs text-gray-500">SLA: {phase.sla}</p>
                  <p className="text-[11px] text-gray-400">Owner: {phase.owner}</p>
                </div>
                <div className="text-right">
                  <Badge variant={phase.status === 'Risk' ? 'destructive' : 'secondary'} className="text-[11px]">
                    {phase.status}
                  </Badge>
                  {phase.delta && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {phase.delta}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <Input placeholder="Add moderation step" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report card preview</CardTitle>
          <CardDescription>How learners experience the policy on their portals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p className="text-gray-900 font-semibold">{reportPreview.student}</p>
              <p className="text-xs text-gray-500">{reportPreview.level}</p>
            </div>
            <Badge variant="outline">Term summary</Badge>
          </div>
          <div className="rounded-2xl border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Teacher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportPreview.summary.map((row) => (
                  <TableRow key={row.subject}>
                    <TableCell className="font-semibold text-gray-900">{row.subject}</TableCell>
                    <TableCell>{row.score}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{row.grade}</Badge>
                    </TableCell>
                    <TableCell>{row.remark}</TableCell>
                    <TableCell>{row.teacher}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-600 flex items-center justify-between">
            <span>{reportPreview.footer}</span>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" /> See full report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default GradingPolicy;
