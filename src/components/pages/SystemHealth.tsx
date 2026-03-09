import React from 'react'
import { Activity, HeartPulse, RefreshCcw, Server, ShieldCheck, HardDrive, Gauge, Wifi, Database, Cpu, AlertTriangle, CloudLightning } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const serviceMatrix = [
  { surface: 'Tenant portal', status: 'Operational', latency: '220ms', uptime: 99.92, owners: 'App Platform' },
  { surface: 'CBT engine', status: 'Watch', latency: '410ms', uptime: 98.44, owners: 'Assessments' },
  { surface: 'Notifications API', status: 'Degraded', latency: '1.1s', uptime: 96.38, owners: 'Messaging' },
]

const infrastructureVitals = [
  { label: 'Database write load', value: 68, icon: Database },
  { label: 'File store occupancy', value: 74, icon: HardDrive },
  { label: 'Edge cache hit rate', value: 92, icon: Gauge },
]

const incidentTimeline = [
  { id: 'INC-882', title: 'Parent portal latency', start: '09:12', duration: '18 mins', state: 'Mitigated' },
  { id: 'INC-877', title: 'CBT sync retries', start: '07:45', duration: '42 mins', state: 'Resolved' },
]

const dependencyHealth = [
  { name: 'Email vendor', status: 'Operational', coverage: '100%' },
  { name: 'SMS aggregator', status: 'Degraded', coverage: '76%' },
  { name: 'Payment processor', status: 'Operational', coverage: '100%' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  Operational: 'default',
  Watch: 'secondary',
  Degraded: 'warning',
  Mitigated: 'warning',
  Resolved: 'default',
}

export function SystemHealth() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">System health</h1>
          <p className="text-sm text-gray-600">Live view of critical surfaces, infra vitals, and third-party dependencies.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh telemetry
          </Button>
          <Button>
            <HeartPulse className="h-4 w-4 mr-2" /> Launch diagnostics
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Overall status</p>
            <p className="text-3xl font-semibold text-emerald-600">Green</p>
            <p className="text-xs text-gray-500">All critical surfaces responding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Incidents (24h)</p>
            <p className="text-3xl font-semibold text-gray-900">3</p>
            <p className="text-xs text-gray-500">Avg MTTR 32 mins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">SLA coverage</p>
            <p className="text-3xl font-semibold text-emerald-600">99.4%</p>
            <p className="text-xs text-gray-500">Rolling 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Upcoming maint.</p>
            <p className="text-3xl font-semibold text-amber-600">2</p>
            <p className="text-xs text-gray-500">Notify stakeholders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service matrix</CardTitle>
          <CardDescription>Runtime health and ownership for critical experiences.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Surface</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>30d uptime</TableHead>
                <TableHead>Owners</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceMatrix.map((service) => (
                <TableRow key={service.surface}>
                  <TableCell className="font-medium text-gray-900">{service.surface}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[service.status] || 'secondary'}>{service.status}</Badge>
                  </TableCell>
                  <TableCell>{service.latency}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Progress value={service.uptime} />
                      </div>
                      <span className="text-sm text-gray-500">{service.uptime}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{service.owners}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Infrastructure vitals</CardTitle>
            <CardDescription>Throughput and capacity per core subsystem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {infrastructureVitals.map((vital) => (
              <div key={vital.label} className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <vital.icon className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{vital.label}</p>
                  <Progress value={vital.value} />
                  <p className="text-xs text-gray-500 mt-1">{vital.value}% of safe threshold</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Cpu className="h-4 w-4 mr-2" /> Open observability
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident timeline</CardTitle>
            <CardDescription>Last 12 hours of incident response.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidentTimeline.map((incident) => (
              <div key={incident.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{incident.title}</p>
                  <p className="text-sm text-gray-500">Start {incident.start} • {incident.duration}</p>
                </div>
                <Badge variant={statusVariant[incident.state] || 'secondary'}>{incident.state}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <ShieldCheck className="h-4 w-4 mr-2" /> Review playbooks
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dependency health</CardTitle>
          <CardDescription>Vendors powering communication and payments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {dependencyHealth.map((dependency) => (
            <div key={dependency.name} className="rounded-2xl border border-gray-100 p-4">
              <p className="font-medium text-gray-900">{dependency.name}</p>
              <p className="text-sm text-gray-500">Coverage {dependency.coverage}</p>
              <Badge className="mt-2" variant={statusVariant[dependency.status] || 'secondary'}>
                {dependency.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Notifications API latency breaching SLA. Coordinate with vendor and enable SMS throttling fallback.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Wifi className="h-4 w-4 mr-2" /> Activate fallback
          </Button>
          <Button size="sm">
            <CloudLightning className="h-4 w-4 mr-2" /> Spin up burst nodes
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-slate-500" />
          <p>Need deeper insight? Export raw metrics to your observability stack.</p>
        </div>
        <Button variant="outline" size="sm">
          <Server className="h-4 w-4 mr-2" /> Download snapshot
        </Button>
      </div>
    </div>
  )
}
export default SystemHealth;
