import React from 'react'
import { FileText, Download, Send, Shield, Mail, Printer, Share2, Filter, Upload } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

const transcriptRequests = [
  { id: 'TR-9812', student: 'Chiamaka N.', destination: 'University of Lagos', type: 'Official PDF', requestedBy: 'Parent', status: 'Queued', eta: 'Today 4 PM' },
  { id: 'TR-9813', student: 'Bayo O.', destination: 'WAEC Office', type: 'Stamped hard copy', requestedBy: 'Student', status: 'In progress', eta: 'Courier pickup 6 PM' },
  { id: 'TR-9814', student: 'Halima S.', destination: 'Canadian Embassy', type: 'Evaluation pack', requestedBy: 'Alumni', status: 'Awaiting payment', eta: '—' },
]

const verificationChecks = [
  { id: 'VER-220', label: 'Digital signature validation', status: 'Green', detail: 'Last breach 120 days ago' },
  { id: 'VER-221', label: 'Stamp inventory', status: 'Amber', detail: '14 units remaining' },
  { id: 'VER-222', label: '3rd-party courier SLA', status: 'Green', detail: 'Avg. delivery 2.7 days' },
]

const deliveryChannels = [
  { id: 'channel-1', label: 'Email PDF', usage: '68%', health: 'Operational' },
  { id: 'channel-2', label: 'Secure portal', usage: '22%', health: 'Operational' },
  { id: 'channel-3', label: 'Courier hard copy', usage: '10%', health: 'Delayed (weather)' },
]

const auditLog = [
  { id: 'LOG-455', actor: 'Mrs. Aminat', action: 'Approved alumni transcript pack', time: '08:14 AM' },
  { id: 'LOG-452', actor: 'DataOps Bot', action: 'Rotated signing certificate', time: 'Yesterday' },
  { id: 'LOG-449', actor: 'Exam Office', action: 'Uploaded WAEC attestation scan', time: 'Tue 3:50 PM' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  Queued: 'secondary',
  'In progress': 'default',
  'Awaiting payment': 'warning',
}

export function Transcripts() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Records concierge</p>
          <h1 className="text-2xl font-bold text-gray-900">Transcripts</h1>
          <p className="text-sm text-gray-600">Digitally issue, track, and audit official transcripts with multi-channel delivery.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Upload legacy record
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" /> New transcript request
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Requests this week</p>
            <p className="text-3xl font-semibold text-gray-900">34</p>
            <p className="text-xs text-gray-500">+12% vs last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg. fulfillment</p>
            <p className="text-3xl font-semibold text-gray-900">18 hrs</p>
            <p className="text-xs text-gray-500">Under 24hr SLA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending payments</p>
            <p className="text-3xl font-semibold text-rose-600">6</p>
            <p className="text-xs text-gray-500">Auto reminders hourly</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Verification checks</p>
            <p className="text-3xl font-semibold text-emerald-600">98.5%</p>
            <p className="text-xs text-gray-500">No tamper detected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Active requests</CardTitle>
            <CardDescription>Central queue with status, SLA, and delivery info.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Search student" className="w-52" />
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" /> Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transcriptRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium text-gray-900">{request.id}</TableCell>
                  <TableCell>{request.student}</TableCell>
                  <TableCell>{request.destination}</TableCell>
                  <TableCell>{request.type}</TableCell>
                  <TableCell>{request.requestedBy}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[request.status]}>{request.status}</Badge>
                  </TableCell>
                  <TableCell>{request.eta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery channels</CardTitle>
            <CardDescription>Monitor health across distribution methods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryChannels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{channel.label}</p>
                  <p className="text-sm text-gray-500">Usage: {channel.usage}</p>
                </div>
                <Badge variant={channel.health.includes('Delayed') ? 'warning' : 'default'}>{channel.health}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Share2 className="h-4 w-4 mr-2" /> Manage routing rules
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification controls</CardTitle>
            <CardDescription>Security checks before transcripts exit the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {verificationChecks.map((check) => (
              <div key={check.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{check.label}</p>
                  <Badge variant={check.status === 'Green' ? 'default' : 'warning'}>{check.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">{check.detail}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Shield className="h-4 w-4 mr-2" /> Configure policies
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit activity</CardTitle>
          <CardDescription>Complete trace of who touched what.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLog.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
              <div>
                <p className="font-medium text-gray-900">{entry.actor}</p>
                <p className="text-sm text-gray-500">{entry.action}</p>
              </div>
              <p className="text-xs text-gray-400">{entry.time}</p>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full">
            <Download className="h-4 w-4 mr-2" /> Export log
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5" />
          <p>Set up automatic alumni transcript packs with sealed PDF + courier tracking included.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Template</Button>
          <Button size="sm">
            <Send className="h-4 w-4 mr-2" /> Launch automation
          </Button>
        </div>
      </div>
    </div>
  )
}
export default Transcripts;
