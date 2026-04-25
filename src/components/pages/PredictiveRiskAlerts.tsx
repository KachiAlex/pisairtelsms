import React from 'react'
import { Activity, AlertOctagon, ShieldCheck, BellRing, TrendingUp, RefreshCcw, Zap, Eye, MapPin } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const riskFeed = [
  { id: 'RISK-441', surface: 'Exam malpractice', signal: 'Coordinated device tamper', likelihood: 'High', eta: '< 24 hrs', owner: 'Security' },
  { id: 'RISK-435', surface: 'Fee default', signal: 'Bulk auto-debit failures', likelihood: 'Medium', eta: '48 hrs', owner: 'Finance' },
  { id: 'RISK-429', surface: 'Attendance anomaly', signal: 'Portal spoof attempts', likelihood: 'Low', eta: '72 hrs', owner: 'Operations' },
]

const modelPerformance = [
  { model: 'Exam integrity', precision: 0.81, recall: 0.69 },
  { model: 'Finance risk', precision: 0.76, recall: 0.71 },
  { model: 'Attendance spoof', precision: 0.72, recall: 0.64 },
]

const mitigationPlaybooks = [
  { title: 'Device tamper lockdown', steps: 6, coverage: 78, status: 'Ready' },
  { title: 'Guardian notification burst', steps: 4, coverage: 63, status: 'Needs update' },
  { title: 'CBT hall sweep', steps: 5, coverage: 90, status: 'Ready' },
]

const signalClusters = [
  { cluster: 'Access anomalies', confidence: 86, incidents: 12 },
  { cluster: 'Financial anomalies', confidence: 72, incidents: 9 },
  { cluster: 'Attendance gaps', confidence: 64, incidents: 7 },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
  Ready: 'default',
  'Needs update': 'warning',
}

export function PredictiveRiskAlerts() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Predictive risk alerts</h1>
          <p className="text-sm text-gray-600">Surface early-warning signals across academics, finance, and operations to act before incidents escalate.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh signals
          </Button>
          <Button>
            <BellRing className="h-4 w-4 mr-2" /> Broadcast alert
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active alerts</p>
            <p className="text-3xl font-semibold text-gray-900">12</p>
            <p className="text-xs text-gray-500">5 critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Median lead time</p>
            <p className="text-3xl font-semibold text-emerald-600">36h</p>
            <p className="text-xs text-gray-500">Ahead of incident</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Playbooks ready</p>
            <p className="text-3xl font-semibold text-gray-900">9</p>
            <p className="text-xs text-gray-500">Across 3 domains</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Automation coverage</p>
            <p className="text-3xl font-semibold text-amber-600">74%</p>
            <p className="text-xs text-gray-500">Requires manual for 3 alerts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk feed</CardTitle>
          <CardDescription>Model severity, ownership, and expected time-to-impact.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Likelihood</TableHead>
                <TableHead>Lead time</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskFeed.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell className="font-medium text-gray-900">{risk.id}</TableCell>
                  <TableCell>{risk.surface}</TableCell>
                  <TableCell>{risk.signal}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[risk.likelihood] || 'secondary'}>{risk.likelihood}</Badge>
                  </TableCell>
                  <TableCell>{risk.eta}</TableCell>
                  <TableCell>{risk.owner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model performance</CardTitle>
            <CardDescription>Precision vs recall for each risk domain.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {modelPerformance.map((model) => (
              <div key={model.model} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{model.model}</p>
                  <span className="text-sm text-gray-500">Precision {(model.precision * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-2">
                  <Progress value={model.precision * 100} />
                  <p className="text-xs text-gray-500 mt-1">Recall {(model.recall * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Activity className="h-4 w-4 mr-2" /> Download evaluation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mitigation playbooks</CardTitle>
            <CardDescription>Prepared responses mapped to each risk surface.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mitigationPlaybooks.map((playbook) => (
              <div key={playbook.title} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{playbook.title}</p>
                  <p className="text-sm text-gray-500">{playbook.steps} steps • {playbook.coverage}% coverage</p>
                </div>
                <Badge variant={statusVariant[playbook.status] || 'secondary'}>{playbook.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <ShieldCheck className="h-4 w-4 mr-2" /> Update playbooks
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signal clusters</CardTitle>
          <CardDescription>Grouped anomalies feeding predictive pipelines.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {signalClusters.map((cluster) => (
            <div key={cluster.cluster} className="rounded-2xl border border-gray-100 p-4">
              <p className="font-medium text-gray-900">{cluster.cluster}</p>
              <p className="text-sm text-gray-500">Confidence {cluster.confidence}%</p>
              <p className="text-xs text-gray-400">{cluster.incidents} incidents linked</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
        <div className="flex items-center gap-3">
          <AlertOctagon className="h-5 w-5" />
          <p>RISK-441 predicted tamper zone near Annex Hall. Dispatch patrol and switch to offline CBT watchlist.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <MapPin className="h-4 w-4 mr-2" /> View map
          </Button>
          <Button size="sm">
            <Zap className="h-4 w-4 mr-2" /> Trigger automation
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-slate-500" />
          <p>Need human review? Escalate alerts directly to the command center with context and recommended actions.</p>
        </div>
        <Button variant="outline" size="sm">
          <BellRing className="h-4 w-4 mr-2" /> Escalate to command
        </Button>
      </div>
    </div>
  )
}
export default PredictiveRiskAlerts;
