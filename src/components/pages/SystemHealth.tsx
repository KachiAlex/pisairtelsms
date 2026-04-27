import React, { useState, useEffect } from 'react'
import { Activity, HeartPulse, RefreshCcw, Server, ShieldCheck, HardDrive, Gauge, Wifi, Database, Cpu, AlertTriangle, CloudLightning } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

// Import API functions
const systemHealthApi = require('../../../api/tenant/system-health').default

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  Operational: 'default',
  Watch: 'secondary',
  Degraded: 'warning',
  Mitigated: 'warning',
  Resolved: 'default',
  operational: 'default',
  watch: 'secondary',
  degraded: 'warning',
}

export function SystemHealth() {
  const [stats, setStats] = useState({ overallStatus: 'Green', incidents24h: 0, slaConverage: '99.4%', upcomingMaintenance: 2 })
  const [services, setServices] = useState([])
  const [vitals, setVitals] = useState([])
  const [incidents, setIncidents] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [resourceMetrics, setResourceMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = 'current-tenant' // In real app, get from context

  useEffect(() => {
    loadHealthData()
  }, [])

  const loadHealthData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load statistics
      const statsData = systemHealthApi.getStatistics(tenantId)
      setStats(statsData)

      // Load services
      const servicesData = systemHealthApi.listServices(tenantId)
      setServices(servicesData)

      // Load vitals
      const vitalsData = systemHealthApi.listVitals(tenantId)
      setVitals(vitalsData)

      // Load incidents
      const incidentsData = systemHealthApi.listIncidents(tenantId)
      setIncidents(incidentsData.data)

      // Load dependencies
      const depsData = systemHealthApi.listDependencies(tenantId)
      setDependencies(depsData)

      // Load resource metrics
      const metricsData = systemHealthApi.getResourceMetrics(tenantId)
      setResourceMetrics(metricsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadHealthData()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Loading system health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">System health</h1>
          <p className="text-sm text-gray-600">Live view of critical surfaces, infra vitals, and third-party dependencies.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh telemetry
          </Button>
          <Button>
            <HeartPulse className="h-4 w-4 mr-2" /> Launch diagnostics
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Overall status</p>
            <p className={`text-3xl font-semibold ${stats.overallStatus === 'Green' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.overallStatus}
            </p>
            <p className="text-xs text-gray-500">All critical surfaces responding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Incidents (24h)</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.incidents24h}</p>
            <p className="text-xs text-gray-500">Avg MTTR 32 mins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">SLA coverage</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats.slaConverage}%</p>
            <p className="text-xs text-gray-500">Rolling 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Upcoming maint.</p>
            <p className="text-3xl font-semibold text-amber-600">{stats.upcomingMaintenance}</p>
            <p className="text-xs text-gray-500">Notify stakeholders</p>
          </CardContent>
        </Card>
      </div>

      {services.length > 0 && (
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
                {services.map((service: any) => (
                  <TableRow key={service.id}>
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
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {resourceMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Infrastructure vitals</CardTitle>
              <CardDescription>Throughput and capacity per core subsystem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <Cpu className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">CPU Usage</p>
                  <Progress value={Number(resourceMetrics.cpu.current)} />
                  <p className="text-xs text-gray-500 mt-1">{resourceMetrics.cpu.current}% of safe threshold</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Memory Usage</p>
                  <Progress value={Number(resourceMetrics.memory.current)} />
                  <p className="text-xs text-gray-500 mt-1">{resourceMetrics.memory.current}% of safe threshold</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Disk Usage</p>
                  <Progress value={Number(resourceMetrics.disk.current)} />
                  <p className="text-xs text-gray-500 mt-1">{resourceMetrics.disk.current}% of safe threshold</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full">
                <Cpu className="h-4 w-4 mr-2" /> Open observability
              </Button>
            </CardContent>
          </Card>
        )}

        {incidents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Incident timeline</CardTitle>
              <CardDescription>Last 12 hours of incident response.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {incidents.slice(0, 5).map((incident: any) => (
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
        )}
      </div>

      {dependencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dependency health</CardTitle>
            <CardDescription>Vendors powering communication and payments.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {dependencies.map((dependency: any) => (
              <div key={dependency.id} className="rounded-2xl border border-gray-100 p-4">
                <p className="font-medium text-gray-900">{dependency.name}</p>
                <p className="text-sm text-gray-500">Coverage {dependency.coverage}</p>
                <Badge className="mt-2" variant={statusVariant[dependency.status] || 'secondary'}>
                  {dependency.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
