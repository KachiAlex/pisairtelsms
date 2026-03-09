import React from 'react'
import { Gauge, ClipboardList, Edit3, CheckCircle2, AlertTriangle, Clock3, GitCompareArrows, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const assessmentWeights = [
  { level: 'Primary', tests: 30, assignments: 20, projects: 10, exams: 40 },
  { level: 'JSS', tests: 25, assignments: 15, projects: 10, exams: 50 },
  { level: 'SSS', tests: 20, assignments: 15, projects: 15, exams: 50 },
]

const overrideRequests = [
  { term: 'First Term', subject: 'Further Math', reason: 'External curriculum alignment', status: 'Awaiting QA', impact: 'Affects SS2 science stream', risk: 'High' },
  { term: 'Second Term', subject: 'Basic Tech', reason: 'Project-based pilot', status: 'In review', impact: 'JSS3 technical cohort', risk: 'Medium' },
]

const moderationChecks = [
  { label: 'Score normalization', detail: 'Auto-enabled for all SS classes', status: 'Active' },
  { label: 'Outlier detection', detail: 'Two classes flagged last term', status: 'Monitoring' },
  { label: 'Result approval SLA', detail: '48hr SLA across departments', status: 'Healthy' },
]

const scenarioComparison = [
  {
    label: 'Current template',
    tests: 25,
    assignments: 15,
    projects: 10,
    exams: 50,
    effect: 'Balanced weighting for CA-heavy schools',
  },
  {
    label: 'Proposed STEM pilot',
    tests: 20,
    assignments: 20,
    projects: 15,
    exams: 45,
    effect: 'Adds more project signals for Maker labs',
  },
]

const auditTrail = [
  { actor: 'Dr. Tolu Adisa', role: 'Academic Head', action: 'Published CA template', timestamp: 'Jan 08, 2026 – 08:42' },
  { actor: 'QA Desk', role: 'Quality Assurance', action: 'Reviewed override backlog', timestamp: 'Jan 15, 2026 – 16:12' },
  { actor: 'Assessment Ops', role: 'Operations', action: 'Synced template to all classes', timestamp: 'Jan 16, 2026 – 09:27' },
]

export function CAConfiguration() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Assessment playbook</p>
          <h1 className="text-2xl font-bold text-gray-900">CA configuration</h1>
          <p className="text-sm text-gray-600">Set standardized continuous assessment weights and guardrails.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Edit3 className="h-4 w-4 mr-2" /> Edit current template
          </Button>
          <Button>
            <ClipboardList className="h-4 w-4 mr-2" /> Publish to classes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Gauge className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Sessions using template</p>
            <p className="text-3xl font-semibold text-gray-900">6</p>
            <p className="text-xs text-gray-500">2022 - 2027</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Compliance score</p>
            <p className="text-3xl font-semibold text-gray-900">98%</p>
            <p className="text-xs text-gray-500">Last audit Jan 12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Override requests</p>
            <p className="text-3xl font-semibold text-gray-900">4</p>
            <p className="text-xs text-gray-500">2 pending QA review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <Clock3 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Next recalibration</p>
            <p className="text-3xl font-semibold text-gray-900">18 days</p>
            <p className="text-xs text-gray-500">Triggered every mid-term</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default weight template</CardTitle>
          <CardDescription>Applies to all classes unless overridden.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Exams</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessmentWeights.map((row) => (
                  <TableRow key={row.level}>
                    <TableCell className="font-semibold text-gray-900">{row.level}</TableCell>
                    <TableCell>{row.tests}%</TableCell>
                    <TableCell>{row.assignments}%</TableCell>
                    <TableCell>{row.projects}%</TableCell>
                    <TableCell>{row.exams}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Term</p>
              <Input value="2025/2026 • First Term" readOnly className="bg-gray-50" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Effective from</p>
              <Input value="08 Jan 2026" readOnly className="bg-gray-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario comparison</CardTitle>
          <CardDescription>Preview impact before committing template changes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {scenarioComparison.map((scenario) => (
            <div key={scenario.label} className="rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{scenario.label}</p>
                  <p className="text-xs text-gray-500">{scenario.effect}</p>
                </div>
                <GitCompareArrows className="h-4 w-4 text-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <span>Tests: <span className="text-gray-900 font-medium">{scenario.tests}%</span></span>
                <span>Assignments: <span className="text-gray-900 font-medium">{scenario.assignments}%</span></span>
                <span>Projects: <span className="text-gray-900 font-medium">{scenario.projects}%</span></span>
                <span>Exams: <span className="text-gray-900 font-medium">{scenario.exams}%</span></span>
              </div>
              <Button variant="outline" size="sm">Simulate</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Override requests</CardTitle>
            <CardDescription>Department-led adjustments awaiting sign-off.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overrideRequests.map((request) => (
              <div key={request.subject} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{request.subject}</p>
                    <p className="text-xs text-gray-500">{request.term}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{request.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">{request.reason}</p>
                <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                  <span className="font-medium text-gray-900">Impact: {request.impact}</span>
                  <span className={request.risk === 'High' ? 'text-rose-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    Risk: {request.risk}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline">Review</Button>
                  <Button size="sm" variant="ghost" className="text-rose-600">Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moderation controls</CardTitle>
            <CardDescription>Automations that keep CA data clean.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moderationChecks.map((check) => (
              <div key={check.label} className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">{check.label}</p>
                <p className="text-xs text-gray-500">{check.detail}</p>
                <Badge variant="outline" className="text-[11px] mt-2">{check.status}</Badge>
              </div>
            ))}
            <Button className="w-full" variant="outline">
              <Gauge className="h-4 w-4 mr-2" /> Configure moderation
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publishing trail</CardTitle>
          <CardDescription>Every edit is logged for compliance and rollback.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditTrail.map((entry) => (
            <div key={entry.timestamp} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{entry.actor}</p>
                <p className="text-xs text-gray-500">{entry.role}</p>
              </div>
              <div className="text-sm text-gray-600 flex-1">
                {entry.action}
              </div>
              <p className="text-xs text-gray-400">{entry.timestamp}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
export default CAConfiguration;
