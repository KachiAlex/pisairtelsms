import React from 'react'
import { Bug, RefreshCcw, Filter, Activity, ServerCrash, Laptop2, AlertTriangle, FolderArchive, Shield } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const logStream = [
  { id: 'LOG-9921', service: 'Tenant portal', signature: 'TimeoutError: /api/dashboard', severity: 'High', lastSeen: '08:42:10', hits: 41 },
  { id: 'LOG-9915', service: 'Notifications API', signature: 'QueueOverflow: sms-outbound', severity: 'Medium', lastSeen: '08:39:04', hits: 126 },
  { id: 'LOG-9903', service: 'CBT engine', signature: 'IntegrityCheckFailed: script-upload', severity: 'Low', lastSeen: '08:20:51', hits: 9 },
]

const ingestionStats = [
  { label: 'Events / min', value: '6.8k', note: '90-sec sample' },
  { label: 'Alerts firing', value: '4', note: '3 high, 1 med' },
  { label: 'Suppressed noise', value: '73%', note: 'Auto-tuned' },
]

const environments = [
  { name: 'Production', status: 'Stable', coverage: 98 },
  { name: 'Staging', status: 'Warning', coverage: 81 },
  { name: 'QA sandboxes', status: 'Muted', coverage: 45 },
]

const heatmap = [
  { window: 'Last 15 mins', value: 24 },
  { window: '1 hour', value: 62 },
  { window: '4 hours', value: 31 },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
  Stable: 'default',
  Warning: 'warning',
  Muted: 'secondary',
}

export function ErrorLogs() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">Error logs</h1>
          <p className="text-sm text-gray-600">Investigate structured error signatures, affected surfaces, and sampling windows.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Pull latest
          </Button>
          <Button>
            <Filter className="h-4 w-4 mr-2" /> Filter stream
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {ingestionStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log stream</CardTitle>
          <CardDescription>Deduplicated signatures with severity and frequency.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signature ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Hits</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logStream.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-gray-900">{log.id}</TableCell>
                  <TableCell>{log.service}</TableCell>
                  <TableCell className="text-sm text-gray-600">{log.signature}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[log.severity] || 'secondary'}>{log.severity}</Badge>
                  </TableCell>
                  <TableCell>{log.hits}</TableCell>
                  <TableCell>{log.lastSeen}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Environment posture</CardTitle>
            <CardDescription>Sampling coverage by environment cluster.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {environments.map((env) => (
              <div key={env.name} className="rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <Laptop2 className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{env.name}</p>
                    <Badge variant={statusVariant[env.status] || 'secondary'}>{env.status}</Badge>
                  </div>
                  <Progress value={env.coverage} className="mt-2" />
                  <p className="text-xs text-gray-500 mt-1">{env.coverage}% coverage</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <ServerCrash className="h-4 w-4 mr-2" /> Manage sampling rules
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error heatmap</CardTitle>
            <CardDescription>Relative error volume per time window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {heatmap.map((bucket) => (
              <div key={bucket.window} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{bucket.window}</p>
                  <span className="text-sm text-gray-500">{bucket.value}% of daily volume</span>
                </div>
                <Progress value={bucket.value} className="mt-2" />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <FolderArchive className="h-4 w-4 mr-2" /> Export raw logs
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>QueueOverflow signature trending up. Route incidents to Messaging squad and enable throttling.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Bug className="h-4 w-4 mr-2" /> Create jira
          </Button>
          <Button size="sm">
            <Shield className="h-4 w-4 mr-2" /> Escalate to on-call
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-slate-500" />
          <p>Need to reproduce locally? Download filtered logs with sensitive fields scrubbed.</p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" /> Configure export
        </Button>
      </div>
    </div>
  )
}
export default ErrorLogs;
