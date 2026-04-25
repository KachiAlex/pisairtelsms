import React from 'react'
import { ClipboardCheck, ShieldCheck, Timer, AlertTriangle, Filter, CheckCircle2, CalendarClock } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const approvalStreams = [
  { surface: 'Exam results', pending: 5, sla: '4 hrs', owner: 'Academics', risk: 'medium' },
  { surface: 'Fee waivers', pending: 3, sla: '8 hrs', owner: 'Finance', risk: 'low' },
  { surface: 'Procurement', pending: 2, sla: '24 hrs', owner: 'Operations', risk: 'low' },
  { surface: 'Disciplinary cases', pending: 1, sla: '2 hrs', owner: 'Admin', risk: 'high' },
]

const requestQueue = [
  { id: 'REQ-9201', type: 'Result publishing', requester: 'Mrs. Angela Ojo', submitted: '08:10 AM', sla: 'Due in 1h', status: 'In review' },
  { id: 'REQ-9198', type: 'Fee waiver', requester: 'Mr. Haruna', submitted: 'Yesterday', sla: 'Due in 5h', status: 'Pending finance' },
  { id: 'REQ-9192', type: 'Staff onboarding', requester: 'HR Bot', submitted: 'Today 07:15', sla: 'Due in 3h', status: 'Escalated' },
  { id: 'REQ-9189', type: 'Budget adjustment', requester: 'Principal', submitted: 'Tue', sla: 'Due tomorrow', status: 'Queued' },
]

const slaBreaches = [
  { id: 'BRE-44', label: 'JSS 2 approval past SLA by 22 mins', owner: 'Academic Director', severity: 'warning' },
  { id: 'BRE-41', label: 'Disciplinary case escalated to principal', owner: 'Admin Office', severity: 'destructive' },
]

const ownerLoad = [
  { owner: 'Academic Director', workload: 4, eta: 'Clearing now' },
  { owner: 'Finance Lead', workload: 3, eta: '1h behind' },
  { owner: 'Principal', workload: 2, eta: 'Reviewing 4 PM' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  'In review': 'default',
  'Pending finance': 'secondary',
  Escalated: 'destructive',
  Queued: 'secondary',
}

const riskBadge: Record<string, 'default' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'warning',
  high: 'destructive',
}

export function PendingApprovals() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900">Pending approvals</h1>
          <p className="text-sm text-gray-600">Triage decision queues across academics, finance, and operations from a single command hub.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" /> Saved filters
          </Button>
          <Button>
            <ClipboardCheck className="h-4 w-4 mr-2" /> Approve bulk items
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Items awaiting action</p>
            <p className="text-3xl font-semibold text-gray-900">11</p>
            <p className="text-xs text-gray-500">Across 4 workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Within SLA</p>
            <p className="text-3xl font-semibold text-emerald-600">82%</p>
            <p className="text-xs text-gray-500">+6% vs last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Escalations open</p>
            <p className="text-3xl font-semibold text-rose-600">2</p>
            <p className="text-xs text-gray-500">Need resolution &lt; 1 hr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Fastest stream</p>
            <p className="text-3xl font-semibold text-gray-900">Finance</p>
            <p className="text-xs text-gray-500">Avg 1h 40m turnaround</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval streams</CardTitle>
          <CardDescription>See where requests are concentrated and which teams are behind.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {approvalStreams.map((stream) => (
            <div key={stream.surface} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900">{stream.surface}</p>
                <Badge variant={riskBadge[stream.risk]}>Risk: {stream.risk}</Badge>
              </div>
              <p className="text-sm text-gray-500">Owner: {stream.owner}</p>
              <p className="text-xs text-gray-400">Pending {stream.pending} • SLA {stream.sla}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>Prioritized list with SLA context.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <Timer className="h-4 w-4 mr-2" /> SLA board
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestQueue.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium text-gray-900">{request.id}</TableCell>
                  <TableCell>{request.type}</TableCell>
                  <TableCell>{request.requester}</TableCell>
                  <TableCell>{request.submitted}</TableCell>
                  <TableCell>{request.sla}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[request.status] || 'secondary'}>{request.status}</Badge>
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
            <CardTitle>SLA breaches & escalations</CardTitle>
            <CardDescription>Anything red here pages leadership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {slaBreaches.map((breach) => (
              <div key={breach.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{breach.label}</p>
                  <Badge variant={breach.severity === 'destructive' ? 'destructive' : 'warning'}>Alert</Badge>
                </div>
                <p className="text-sm text-gray-500">Owner: {breach.owner}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <AlertTriangle className="h-4 w-4 mr-2" /> Escalation playbooks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviewer workloads</CardTitle>
            <CardDescription>Balance approvals across leadership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ownerLoad.map((owner) => (
              <div key={owner.owner} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{owner.owner}</p>
                  <p className="text-sm text-gray-500">{owner.workload} items in queue</p>
                </div>
                <Badge variant="secondary">ETA {owner.eta}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <ShieldCheck className="h-4 w-4 mr-2" /> Reassign approvals
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5" />
          <p>Monthly audit window begins in <span className="font-semibold">3 days</span>. Ensure all approvals are certified with comments.</p>
        </div>
        <Button size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Download certification pack
        </Button>
      </div>
    </div>
  )
}
export default PendingApprovals;
