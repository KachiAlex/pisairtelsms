import React from 'react'
import { Fingerprint, RefreshCcw, Activity, AlertTriangle, Shield, Cpu, Wifi, MapPin, Download, Scan } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const deviceInventory = [
  { id: 'BM-101', location: 'Main Gate', status: 'Online', lastSeen: 'Just now', firmware: 'v2.3.1', mode: 'Fingerprint' },
  { id: 'BM-097', location: 'Science Annex', status: 'Warning', lastSeen: '4 mins ago', firmware: 'v2.1.8', mode: 'Face + Card' },
  { id: 'BM-083', location: 'Boarding House', status: 'Offline', lastSeen: '28 mins ago', firmware: 'v2.0.4', mode: 'Fingerprint' },
]

const attendanceFeed = [
  { id: 'ATT-551', cohort: 'JSS 1', capture: 'Fingerprint', hits: 182, latency: '1.2s', integrity: 'Pass' },
  { id: 'ATT-548', cohort: 'SS 2 Science', capture: 'Face', hits: 96, latency: '0.8s', integrity: 'Pass' },
  { id: 'ATT-544', cohort: 'Primary 4', capture: 'Fingerprint', hits: 210, latency: '3.4s', integrity: 'Risk' },
]

const syncJobs = [
  { id: 'SYNC-31', job: 'Upload templates', status: 'Running', eta: '2 mins', scope: 'All devices' },
  { id: 'SYNC-30', job: 'Firmware patch', status: 'Queued', eta: '10:00 PM', scope: 'Dormitory cluster' },
  { id: 'SYNC-29', job: 'Attendance export', status: 'Success', eta: 'Completed', scope: 'Today 07:30' },
]

const coverageStats = [
  { label: 'Attendance coverage', value: 92 },
  { label: 'Online devices', value: 78 },
  { label: 'Template sync', value: 85 },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Online: 'default',
  Warning: 'warning',
  Offline: 'destructive',
  Running: 'default',
  Queued: 'secondary',
  Success: 'default',
}

export function BiometricDevices() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900">Biometric devices</h1>
          <p className="text-sm text-gray-600">Track device health, template syncs, and attendance captures across campuses.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Poll devices
          </Button>
          <Button>
            <Fingerprint className="h-4 w-4 mr-2" /> Enroll template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active readers</p>
            <p className="text-3xl font-semibold text-gray-900">18</p>
            <p className="text-xs text-gray-500">+2 mobile kiosks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Attendance hits (today)</p>
            <p className="text-3xl font-semibold text-gray-900">1,462</p>
            <p className="text-xs text-gray-500">Peak 7:10 AM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sync failures</p>
            <p className="text-3xl font-semibold text-rose-600">3</p>
            <p className="text-xs text-gray-500">Auto-retry every 10 mins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Coverage</p>
            <p className="text-3xl font-semibold text-emerald-600">92%</p>
            <p className="text-xs text-gray-500">Aim for 100% by term start</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device inventory</CardTitle>
          <CardDescription>Firmware posture, connectivity, and capture modes.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Firmware</TableHead>
                <TableHead>Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceInventory.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium text-gray-900">{device.id}</TableCell>
                  <TableCell>{device.location}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[device.status] || 'secondary'}>{device.status}</Badge>
                  </TableCell>
                  <TableCell>{device.lastSeen}</TableCell>
                  <TableCell>{device.firmware}</TableCell>
                  <TableCell>{device.mode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance capture feed</CardTitle>
            <CardDescription>Spot latency spikes and integrity issues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendanceFeed.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{entry.cohort}</p>
                  <p className="text-sm text-gray-500">{entry.capture} • {entry.hits} hits</p>
                  <p className="text-xs text-gray-400">Latency {entry.latency}</p>
                </div>
                <Badge variant={entry.integrity === 'Pass' ? 'default' : 'warning'}>{entry.integrity}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Activity className="h-4 w-4 mr-2" /> View attendance log
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync jobs</CardTitle>
            <CardDescription>Template pushes, firmware patches, and exports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {syncJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{job.job}</p>
                  <p className="text-sm text-gray-500">Scope: {job.scope}</p>
                  <p className="text-xs text-gray-400">ETA {job.eta}</p>
                </div>
                <Badge variant={statusVariant[job.status] || 'secondary'}>{job.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Shield className="h-4 w-4 mr-2" /> Configure policies
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage metrics</CardTitle>
          <CardDescription>Role-based targets for biometric adoption.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {coverageStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-100 p-4">
              <p className="font-medium text-gray-900">{stat.label}</p>
              <div className="mt-2">
                <Progress value={stat.value} />
                <p className="text-xs text-gray-500 mt-1">{stat.value}%</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Boarding house reader offline for 28 mins. Dispatch estates team or reroute attendance to mobile scanner.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <MapPin className="h-4 w-4 mr-2" /> View location
          </Button>
          <Button size="sm">
            <Scan className="h-4 w-4 mr-2" /> Switch to mobile
          </Button>
        </div>
      </div>
    </div>
  )
}
export default BiometricDevices;
