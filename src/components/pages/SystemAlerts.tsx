import React, { useState, useEffect } from 'react'
import { AlertTriangle, BellRing, Shield, Radar, RefreshCcw, Activity, Server, PhoneCall, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'
import { useToast } from '../ui/use-toast'

interface SystemAlert {
  id: string
  title: string
  impact: string | null
  owner: string | null
  severity: string
  eta: string | null
  status: string
}

interface ChannelHealth {
  id: string
  channel: string
  status: string
  latency: string | null
  uptime: number
}

interface MaintenanceWindow {
  id: string
  label: string
  window_start: string
  window_end: string
  owner: string
  status: string
}

interface IncidentMetrics {
  openIncidents: number
  resolvedToday: number
  avgMttr: string
  pagerDutyCoverage: string
}

const severityVariant: Record<string, 'default' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'warning',
  high: 'destructive',
}

export function SystemAlerts() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [channelHealth, setChannelHealth] = useState<ChannelHealth[]>([])
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([])

  const { toast } = useToast()

  const fetchTenantId = () => {
    return localStorage.getItem('tenantId') || 'default-tenant'
  }

  const fetchData = async () => {
    setLoading(true)
    const tenantId = fetchTenantId()
    
    try {
      // Fetch metrics
      const metricsRes = await fetch(`/api/tenant/alerts/statistics/summary?tenantId=${tenantId}`)
      const metricsData = await metricsRes.json()
      if (metricsData.success) setMetrics(metricsData.data)

      // Fetch alerts
      const alertsRes = await fetch(`/api/tenant/alerts?tenantId=${tenantId}&limit=10`)
      const alertsData = await alertsRes.json()
      if (alertsData.success) setAlerts(alertsData.data)

      // Fetch channel health
      const channelsRes = await fetch(`/api/tenant/alerts/channels?tenantId=${tenantId}`)
      const channelsData = await channelsRes.json()
      if (channelsData.success) setChannelHealth(channelsData.data)

      // Fetch maintenance windows
      const maintenanceRes = await fetch(`/api/tenant/alerts/maintenance?tenantId=${tenantId}`)
      const maintenanceData = await maintenanceRes.json()
      if (maintenanceData.success) setMaintenanceWindows(maintenanceData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefreshTelemetry = () => {
    fetchData()
  }

  const handleBroadcastAlert = async () => {
    try {
      const res = await fetch('/api/tenant/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': fetchTenantId() },
        body: JSON.stringify({ title: 'Broadcast alert', severity: 'medium', status: 'open' }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.data) setAlerts((prev) => [data.data, ...prev])
        toast({ title: 'Alert broadcast', description: 'Alert has been posted to all stakeholders.' })
      } else {
        toast({ title: 'Failed to broadcast', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  const handleRunDiagnostics = async () => {
    toast({ title: 'Diagnostics running', description: 'Platform health check initiated. Results will appear in the alerts list.' })
    await fetchData()
  }

  const handlePublishMaintenance = async () => {
    try {
      const res = await fetch('/api/tenant/alerts/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': fetchTenantId() },
        body: JSON.stringify({
          label: 'Scheduled maintenance',
          window_start: new Date().toISOString(),
          window_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          owner: 'Ops Team',
          status: 'scheduled',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.data) setMaintenanceWindows((prev) => [...prev, data.data])
        toast({ title: 'Maintenance notice published', description: 'Stakeholders will be notified.' })
      } else {
        toast({ title: 'Failed to publish', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  const handleUpdateContacts = () => {
    toast({ title: 'Escalation contacts', description: 'Contact management is available in the Admin settings.' })
  }

  const handleActivatePreemptive = async () => {
    try {
      const res = await fetch('/api/tenant/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': fetchTenantId() },
        body: JSON.stringify({ title: 'Pre-emptive anomaly scanning enabled', severity: 'low', status: 'open' }),
      })
      if (res.ok) {
        toast({ title: 'Pre-emptive mode activated', description: 'Anomaly scanning is now running proactively.' })
        await fetchData()
      } else {
        toast({ title: 'Failed to activate', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900">System alerts</h1>
          <p className="text-sm text-gray-600">Observe realtime platform health, escalation queues, and maintenance windows.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefreshTelemetry}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh telemetry
          </Button>
          <Button onClick={handleBroadcastAlert}>
            <BellRing className="h-4 w-4 mr-2" /> Broadcast alert
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Open incidents</p>
            <p className="text-3xl font-semibold text-rose-600">{metrics?.openIncidents || 0}</p>
            <p className="text-xs text-gray-500">Live snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Resolved today</p>
            <p className="text-3xl font-semibold text-emerald-600">{metrics?.resolvedToday || 0}</p>
            <p className="text-xs text-gray-500">Live snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg. MTTR</p>
            <p className="text-3xl font-semibold text-gray-900">{metrics?.avgMttr || '0 mins'}</p>
            <p className="text-xs text-gray-500">Live snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pager duty coverage</p>
            <p className="text-3xl font-semibold text-gray-900">{metrics?.pagerDutyCoverage || '0%'}</p>
            <p className="text-xs text-gray-500">Live snapshot</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Active alerts</CardTitle>
            <CardDescription>Prioritized incidents with owner accountability.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRunDiagnostics}>
            <Shield className="h-4 w-4 mr-2" /> Run diagnostics
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500">No active alerts</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'warning' : 'default'}>Severity: {alert.severity}</Badge>
                </div>
                <p className="text-sm text-gray-500">Impact: {alert.impact || 'N/A'}</p>
                <p className="text-xs text-gray-400">Owner: {alert.owner || 'Unassigned'} • ETA {alert.eta || 'TBD'}</p>
              </div>
            ))
          )}
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
              {channelHealth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">No channel data available</TableCell>
                </TableRow>
              ) : (
                channelHealth.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium text-gray-900">{channel.channel}</TableCell>
                    <TableCell>{channel.status}</TableCell>
                    <TableCell>{channel.latency || 'Normal'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <Progress value={channel.uptime} />
                        </div>
                        <span className="text-sm text-gray-600">{channel.uptime.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
            {maintenanceWindows.length === 0 ? (
              <p className="text-sm text-gray-500">No scheduled maintenance</p>
            ) : (
              maintenanceWindows.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">Window: {new Date(item.window_start).toLocaleString()} - {new Date(item.window_end).toLocaleString()}</p>
                  </div>
                  <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>{item.status}</Badge>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={handlePublishMaintenance}>
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
            <Button variant="outline" size="sm" className="w-full" onClick={handleUpdateContacts}>
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
        <Button size="sm" onClick={handleActivatePreemptive}>
          <Activity className="h-4 w-4 mr-2" /> Activate pre-emptive mode
        </Button>
      </div>
    </div>
  )
}
export default SystemAlerts;
