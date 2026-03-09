import React from 'react'
import { Laptop2, WifiOff, RefreshCcw, Activity, AlertTriangle, HardDriveDownload, Shield, Plug, Server } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const deviceSyncQueue = [
  { id: 'CBT-021', lab: 'ICT Lab A', status: 'Syncing', papers: 6, bandwidth: '18 Mbps', eta: '04:12 PM' },
  { id: 'CBT-017', lab: 'Annex Hall', status: 'Waiting', papers: 4, bandwidth: 'Pending', eta: 'Queue slot 3' },
  { id: 'CBT-013', lab: 'Mobile Cart', status: 'Success', papers: 3, bandwidth: '12 Mbps', eta: 'Completed' },
]

const packageHealth = [
  { id: 'Mathematics Paper 2', size: '420 MB', checksum: 'Verified', attempts: 1 },
  { id: 'Biology Practical', size: '615 MB', checksum: 'Retry needed', attempts: 3 },
  { id: 'Civic Education', size: '210 MB', checksum: 'Verified', attempts: 1 },
]

const networkFallbacks = [
  { region: 'Main campus', medium: 'Fiber', status: 'Stable', coverage: 100 },
  { region: 'Annex', medium: 'Microwave', status: 'Degraded', coverage: 68 },
  { region: 'Rural center', medium: '4G failover', status: 'Offline', coverage: 12 },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Syncing: 'default',
  Success: 'default',
  Waiting: 'secondary',
  Stable: 'default',
  Degraded: 'warning',
  Offline: 'destructive',
  'Retry needed': 'warning',
  Verified: 'default',
}

export function OfflineCBTSync() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Offline CBT sync</h1>
          <p className="text-sm text-gray-600">Manage package distribution, device readiness, and failover rails before the exam window.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Rescan devices
          </Button>
          <Button>
            <Laptop2 className="h-4 w-4 mr-2" /> Publish package
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Devices ready</p>
            <p className="text-3xl font-semibold text-gray-900">46</p>
            <p className="text-xs text-gray-500">of 52 provisioned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sync freshness</p>
            <p className="text-3xl font-semibold text-emerald-600">92%</p>
            <p className="text-xs text-gray-500">&lt; 12 hrs old</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Packages pending</p>
            <p className="text-3xl font-semibold text-amber-600">3</p>
            <p className="text-xs text-gray-500">Need checksum validation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Fallback drills</p>
            <p className="text-3xl font-semibold text-gray-900">2</p>
            <p className="text-xs text-gray-500">Scheduled this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device sync queue</CardTitle>
          <CardDescription>Priority order, bandwidth allocation, and completion ETA.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Lab / Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Papers</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceSyncQueue.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium text-gray-900">{device.id}</TableCell>
                  <TableCell>{device.lab}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[device.status] || 'secondary'}>{device.status}</Badge>
                  </TableCell>
                  <TableCell>{device.papers}</TableCell>
                  <TableCell>{device.bandwidth}</TableCell>
                  <TableCell>{device.eta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Package health</CardTitle>
            <CardDescription>Checksum verification and retry counts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {packageHealth.map((pkg) => (
              <div key={pkg.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{pkg.id}</p>
                  <p className="text-sm text-gray-500">Size {pkg.size}</p>
                  <p className="text-xs text-gray-400">Attempts {pkg.attempts}</p>
                </div>
                <Badge variant={statusVariant[pkg.checksum] || 'secondary'}>{pkg.checksum}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Shield className="h-4 w-4 mr-2" /> View manifest
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network fallbacks</CardTitle>
            <CardDescription>Coverage of offline-first rails per location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {networkFallbacks.map((fallback) => (
              <div key={fallback.region} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{fallback.region}</p>
                    <p className="text-sm text-gray-500">Medium: {fallback.medium}</p>
                  </div>
                  <Badge variant={statusVariant[fallback.status] || 'secondary'}>{fallback.status}</Badge>
                </div>
                <div className="mt-3">
                  <Progress value={fallback.coverage} />
                  <p className="text-xs text-gray-500 mt-1">{fallback.coverage}% coverage</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Microwave uplink degraded. Preload Annex Hall exams via portable SSD and trigger offline attendance guard.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <HardDriveDownload className="h-4 w-4 mr-2" /> Generate SSD image
          </Button>
          <Button size="sm">
            <Plug className="h-4 w-4 mr-2" /> Assign field engineer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrity drills</CardTitle>
          <CardDescription>Ensure offline clients can reconnect and publish scripts post exam.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Failover test</p>
            <p className="text-2xl font-semibold text-gray-900">Completed</p>
            <p className="text-xs text-gray-400">Last run: 18 Feb</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Script upload dry run</p>
            <p className="text-2xl font-semibold text-emerald-600">98%</p>
            <p className="text-xs text-gray-400">Within SLA</p>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Server capacity</p>
            <p className="text-2xl font-semibold text-gray-900">1.2×</p>
            <p className="text-xs text-gray-400">Headroom for uploads</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-slate-500" />
          <p>Need to keep devices offline after sync? Toggle watch mode so clients don’t pull live updates mid-session.</p>
        </div>
        <Button variant="outline" size="sm">
          <Server className="h-4 w-4 mr-2" /> Configure watch mode
        </Button>
      </div>
    </div>
  )
}
export default OfflineCBTSync;
