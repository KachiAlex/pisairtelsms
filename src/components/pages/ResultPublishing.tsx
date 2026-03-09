import React from 'react'
import { Rocket, Globe, Smartphone, Share2, Bell, Upload, AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const releasePlan = [
  { id: 'REL-221', cohort: 'JSS 2', channel: 'Portal + Email', window: 'Today 6 PM', owner: 'Academics Comms', status: 'Scheduled' },
  { id: 'REL-222', cohort: 'SS 1 Science', channel: 'Portal only', window: 'Tomorrow 10 AM', owner: 'Data Ops', status: 'Staged' },
  { id: 'REL-223', cohort: 'Primary 5', channel: 'Print + Portal', window: 'Awaiting approval', owner: 'Principal', status: 'Blocked' },
]

const readinessChecklist = [
  { id: 'check-1', label: 'Guardian segmentation', status: 'Complete', detail: '1,245 recipients • 12 segments' },
  { id: 'check-2', label: 'Notification templates', status: 'Pending edits', detail: 'Awaiting comms approval' },
  { id: 'check-3', label: 'Portal banner & FAQs', status: 'Complete', detail: 'Goes live at publish time' },
  { id: 'check-4', label: 'Support desk scripting', status: 'In progress', detail: 'Need escalation macros' },
]

const channelHealth = [
  { id: 'channel-portal', label: 'Parent portal', status: 'Operational', usage: 78 },
  { id: 'channel-sms', label: 'SMS alert', status: 'Queued', usage: 45 },
  { id: 'channel-email', label: 'Email bulletins', status: 'Operational', usage: 92 },
  { id: 'channel-print', label: 'Print fulfillment', status: 'Delayed (paper stock)', usage: 18 },
]

const incidentFeed = [
  { id: 'INC-71', label: 'Portal latency spike', severity: 'medium', owner: 'Engineering', eta: 'Monitoring - stable' },
  { id: 'INC-69', label: 'SMS vendor maintenance', severity: 'high', owner: 'Vendor Ops', eta: 'Back by 5 PM' },
]

const adoptionStats = [
  { label: 'Portal reads', value: 72 },
  { label: 'Email opens', value: 61 },
  { label: 'SMS confirmations', value: 48 },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Scheduled: 'default',
  Staged: 'secondary',
  Blocked: 'destructive',
  Complete: 'default',
  'Pending edits': 'warning',
  'In progress': 'secondary',
}

const severityVariant: Record<string, 'warning' | 'destructive' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

export function ResultPublishing() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Release operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Result publishing</h1>
          <p className="text-sm text-gray-600">Coordinate portal pushes, guardian communications, and contingency workflows per cohort.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <CalendarClock className="h-4 w-4 mr-2" /> Publishing calendar
          </Button>
          <Button>
            <Rocket className="h-4 w-4 mr-2" /> Launch next release
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Cohorts staged</p>
            <p className="text-3xl font-semibold text-gray-900">4</p>
            <p className="text-xs text-gray-500">Awaiting final trigger</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Guardians to notify</p>
            <p className="text-3xl font-semibold text-gray-900">1,842</p>
            <p className="text-xs text-gray-500">Segmentation synced</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Channels healthy</p>
            <p className="text-3xl font-semibold text-emerald-600">3 / 4</p>
            <p className="text-xs text-gray-500">Print vendor still delayed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Next release window</p>
            <p className="text-3xl font-semibold text-gray-900">6 hrs</p>
            <p className="text-xs text-gray-500">Prep assets before 4 PM</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Release plan</CardTitle>
          <CardDescription>Centralized schedule with status, owners, and delivery channels.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Release window</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releasePlan.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium text-gray-900">{plan.id}</TableCell>
                  <TableCell>{plan.cohort}</TableCell>
                  <TableCell>{plan.channel}</TableCell>
                  <TableCell>{plan.window}</TableCell>
                  <TableCell>{plan.owner}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
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
            <CardTitle>Readiness checklist</CardTitle>
            <CardDescription>Everything required before pressing publish.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readinessChecklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.detail}</p>
                </div>
                <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Upload className="h-4 w-4 mr-2" /> Update assets
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel health</CardTitle>
            <CardDescription>Know which notification rails are safe to use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelHealth.map((channel) => (
              <div key={channel.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{channel.label}</p>
                  <Badge variant={channel.status.includes('Delayed') ? 'warning' : channel.status === 'Queued' ? 'secondary' : 'default'}>
                    {channel.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">Utilization {channel.usage}%</p>
                <Progress value={channel.usage} className="mt-2" />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Share2 className="h-4 w-4 mr-2" /> Adjust routing
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident feed</CardTitle>
          <CardDescription>Mitigate issues that could delay guardian access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {incidentFeed.map((incident) => (
            <div key={incident.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900">{incident.label}</p>
                <Badge variant={severityVariant[incident.severity]}>Severity: {incident.severity}</Badge>
              </div>
              <p className="text-sm text-gray-500">Owner: {incident.owner}</p>
              <p className="text-xs text-gray-400">ETA: {incident.eta}</p>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full">
            <AlertTriangle className="h-4 w-4 mr-2" /> Log incident
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {adoptionStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm text-gray-500">{stat.label}</CardTitle>
              <CardDescription className="text-3xl font-semibold text-gray-900">{stat.value}%</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={stat.value} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5" />
          <p>Set early-access notifications so guidance counselors preview results 1 hour before guardians.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Preview notice</Button>
          <Button size="sm">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Enable pre-release
          </Button>
        </div>
      </div>
    </div>
  )
}
export default ResultPublishing;
