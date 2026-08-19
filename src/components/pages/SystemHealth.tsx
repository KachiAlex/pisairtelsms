import React, { useState, useEffect, useCallback } from 'react'
import { Activity, HeartPulse, RefreshCcw, Server, ShieldCheck, HardDrive, Database, Cpu, AlertTriangle, CloudLightning, Wifi, Loader2 } from 'lucide-react'
import { useToast } from '../ui/use-toast'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

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

function getAuthHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

interface ServiceHealth {
  id: string
  surface: string
  status: 'operational' | 'watch' | 'degraded'
  latency: string
  uptime: number
  owners: string
}

interface InfrastructureVital {
  label: string
  value: number
  unit: string
  status: 'stable' | 'warning' | 'critical'
}

interface IncidentRecord {
  id: string
  title: string
  start: string
  duration: string
  state: 'Operational' | 'Watch' | 'Degraded' | 'Mitigated' | 'Resolved'
}

interface VendorDependency {
  id: string
  name: string
  coverage: string
  status: 'operational' | 'watch' | 'degraded'
}

export function SystemHealth() {
  const { toast } = useToast()
  const [stats, setStats] = useState({ overallStatus: 'Green', incidents24h: 0, slaConverage: '99.4%', upcomingMaintenance: 2 })
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [vitals, setVitals] = useState<InfrastructureVital[]>([])
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [dependencies, setDependencies] = useState<VendorDependency[]>([])
  const [resourceMetrics, setResourceMetrics] = useState<{
    cpu: { current: number; average: number; peak: number }
    memory: { current: number; average: number; peak: number }
    disk: { current: number; average: number; peak: number }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHealthData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = getAuthHeaders()

      // Load all data in parallel
      const [statsRes, servicesRes, vitalsRes, incidentsRes, depsRes] = await Promise.all([
        fetch('/api/tenant/system-health?type=statistics', { headers }),
        fetch('/api/tenant/system-health?type=services', { headers }),
        fetch('/api/tenant/system-health?type=vitals', { headers }),
        fetch('/api/tenant/system-health?type=incidents', { headers }),
        fetch('/api/tenant/system-health?type=dependencies', { headers }),
      ])

      const statsData = statsRes.ok ? await statsRes.json() : stats
      const servicesData = servicesRes.ok ? await servicesRes.json() : { data: [] }
      const vitalsData = vitalsRes.ok ? await vitalsRes.json() : { data: [] }
      const incidentsData = incidentsRes.ok ? await incidentsRes.json() : { data: [] }
      const depsData = depsRes.ok ? await depsRes.json() : { data: [] }

      const fetchedVitals = vitalsData.data || []
      const fetchedServices = servicesData.data || []

      setStats(statsData)
      setServices(fetchedServices)
      setVitals(fetchedVitals)
      setIncidents(incidentsData.data || [])
      setDependencies(depsData.data || [])

      // Calculate resource metrics from vitals
      const cpuVital = fetchedVitals.find((v: any) => v.label?.toLowerCase().includes('cpu'))
      const memoryVital = fetchedVitals.find((v: any) => v.label?.toLowerCase().includes('memory'))
      const diskVital = fetchedVitals.find((v: any) => v.label?.toLowerCase().includes('disk'))

      setResourceMetrics({
        cpu: { current: cpuVital?.value || 0, average: cpuVital?.value || 0, peak: cpuVital?.value || 0 },
        memory: { current: memoryVital?.value || 0, average: memoryVital?.value || 0, peak: memoryVital?.value || 0 },
        disk: { current: diskVital?.value || 0, average: diskVital?.value || 0, peak: diskVital?.value || 0 },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data')
      toast({ title: 'Telemetry Error', description: 'Could not fetch system health metrics.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, stats])

  useEffect(() => {
    loadHealthData()
  }, [loadHealthData])

  const handleRefresh = () => {
    loadHealthData()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Loading system health data...</p>
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
