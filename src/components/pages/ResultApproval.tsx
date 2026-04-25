import React, { useState } from 'react'
import { CheckCircle2, ShieldCheck, AlertTriangle, Stamp, Send, Layers, CalendarClock, UserCheck } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const approvalQueue = [
  { id: 'APP-301', cohort: 'JSS 2', owner: 'Mrs. Angela Ojo', stage: 'Academic Director', submitted: '08:10 AM', sla: 'Due in 2 hrs', status: 'In review' },
  { id: 'APP-298', cohort: 'SS 1 Science', owner: 'Mr. Idris Lawal', stage: 'QA Desk', submitted: 'Yesterday', sla: 'Due in 6 hrs', status: 'Escalated' },
  { id: 'APP-295', cohort: 'Primary 5', owner: 'Ms. Yemi Thomas', stage: 'Principal sign-off', submitted: 'Today', sla: 'Due tomorrow', status: 'Pending' },
]

const moderationTimeline = [
  { id: 'timeline-1', title: 'Class teacher sign-off', owner: 'Homeroom advisors', eta: 'Complete', status: 'Done' },
  { id: 'timeline-2', title: 'HOD moderation', owner: 'Department leads', eta: '6 hrs', status: 'In progress' },
  { id: 'timeline-3', title: 'Academic director approval', owner: 'Academics', eta: 'Starts 4 PM', status: 'Queued' },
  { id: 'timeline-4', title: 'Principal seal', owner: 'Principal', eta: 'Tomorrow AM', status: 'Pending' },
]

const escalationCases = [
  { id: 'ESC-112', label: 'Mathematics scores missing remarks', severity: 'high', owner: 'Academics QA', submitted: '20 mins ago' },
  { id: 'ESC-109', label: 'Biology practical moderation pending', severity: 'medium', owner: 'Science HOD', submitted: '1 hr ago' },
]

const complianceChecks = [
  { id: 'check-1', label: 'Parent communication draft', status: 'Ready', owner: 'Comms Team' },
  { id: 'check-2', label: 'Audit export package', status: 'Generating', owner: 'Data Ops' },
  { id: 'check-3', label: 'Result template watermark', status: 'Approved', owner: 'Brand' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Pending: 'secondary',
  'In review': 'default',
  Escalated: 'destructive',
  Done: 'default',
  'In progress': 'default',
  Queued: 'secondary',
}

const severityVariant: Record<string, 'warning' | 'destructive' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

export function ResultApproval() {
  const [approving, setApproving] = useState(false)

  const handleApprovalPolicy = () => {
    alert('Approval Policy Settings:\n\n- Require class teacher sign-off\n- HOD moderation mandatory\n- Academic director approval\n- Principal final seal\n\nYou can customize these layers.')
  }

  const handleApproveAll = async () => {
    setApproving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('All ready cohorts have been approved!\n\n5 cohorts moved to next stage.')
    } finally {
      setApproving(false)
    }
  }

  const handleUpdateWorkflow = () => {
    alert('Opening workflow editor...\n\nYou can:\n- Add/remove approval stages\n- Set SLA timelines\n- Configure escalation rules\n- Assign approvers')
  }

  const handleOpenEscalation = () => {
    alert('Opening escalation form...\n\nReport new issues or blockers that need immediate attention.')
  }

  const handleDispatchBriefing = () => {
    alert('Dispatching briefing pack to Principal...\n\nIncludes:\n- Summary PDF\n- Broadsheet snapshot\n- Approval checklist\n\nEmail sent successfully!')
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Finalization workflow</p>
          <h1 className="text-2xl font-bold text-gray-900">Result approval</h1>
          <p className="text-sm text-gray-600">Route cohorts through layered approvals, manage escalations, and keep leadership in sync.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleApprovalPolicy}>
            <ShieldCheck className="h-4 w-4 mr-2" /> Approval policy
          </Button>
          <Button onClick={handleApproveAll} disabled={approving}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> {approving ? 'Approving...' : 'Approve all ready cohorts'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending approvals</p>
            <p className="text-3xl font-semibold text-gray-900">5 cohorts</p>
            <p className="text-xs text-gray-500">3 awaiting director sign-off</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Escalations</p>
            <p className="text-3xl font-semibold text-rose-600">2 open</p>
            <p className="text-xs text-gray-500">Auto ping to QA in 15 mins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg. turnaround</p>
            <p className="text-3xl font-semibold text-gray-900">6h 22m</p>
            <p className="text-xs text-gray-500">-18% vs last term</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Release ready</p>
            <p className="text-3xl font-semibold text-emerald-600">68%</p>
            <p className="text-xs text-gray-500">Expected to hit 90% by 6 PM</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval queue</CardTitle>
          <CardDescription>Every cohort flows through the same guardrails before publishing.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Current stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvalQueue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-gray-900">{item.id}</TableCell>
                  <TableCell>{item.cohort}</TableCell>
                  <TableCell>{item.stage}</TableCell>
                  <TableCell>{item.owner}</TableCell>
                  <TableCell>{item.sla}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
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
            <CardTitle>Moderation timeline</CardTitle>
            <CardDescription>Track each layer of sign-off and unblock bottlenecks fast.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moderationTimeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500">Owner: {item.owner}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">ETA: {item.eta}</p>
                  <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" onClick={handleUpdateWorkflow}>
              <Layers className="h-4 w-4 mr-2" /> Update workflow
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalations & incident queue</CardTitle>
            <CardDescription>Resolve blockers before they impact publishing dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {escalationCases.map((issue) => (
              <div key={issue.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{issue.label}</p>
                  <Badge variant={severityVariant[issue.severity]}>Escalated</Badge>
                </div>
                <p className="text-sm text-gray-500">Owner: {issue.owner}</p>
                <p className="text-xs text-gray-400">Raised {issue.submitted}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={handleOpenEscalation}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Open escalation
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Compliance checklist</CardTitle>
            <CardDescription>Artifacts needed to certify cohorts before release.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <CalendarClock className="h-4 w-4 mr-2" /> SLA calendar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {complianceChecks.map((check) => (
            <div key={check.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900">{check.label}</p>
                <Badge variant={check.status === 'Generating' ? 'warning' : 'default'}>{check.status}</Badge>
              </div>
              <p className="text-sm text-gray-500">Owner: {check.owner}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-center gap-3">
          <Stamp className="h-5 w-5" />
          <p>
            Principal seal required for <span className="font-semibold">2 cohorts</span>. Send briefing pack with summary PDF and broadsheet snapshot.
          </p>
        </div>
        <Button size="sm" onClick={handleDispatchBriefing}>
          <Send className="h-4 w-4 mr-2" /> Dispatch briefing
        </Button>
      </div>
    </div>
  )
}
export default ResultApproval;
