import React from 'react'
import { Code2, KeyRound, RefreshCcw, Activity, ShieldCheck, AlertTriangle, TerminalSquare, Server, PlugZap } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const apiKeys = [
  { id: 'Tenant portal', scope: 'Attendance, Finance', created: 'Jan 04, 2025', calls: '42k / day', status: 'Active' },
  { id: 'Mobile app', scope: 'Assignments, Notifications', created: 'Dec 18, 2024', calls: '11k / day', status: 'Rotating' },
  { id: 'Data warehouse', scope: 'Exports only', created: 'Nov 03, 2024', calls: '1.2k / day', status: 'Paused' },
]

const requestFeed = [
  { id: 'REQ-5521', endpoint: 'POST /fees/charges', latency: '420ms', status: '200', channel: 'Tenant portal' },
  { id: 'REQ-5517', endpoint: 'GET /students/{id}', latency: '1.2s', status: '429', channel: 'Mobile app' },
  { id: 'REQ-5512', endpoint: 'POST /attendance/bulk', latency: '880ms', status: '202', channel: 'Data sync' },
]

const ratePolicies = [
  { tier: 'Core', burst: '120 / min', sustained: '4,000 / hr', owner: 'Platform', status: 'Healthy' },
  { tier: 'Bulk sync', burst: '40 / min', sustained: '600 / hr', owner: 'Integrations', status: 'Warning' },
  { tier: 'Webhook', burst: '200 / min', sustained: 'Unlimited', owner: 'Automation', status: 'Healthy' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Active: 'default',
  Rotating: 'warning',
  Paused: 'secondary',
  Healthy: 'default',
  Warning: 'warning',
  '429': 'warning',
}

export function APIManagement() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900">API management</h1>
          <p className="text-sm text-gray-600">Secure API keys, monitor consumption, and enforce rate limits for every integration.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Rotate secrets
          </Button>
          <Button>
            <KeyRound className="h-4 w-4 mr-2" /> Issue new key
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active keys</p>
            <p className="text-3xl font-semibold text-gray-900">8</p>
            <p className="text-xs text-gray-500">2 pending approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">API throughput</p>
            <p className="text-3xl font-semibold text-emerald-600">58k</p>
            <p className="text-xs text-gray-500">Calls in last 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Error rate</p>
            <p className="text-3xl font-semibold text-amber-600">1.8%</p>
            <p className="text-xs text-gray-500">Mostly throttles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Webhook fan-out</p>
            <p className="text-3xl font-semibold text-gray-900">14</p>
            <p className="text-xs text-gray-500">Channels subscribed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Scopes, usage, and lifecycle controls.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key label</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium text-gray-900">{key.id}</TableCell>
                  <TableCell>{key.scope}</TableCell>
                  <TableCell>{key.created}</TableCell>
                  <TableCell>{key.calls}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[key.status] || 'secondary'}>{key.status}</Badge>
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
            <CardTitle>Request feed</CardTitle>
            <CardDescription>Watch latency, status codes, and traffic sources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestFeed.map((request) => (
              <div key={request.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{request.endpoint}</p>
                  <p className="text-sm text-gray-500">{request.channel} • Latency {request.latency}</p>
                  <p className="text-xs text-gray-400">Ref {request.id}</p>
                </div>
                <Badge variant={request.status === '200' ? 'default' : statusVariant[request.status] || 'warning'}>
                  {request.status}
                </Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Activity className="h-4 w-4 mr-2" /> Open live trace
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate limit tiers</CardTitle>
            <CardDescription>Guardrails per integration group.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ratePolicies.map((policy) => (
              <div key={policy.tier} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{policy.tier}</p>
                  <p className="text-sm text-gray-500">Burst {policy.burst} • Sustained {policy.sustained}</p>
                  <p className="text-xs text-gray-400">Owner: {policy.owner}</p>
                </div>
                <Badge variant={statusVariant[policy.status] || 'secondary'}>{policy.status}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Server className="h-4 w-4 mr-2" /> Edit tier config
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security posture</CardTitle>
          <CardDescription>Key rotation, scopes, and webhook signing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Key rotation</p>
            <p className="text-2xl font-semibold text-gray-900">33 days</p>
            <p className="text-xs text-gray-400">Avg across active keys</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Least privilege score</p>
            <p className="text-2xl font-semibold text-emerald-600">92%</p>
            <p className="text-xs text-gray-400">Based on scope audits</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Webhook signature</p>
            <p className="text-2xl font-semibold text-gray-900">HMAC-SHA256</p>
            <p className="text-xs text-gray-400">6 endpoints pending upgrade</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Mobile app key hitting burst limits. Coordinate with vendor or raise temporary quota before PTA onboarding.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <TerminalSquare className="h-4 w-4 mr-2" /> Inspect traffic
          </Button>
          <Button size="sm">
            <PlugZap className="h-4 w-4 mr-2" /> Adjust limits
          </Button>
        </div>
      </div>
    </div>
  )
}
export default APIManagement;
