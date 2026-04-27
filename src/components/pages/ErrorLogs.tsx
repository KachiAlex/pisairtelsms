import React, { useState, useEffect } from 'react'
import { Bug, RefreshCcw, Filter, Activity, ServerCrash, Laptop2, AlertTriangle, FolderArchive, Shield } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'
import errorLogsApi from '../../api/tenant/error-logs'

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
  Stable: 'default',
  Warning: 'warning',
  Muted: 'secondary',
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

export function ErrorLogs() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ eventsPerMin: '6.8k', alertsFiring: 0, suppressedNoise: '73%', totalErrors: 0 })
  const [environments, setEnvironments] = useState([])
  const [heatmap, setHeatmap] = useState([])
  const [trends, setTrends] = useState({ high: 0, medium: 0, low: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('')

  const tenantId = 'current-tenant' // In real app, get from context

  useEffect(() => {
    loadErrorData()
  }, [severityFilter])

  const loadErrorData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load logs
      const logsData = errorLogsApi.listLogs(tenantId, { severity: severityFilter || undefined })
      setLogs(logsData.data)

      // Load statistics
      const statsData = errorLogsApi.getStatistics(tenantId)
      setStats(statsData)

      // Load environments
      const envsData = errorLogsApi.listEnvironments(tenantId)
      setEnvironments(envsData)

      // Load heatmap
      const heatmapData = errorLogsApi.listHeatmap(tenantId)
      setHeatmap(heatmapData)

      // Load trends
      const trendsData = errorLogsApi.getErrorTrends(tenantId)
      setTrends(trendsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load error logs')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadErrorData()
  }

  const handleExport = () => {
    try {
      const exportData = errorLogsApi.exportLogs(tenantId, { severity: severityFilter || undefined })
      console.log('Export data:', exportData)
      // In real app, trigger download
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export logs')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Loading error logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">Error logs</h1>
          <p className="text-sm text-gray-600">Investigate structured error signatures, affected surfaces, and sampling windows.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Pull latest
          </Button>
          <Button onClick={handleExport}>
            <Filter className="h-4 w-4 mr-2" /> Filter stream
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
            <p className="text-xs uppercase tracking-wide text-gray-500">Events / min</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.eventsPerMin}</p>
            <p className="text-xs text-gray-500">90-sec sample</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Alerts firing</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.alertsFiring}</p>
            <p className="text-xs text-gray-500">{trends.high} high, {trends.medium} med</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Suppressed noise</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.suppressedNoise}</p>
            <p className="text-xs text-gray-500">Auto-tuned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total errors</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.totalErrors}</p>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>
      </div>

      {logs.length > 0 && (
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
                {logs.map((log: any) => (
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
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {environments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Environment posture</CardTitle>
              <CardDescription>Sampling coverage by environment cluster.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {environments.map((env: any) => (
                <div key={env.id} className="rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
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
        )}

        {heatmap.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Error heatmap</CardTitle>
              <CardDescription>Relative error volume per time window.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {heatmap.map((bucket: any) => (
                <div key={bucket.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{bucket.window}</p>
                    <span className="text-sm text-gray-500">{bucket.value}% of daily volume</span>
                  </div>
                  <Progress value={bucket.value} className="mt-2" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={handleExport}>
                <FolderArchive className="h-4 w-4 mr-2" /> Export raw logs
              </Button>
            </CardContent>
          </Card>
        )}
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
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Filter className="h-4 w-4 mr-2" /> Configure export
        </Button>
      </div>
    </div>
  )
}
export default ErrorLogs;
