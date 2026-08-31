import React, { useState, useEffect } from 'react'
import { AlertTriangle, BellRing, Shield, Radar, RefreshCcw, Activity, Server, PhoneCall, Loader2, Gauge, History, Settings2, CheckCircle2, Plus } from 'lucide-react'
import { getAuthFromStorage } from '../../lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'
import { useToast } from '../ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface SystemAlert {
  id: string
  title: string
  impact: string | null
  owner: string | null
  severity: string
  eta: string | null
  status: string
  createdAt: string
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

const severityColors: Record<string, string> = {
  'high': 'bg-rose-100 text-rose-700 border-rose-200',
  'medium': 'bg-amber-100 text-amber-700 border-amber-200',
  'low': 'bg-blue-100 text-blue-700 border-blue-200',
}

export function SystemAlerts() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [channelHealth, setChannelHealth] = useState<ChannelHealth[]>([])
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([])
  const [activeTab, setActiveTab] = useState('incidents')
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const auth = getAuthFromStorage();
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return response.json();
  };

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [metricsData, alertsData, channelsData, maintenanceData] = await Promise.all([
        fetchWithAuth('/api/tenant/alerts/statistics/summary'),
        fetchWithAuth('/api/tenant/alerts?limit=50'),
        fetchWithAuth('/api/tenant/alerts/channels'),
        fetchWithAuth('/api/tenant/alerts/maintenance')
      ]);

      if (metricsData.success) setMetrics(metricsData.data)
      if (alertsData.success) setAlerts(alertsData.data)
      if (channelsData.success) setChannelHealth(channelsData.data)
      if (maintenanceData.success) setMaintenanceWindows(maintenanceData.data)
    } catch (err) {
      console.error('Error fetching system alerts:', err)
      setError('Failed to load system telemetry. Please try again.')
      // Mock data for UI development
      if (alerts.length === 0) {
        setAlerts([
          { id: 'ALT-001', title: 'High Latency: Database EU-West-1', impact: 'Admin Portal login slowdowns', owner: 'Infrastructure', severity: 'high', eta: '15m', status: 'investigating', createdAt: new Date().toISOString() },
          { id: 'ALT-002', title: 'API Rate Limit Warning', impact: 'Potential mobile app disruption', owner: 'DevOps', severity: 'medium', eta: null, status: 'open', createdAt: new Date().toISOString() },
        ]);
        setChannelHealth([
          { id: '1', channel: 'SMS Gateway', status: 'Healthy', latency: '1.2s', uptime: 99.9 },
          { id: '2', channel: 'Email Dispatch', status: 'Degraded', latency: '45s', uptime: 94.2 },
          { id: '3', channel: 'Push Notifications', status: 'Healthy', latency: '0.1s', uptime: 99.9 },
        ]);
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleBroadcastAlert = async () => {
    try {
      const data = await fetchWithAuth('/api/tenant/alerts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Broadcast alert', severity: 'medium', status: 'open' }),
      });
      if (data.success) {
        setAlerts((prev) => [data.data, ...prev])
        toast({ title: 'Alert broadcast', description: 'Alert has been posted to all stakeholders.' })
      }
    } catch {
      toast({ title: 'Failed to broadcast', variant: 'destructive' })
    }
  }

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">System Alerts & Health</h1>
          <p className="text-sm text-gray-600">Real-time observability of platform stability, delivery rails, and scheduled maintenance.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh Telemetry
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleBroadcastAlert}>
            <BellRing className="h-4 w-4 mr-2" /> Broadcast Alert
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Open Incidents</p>
            <p className="text-3xl font-semibold text-rose-600">{metrics?.openIncidents || alerts.filter(a => a.severity === 'high').length}</p>
            <p className="text-xs text-gray-500 mt-1">Live snapshot</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Delivery Health</p>
            <p className="text-3xl font-semibold text-emerald-600">{channelHealth.filter(c => c.status === 'Healthy').length}/{channelHealth.length}</p>
            <p className="text-xs text-gray-500 mt-1">Rails operational</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Avg. MTTR</p>
            <p className="text-3xl font-semibold text-gray-900">{metrics?.avgMttr || '28m'}</p>
            <p className="text-xs text-gray-500 mt-1">Time to resolution</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">On-Call Readiness</p>
            <p className="text-3xl font-semibold text-gray-900">{metrics?.pagerDutyCoverage || '100%'}</p>
            <p className="text-xs text-emerald-600 mt-1">Staff paged via SMS</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="incidents" className="rounded-lg px-4 py-2">Active Incidents</TabsTrigger>
          <TabsTrigger value="telemetry" className="rounded-lg px-4 py-2">Delivery Telemetry</TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-lg px-4 py-2">Infrastructure Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-6 mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Security & Ops Alert Queue</CardTitle>
                <CardDescription>Prioritized list of system events requiring attention.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => loadData()}>
                <Radar className="w-4 h-4 mr-2" /> Live Scanner
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-gray-500 gap-2 border-2 border-dashed rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-sm">All systems nominal. No active alerts.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-2xl border ${severityColors[alert.severity] || 'bg-gray-50'} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-sm`}>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-white/50 rounded-xl">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{alert.title}</p>
                        <p className="text-sm text-gray-700/80 mt-1">Impact: {alert.impact || 'Under assessment'}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 uppercase font-semibold mt-2 tracking-wider">
                          <span>Owner: {alert.owner || 'Unassigned'}</span>
                          <span>•</span>
                          <span>Opened: {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {alert.eta && <Badge variant="secondary" className="bg-white/80">ETA {alert.eta}</Badge>}
                      <Button variant="outline" size="sm" className="bg-white/50 border-gray-200">Investigate</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telemetry" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Rail Health</CardTitle>
              <CardDescription>Real-time delivery success rates for automated notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>30d Uptime</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channelHealth.map((channel) => (
                      <TableRow key={channel.id}>
                        <TableCell className="font-semibold text-gray-900">{channel.channel}</TableCell>
                        <TableCell>
                          <Badge variant={channel.status === 'Healthy' ? 'default' : 'warning'}>{channel.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-500">{channel.latency || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[120px]">
                            <Progress value={channel.uptime} className="h-1.5" />
                            <span className="text-xs font-bold text-gray-600">{channel.uptime}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm"><Gauge className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Scheduled Windows</CardTitle>
                  <CardDescription>Upcoming infrastructure updates.</CardDescription>
                </div>
                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Plan Window</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {maintenanceWindows.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No maintenance scheduled.</p>
                ) : (
                  maintenanceWindows.map((item) => (
                    <div key={item.id} className="p-4 border rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-bold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <History className="w-3 h-3" />
                          {new Date(item.window_start).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">{item.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escalation Contacts</CardTitle>
                <CardDescription>Primary stakeholders for high-severity events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Infrastructure Team', role: 'Primary On-Call', channel: 'PagerDuty' },
                  { name: 'School Admin Hotline', role: 'Critical Stakeholder', channel: 'SMS' },
                  { name: 'Global Ops Hub', role: 'Incident Manager', channel: 'Email' }
                ].map((contact, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{contact.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{contact.role}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{contact.channel}</Badge>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-blue-600 mt-2">
                  <Settings2 className="w-4 h-4 mr-2" /> Manage On-Call Rota
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-rose-100 rounded-2xl text-rose-600">
            <Radar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-rose-900 text-lg leading-tight">Pre-emptive Anomaly Scanning</h3>
            <p className="text-rose-700/80 text-sm max-w-md mt-1">
              Enable AI-driven log scanning to detect behavioral shifts in login patterns or database latency before they impact end-users.
            </p>
          </div>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6">
          Activate Proactive Mode
        </Button>
      </div>
    </div>
  )
}

export default SystemAlerts;
