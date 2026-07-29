import React, { useState, useEffect } from 'react'
import { Activity, AlertTriangle, Clock3, LogOut, MonitorSmartphone, RefreshCcw, Shield, Smartphone, Zap, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface SessionManagementData {
  activeSessions: Array<{
    id: string
    user: string
    role: string
    device: string
    lastActive: string
    risk: string
  }>
  activeCount: number
  terminatedToday: number
  highRiskSignals: number
  avgSessionLength: number
  anomalySignals: Array<{
    id: string
    label: string
    owner: string
    severity: string
    action: string
  }>
  sessionControls: Array<{
    id: string
    label: string
    value: string
    status: string
  }>
  historyLog: Array<{
    id: string
    user: string
    action: string
    time: string
  }>
}

const sessionControls = [
  { id: 'control-1', label: 'Adaptive idle timeout', value: '15 mins (critical roles)', status: 'Live' },
  { id: 'control-2', label: 'Device trust checks', value: 'Last seen < 30 days', status: 'Live' },
  { id: 'control-3', label: 'Emergency kill switch', value: 'Available', status: 'Ready' },
]

const severityVariant: Record<string, 'default' | 'warning' | 'destructive'> = {
  Low: 'default',
  Medium: 'warning',
  High: 'destructive',
  high: 'destructive',
  medium: 'warning',
}

export function SessionManagement() {
  const [data, setData] = useState<SessionManagementData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWithAuth = async (url: string) => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
        const response = await fetch(url, { headers })
    if (!response.ok) throw new Error('Failed to fetch data')
    return response.json()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await fetchWithAuth('/api/tenant/security/session-management')
      setData(result.data)
    } catch (error) {
      console.error('Error loading session management data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const activeSessions = data?.activeSessions || []
  const anomalySignals = data?.anomalySignals || []
  const historyLog = data?.historyLog || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Session management</h1>
          <p className="text-sm text-gray-600">Spot risky devices, enforce adaptive timeouts, and terminate sessions on demand.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh sessions
          </Button>
          <Button>
            <LogOut className="h-4 w-4 mr-2" /> Force logout all
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active sessions</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.activeCount || 0}</p>
            <p className="text-xs text-gray-500">+12 vs last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Terminated today</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.terminatedToday || 0}</p>
            <p className="text-xs text-gray-500">Auto by guardrails</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">High-risk signals</p>
            <p className="text-3xl font-semibold text-rose-600">{data?.highRiskSignals || 0}</p>
            <p className="text-xs text-gray-500">Escalations in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg. session length</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.avgSessionLength || 0} mins</p>
            <p className="text-xs text-gray-500">Adaptive threshold</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active session inventory</CardTitle>
          <CardDescription>Every privileged device heartbeat in one pane.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium text-gray-900">{session.user}</TableCell>
                  <TableCell>{session.role}</TableCell>
                  <TableCell>{session.device}</TableCell>
                  <TableCell>{session.lastActive}</TableCell>
                  <TableCell>
                    <Badge variant={severityVariant[session.risk] || 'default'}>{session.risk}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Zap className="h-4 w-4 mr-2" /> Terminate
                    </Button>
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
            <CardTitle>Anomaly signals</CardTitle>
            <CardDescription>AI heuristics flag suspicious device behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalySignals.map((signal) => (
              <div key={signal.id} className="flex items-start justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{signal.label}</p>
                  <p className="text-sm text-gray-500">Owner: {signal.owner}</p>
                  <p className="text-xs text-gray-400">Response: {signal.action}</p>
                </div>
                <Badge variant={severityVariant[signal.severity] || 'warning'}>{signal.severity}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Shield className="h-4 w-4 mr-2" /> Configure heuristics
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session controls</CardTitle>
            <CardDescription>Adaptive policies tuned per role sensitivity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionControls.map((control) => (
              <div key={control.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{control.label}</p>
                  <Badge variant={control.status === 'Live' ? 'default' : 'secondary'}>{control.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">{control.value}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <MonitorSmartphone className="h-4 w-4 mr-2" /> Update rules
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session history</CardTitle>
          <CardDescription>Immutable trail of resets, terminations, and adjustments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyLog.map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
              <div>
                <p className="font-medium text-gray-900">{log.user}</p>
                <p className="text-sm text-gray-500">{log.action}</p>
              </div>
              <p className="text-xs text-gray-400">{log.time}</p>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full">
            <Clock3 className="h-4 w-4 mr-2" /> View full history
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5" />
          <p>Enable trusted device program to skip MFA for short periods while staying compliant.</p>
        </div>
        <Button size="sm">
          <Activity className="h-4 w-4 mr-2" /> Enroll devices
        </Button>
      </div>
    </div>
  )
}
export default SessionManagement;
