import React from 'react'
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Shield,
  GitCompare,
  Clock3,
  FileWarning,
  Settings,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'

const progressionSummary = [
  { label: 'Eligible for promotion', value: 842, trend: '+32 vs last term', icon: <ArrowUpRight className="h-4 w-4" /> },
  { label: 'Require remediation', value: 46, trend: 'Need CA review', icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Recommended for repetition', value: 11, trend: 'Escalate to parents', icon: <ArrowDownRight className="h-4 w-4" /> },
]

const promotions = [
  {
    cohort: 'JSS 2 → JSS 3',
    students: 212,
    actionNeeded: 'Approve 14 remediation plans',
    completion: '88% ready',
    nextStep: 'Awaiting dean approval',
  },
  {
    cohort: 'SS 1 → SS 2',
    students: 187,
    actionNeeded: 'Review 6 disciplinary cases',
    completion: '76% ready',
    nextStep: 'Schedule parent conferences',
  },
  {
    cohort: 'SS 2 → SS 3',
    students: 195,
    actionNeeded: 'Confirm elective selections',
    completion: '91% ready',
    nextStep: 'Push data to exam office',
  },
]

const remediationList = [
  { name: 'Chibuzo Eke', cohort: 'JSS 2 → JSS 3', issue: 'Math CA below threshold', owner: 'Mr. Bello' },
  { name: 'Fatima Abdullahi', cohort: 'SS 1 → SS 2', issue: 'Attendance < 75%', owner: 'Academics' },
  { name: 'Kelvin Ude', cohort: 'SS 2 → SS 3', issue: 'Physics practical resit', owner: 'Lab supervisor' },
]

const workflowStages = [
  {
    title: 'Eligibility scans',
    owner: 'Automations',
    status: 'Complete',
    sla: 'Ran 2h ago',
    icon: <GitCompare className="h-4 w-4" />,
  },
  {
    title: 'Head of department review',
    owner: 'Academic board',
    status: 'In progress',
    sla: '4 cohorts pending',
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: 'Leadership sign-off',
    owner: 'Dean of school',
    status: 'Queued',
    sla: 'Due Friday 4pm',
    icon: <Clock3 className="h-4 w-4" />,
  },
  {
    title: 'Registrar + parent sync',
    owner: 'Student affairs',
    status: 'Not started',
    sla: 'Waiting for exports',
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
]

const pendingCases = [
  { name: 'Ngozi Adeoye', cohort: 'JSS 3 → SS 1', type: 'Promotion', waitingFor: 'Dean approval', aging: '3 days' },
  { name: 'Uche Obi', cohort: 'SS 2 → SS 3', type: 'Promotion', waitingFor: 'Labs clearance', aging: '1 day' },
  { name: 'Amina Bello', cohort: 'SS 1 → SS 1', type: 'Demotion', waitingFor: 'Parent consent', aging: '5 days' },
]

const demotionReviews = [
  { student: 'Haruna Musa', reason: 'Chronic absenteeism', stage: 'Dual approval', owners: 'Counselor + Principal', risk: 'High' },
  { student: 'Rebecca Uwa', reason: 'Behavior contract breach', stage: 'Parent conference', owners: 'Wellness team', risk: 'Medium' },
  { student: 'Zainab Idris', reason: 'Learning support recommendation', stage: 'Academic board', owners: 'Special programs', risk: 'Monitor' },
]

const automationRules = [
  {
    label: 'Auto-flag < 55% aggregate',
    detail: 'Adds student to remediation before board review',
    status: 'Active',
  },
  {
    label: 'Notify guardians on demotion request',
    detail: 'Triggers once counselor logs case note',
    status: 'Active',
  },
  {
    label: 'Sync promotion list to SIS',
    detail: 'Exports CSV nightly during exam season',
    status: 'Paused',
  },
]

export function StudentPromotion() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Progression</p>
          <h1 className="text-2xl font-bold text-gray-900">Promotion & demotion</h1>
          <p className="text-sm text-gray-600">Run eligibility checks, escalate risks, and finalize next-term placement.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Export promotion memo
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Launch bulk workflow
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {progressionSummary.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                {metric.icon}
                <span>{metric.label}</span>
              </div>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{metric.value}</p>
              <p className="text-xs text-emerald-600 mt-1">{metric.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Promotion readiness</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {promotions.map((flow) => (
            <div key={flow.cohort} className="rounded-2xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{flow.cohort}</p>
                <Badge variant="outline">{flow.completion}</Badge>
              </div>
              <p className="text-xs text-gray-500">{flow.students} students</p>
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
                <p className="font-semibold">Action needed</p>
                <p>{flow.actionNeeded}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
                <p className="font-semibold">Next step</p>
                <p>{flow.nextStep}</p>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-blue-600">
                Open cohort workflow
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-emerald-600" />
              Retention guardrails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Dual-approval enabled for demotions</span>
              <Badge variant="outline">On</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Parent notification policy</span>
              <Badge variant="outline">48h before change</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Academic board review</span>
              <Badge variant="outline">Weekly</Badge>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600">
              Manage policies
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Remediation queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {remediationList.map((item) => (
              <div key={item.name} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.cohort}</p>
                <p className="text-xs text-amber-700 mt-1">{item.issue}</p>
                <p className="text-xs text-gray-500">Owner: {item.owner}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              View remediation tracker
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock3 className="h-4 w-4 text-blue-600" />
              Workflow timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowStages.map((stage, index) => (
              <div key={stage.title} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center">
                    {stage.icon}
                  </div>
                  {index !== workflowStages.length - 1 && <div className="h-10 w-px bg-blue-100" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{stage.title}</p>
                  <p className="text-xs text-gray-500">Owner: {stage.owner}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{stage.status}</Badge>
                    <span className="text-gray-500">{stage.sla}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileWarning className="h-4 w-4 text-amber-600" />
              Pending approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Waiting for</TableHead>
                  <TableHead className="text-right">Aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCases.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.cohort}</TableCell>
                    <TableCell>
                      <Badge variant={row.type === 'Promotion' ? 'secondary' : 'outline'}>{row.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{row.waitingFor}</TableCell>
                    <TableCell className="text-right text-sm text-gray-500">{row.aging}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="ghost" size="sm" className="mt-4 text-blue-600">
              View escalation board
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowDownRight className="h-4 w-4 text-rose-600" />
              Demotion oversight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demotionReviews.map((caseItem) => (
              <div key={caseItem.student} className="rounded-2xl border border-red-50 bg-rose-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{caseItem.student}</p>
                  <Badge variant="outline">{caseItem.stage}</Badge>
                </div>
                <p className="text-xs text-rose-700 mt-1">{caseItem.reason}</p>
                <div className="text-xs text-gray-600 flex flex-wrap items-center gap-3 mt-2">
                  <span>Owners: {caseItem.owners}</span>
                  <Badge variant="secondary">Risk: {caseItem.risk}</Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              Open demotion matrix
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4 text-gray-800" />
              Automation rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            {automationRules.map((rule) => (
              <div key={rule.label} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{rule.status}</span>
                  <Badge variant="outline">Workflow</Badge>
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">{rule.label}</p>
                <p>{rule.detail}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-blue-600">
              Manage automations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default StudentPromotion;
