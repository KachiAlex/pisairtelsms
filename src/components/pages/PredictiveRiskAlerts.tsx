import React, { useState, useEffect } from 'react'
import { Activity, AlertOctagon, ShieldCheck, BellRing, TrendingUp, RefreshCcw, Zap, Eye, MapPin } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
  Ready: 'default',
  'Needs update': 'warning',
  increasing: 'destructive',
  stable: 'default',
  decreasing: 'default',
}

export function PredictiveRiskAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [playbooks, setPlaybooks] = useState<any[]>([])
  const [clusters, setClusters] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = 'default-tenant'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [alertsRes, modelsRes, playbooksRes, clustersRes, statsRes] = await Promise.all([
        fetch(`/api/tenant/students/risk-alerts?tenantId=${tenantId}&type=alerts`),
        fetch(`/api/tenant/students/risk-alerts?tenantId=${tenantId}&type=models`),
        fetch(`/api/tenant/students/risk-alerts?tenantId=${tenantId}&type=playbooks`),
        fetch(`/api/tenant/students/risk-alerts?tenantId=${tenantId}&type=clusters`),
        fetch(`/api/tenant/students/risk-alerts?tenantId=${tenantId}&type=statistics`),
      ])

      if (!alertsRes.ok || !modelsRes.ok || !playbooksRes.ok || !clustersRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const alertsData = await alertsRes.json()
      const modelsData = await modelsRes.json()
      const playbooksData = await playbooksRes.json()
      const clustersData = await clustersRes.json()
      const statsData = await statsRes.json()

      setAlerts(alertsData.data || [])
      setModels(modelsData.data || [])
      setPlaybooks(playbooksData.data || [])
      setClusters(clustersData.data || [])
      setStatistics(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Predictive risk alerts</h1>
          <p className="text-sm text-gray-600">Surface early-warning signals across academics, finance, and operations to act before incidents escalate.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh alerts
          </Button>
          <Button>
            <Eye className="h-4 w-4 mr-2" /> View details
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active alerts</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.activeAlerts || 0}</p>
            <p className="text-xs text-gray-500">Requiring attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Critical alerts</p>
            <p className="text-3xl font-semibold text-red-600">{statistics?.criticalAlerts || 0}</p>
            <p className="text-xs text-gray-500">High likelihood</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg risk score</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.averageRiskScore || 0}</p>
            <p className="text-xs text-gray-500">0-1 scale</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Automation coverage</p>
            <p className="text-3xl font-semibold text-emerald-600">{statistics?.automationCoverage || 0}%</p>
            <p className="text-xs text-gray-500">Playbooks ready</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk feed</CardTitle>
          <CardDescription>Active risk signals ranked by likelihood and impact.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Surface</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Likelihood</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium text-gray-900">{alert.surface}</TableCell>
                    <TableCell>{alert.signal}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[alert.likelihood] || 'secondary'}>{alert.likelihood}</Badge>
                    </TableCell>
                    <TableCell>{alert.eta}</TableCell>
                    <TableCell>{alert.owner}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">No active alerts</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model performance</CardTitle>
            <CardDescription>ML model accuracy metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {models.length > 0 ? (
              models.map((m) => (
                <div key={m.id} className="rounded-lg border border-gray-100 p-3">
                  <p className="font-medium text-gray-900">{m.model}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Precision:</span>
                      <span className="font-medium">{(m.precision * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recall:</span>
                      <span className="font-medium">{(m.recall * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">F1 Score:</span>
                      <span className="font-medium">{(m.f1Score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No model data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mitigation playbooks</CardTitle>
            <CardDescription>Automated response workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {playbooks.length > 0 ? (
              playbooks.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">{p.title}</p>
                    <Badge variant={statusVariant[p.status] || 'secondary'}>{p.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {p.steps} steps • {p.coverage}% coverage
                  </div>
                  <Progress value={p.coverage} />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No playbooks</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signal clusters</CardTitle>
          <CardDescription>Grouped anomalies and incident patterns.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Incidents</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clusters.length > 0 ? (
                clusters.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-gray-900">{c.cluster}</TableCell>
                    <TableCell>{c.confidence}%</TableCell>
                    <TableCell>{c.incidents}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.trend] || 'secondary'}>{c.trend}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">No clusters found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
export default PredictiveRiskAlerts;
