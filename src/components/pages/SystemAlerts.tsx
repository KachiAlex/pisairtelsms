import React from 'react'
import { AlertTriangle, BellRing, Shield, Radar, Database, RefreshCcw, Activity, Server, CalendarClock, PhoneCall } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const alertFeed = [
  { id: 'ALT-411', title: 'Portal latency spike', impact: 'Parent portal > 2.6s', owner: 'Engineering', severity: 'high', eta: 'Mitigation 20 mins' },
  { id: 'ALT-409', title: 'CBT lab battery low', impact: '18 terminals affected', owner: 'Facilities', severity: 'medium', eta: 'Replace 4 PM' },
  { id: 'ALT-404', title: 'SMS vendor maintenance', impact: 'SMS queue delayed 15 mins', owner: 'Vendor Ops', severity: 'low', eta: 'Normal 6 PM' },
]

const channelHealth = [
  { channel: 'Email', status: 'Operational', latency: 'Normal', uptime: 99.9 },
  { channel: 'SMS', status: 'Degraded', latency: '+12 mins', uptime: 98.1 },
  { channel: 'In-app', status: 'Operational', latency: 'Normal', uptime: 99.7 },
]

const maintenanceTimeline = [
  { id: 'MT-91', label: 'Database patch window', window: 'Tonight 11 PM', owner: 'Data Ops', status: 'Scheduled' },
  { id: 'MT-88', label: 'Network switch upgrade', window: 'Fri 2 AM', owner: 'Infrastructure', status: 'Planned' },
]

const incidentMetrics = [
  { label: 'Open incidents', value: 4, tone: 'text-rose-600' },
  { label: 'Resolved today', value: 7, tone: 'text-emerald-600' },
  { label: 'Avg. MTTR', value: '38 mins', tone: 'text-gray-900' },
  { label: 'Pager duty coverage', value: '100%', tone: 'text-gray-900' },
]

const severityVariant: Record<string, 'default' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'warning',
  high: 'destructive',
}

export function SystemAlerts() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900">System alerts</h1>
          <p className="text-sm text-gray-600">Observe realtime platform health, escalation queues, and maintenance windows.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh telemetry
          </Button>
          <Button>
            <BellRing className="h-4 w-4 mr-2" /> Broadcast alert
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {incidentMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{metric.label}</p>
              <p className={`text-3xl font-semibold ${metric.tone}`}>{metric.value}</p>
              <p className="text-xs text-gray-500">Live snapshot</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Active alerts</CardTitle>
            <CardDescription>Prioritized incidents with owner accountability.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <Shield className="h-4 w-4 mr-2" /> Run diagnostics
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertFeed.map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900">{alert.title}</p>
                <Badge variant={severityVariant[alert.severity]}>Severity: {alert.severity}</Badge>
              </div>
              <p className="text-sm text-gray-500">Impact: {alert.impact}</p>
              <p className="text-xs text-gray-400">Owner: {alert.owner} • ETA {alert.eta}</p>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full">
            <AlertTriangle className="h-4 w-4 mr-2" /> Open incident report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel health</CardTitle>
          <CardDescription>Delivery success & uptime per notification rail.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>30d uptime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelHealth.map((channel) => (
                <TableRow key={channel.channel}>
                  <TableCell className="font-medium text-gray-900">{channel.channel}</TableCell>
                  <TableCell>{channel.status}</TableCell>
                  <TableCell>{channel.latency}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Progress value={channel.uptime} />
                      </div>
                      <span className="text-sm text-gray-600">{channel.uptime}%</span>
                    </div>
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
            <CardTitle>Maintenance timeline</CardTitle>
            <CardDescription>Future windows automatically notify stakeholders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {maintenanceTimeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">Window: {item.window}</p>
                </div>
                <Badge variant="secondary">{item.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Server className="h-4 w-4 mr-2" /> Publish maintenance notice
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalation channels</CardTitle>
            <CardDescription>Ensure the right people are paged at the right time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Pager duty</p>
                <p className="text-sm text-gray-500">Primary on-call: Data Ops</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Leadership SMS</p>
                <p className="text-sm text-gray-500">Triggered on high severity</p>
              </div>
              <Badge variant="warning">Degraded</Badge>
            </div>
            <div className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Hotline</p>
                <p className="text-sm text-gray-500">Connect guardians instantly</p>
              </div>
              <Badge variant="secondary">Queued</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <PhoneCall className="h-4 w-4 mr-2" /> Update contacts
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
        <div className="flex items-center gap-3">
          <Radar className="h-5 w-5" />
          <p>Enable proactive anomaly scanning to warn stakeholders before parents notice system slowdowns.</p>
        </div>
        <Button size="sm">
          <Activity className="h-4 w-4 mr-2" /> Activate pre-emptive mode
        </Button>
      </div>
    </div>
  )
}
export default SystemAlerts;
