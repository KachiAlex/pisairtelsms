import React, { useState, useEffect } from 'react'
import { AlertTriangle, Download, Filter, Search, TrendingUp, Zap } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

// Import API functions
const errorLogsApi = require('../../../api/tenant/error-logs').default

const severityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  stable: 'default',
  warning: 'warning',
  muted: 'secondary',
}

export function ErrorLogs() {
  const [stats, setStats] = useState({ eventsPerMin: '0', alertsFiring: 0, suppressedNoise: '0%', totalErrors: 0 })
  const [logs, setLogs] = useState<any[]>([])
  const [environments, setEnvironments] = useState<any[]>([])
  const [heatmap, setHeatmap] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)
  const [serviceFilter, setServiceFilter] = useState<string | null>(null)

  const tenantId = 'current-tenant' // In real app, get from context

  useEffect(() => {
    loadErrorData()
  }, [])

  const loadErrorData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load statistics
      const statsData = errorLogsApi.getStatistics(tenantId)
      setStats(statsData)

      // Load error logs
      const logsData = errorLogsApi.listLogs(tenantId, {
        severity: severityFilter,
        service: serviceFilter,
        limit: 100,
      })
      setLogs(logsData.data)

      // Load environments
      const envsData = errorLogsApi.listEnvironments(tenantId)
      setEnvironments(envsData)

      // Load heatmap
      const heatmapData = errorLogsApi.listHeatmap(tenantId)
      setHeatmap(heatmapData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load error logs')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    try {
      const exportData = errorLogsApi.exportLogs(tenantId, {
        severity: severityFilter,
        service: serviceFilter,
      })
      // In real app, trigger download
      console.log('Export data:', exportData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export logs')
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.signature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

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
          <p className="text-sm text-gray-600">Monitor and analyze application errors in real-time.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export logs
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
            <p className="text-xs uppercase tracking-wide text-gray-500">Events per minute</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.eventsPerMin}</p>
            <p className="text-xs text-gray-500">Real-time rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Alerts firing</p>
            <p className="text-3xl font-semibold text-red-600">{stats.alertsFiring}</p>
            <p className="text-xs text-gray-500">High & medium severity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Suppressed noise</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats.suppressedNoise}</p>
            <p className="text-xs text-gray-500">Muted & resolved</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Error logs</CardTitle>
          <CardDescription>Search and filter error signatures across services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by signature or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={severityFilter || ''}
                onChange={(e) => setSeverityFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={serviceFilter || ''}
                onChange={(e) => setServiceFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All services</option>
                {Array.from(new Set(logs.map(l => l.service))).map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signature</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Hits</TableHead>
                  <TableHead>Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-gray-900 max-w-xs truncate">{log.signature}</TableCell>
                      <TableCell>{log.service}</TableCell>
                      <TableCell>
                        <Badge variant={severityVariant[log.severity] || 'secondary'}>{log.severity}</Badge>
                      </TableCell>
                      <TableCell>{log.hits}</TableCell>
                      <TableCell className="text-sm text-gray-500">{log.lastSeen}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No error logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {environments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Environment coverage</CardTitle>
            <CardDescription>Error detection coverage by environment.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {environments.map((env: any) => (
              <div key={env.id} className="rounded-2xl border border-gray-100 p-4">
                <p className="font-medium text-gray-900">{env.name}</p>
                <p className="text-sm text-gray-500 mt-1">Coverage {env.coverage}%</p>
                <Badge className="mt-2" variant={statusVariant[env.status] || 'secondary'}>
                  {env.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {heatmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error trend</CardTitle>
            <CardDescription>Error frequency over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {heatmap.slice(0, 8).map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20">{entry.window}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min((entry.value / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ErrorLogs
