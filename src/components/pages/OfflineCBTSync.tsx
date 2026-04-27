import React, { useState, useEffect } from 'react'
import { Laptop2, WifiOff, RefreshCcw, Activity, AlertTriangle, HardDriveDownload, Shield, Plug, Server } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  syncing: 'default',
  success: 'default',
  waiting: 'secondary',
  stable: 'default',
  degraded: 'warning',
  offline: 'destructive',
  retry_needed: 'warning',
  verified: 'default',
}

export function OfflineCBTSync() {
  const [devices, setDevices] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [fallbacks, setFallbacks] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = 'default-tenant' // In real app, get from context

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [devicesRes, packagesRes, fallbacksRes, statsRes] = await Promise.all([
        fetch(`/api/tenant/cbt/offline-sync?tenantId=${tenantId}&type=devices`),
        fetch(`/api/tenant/cbt/offline-sync?tenantId=${tenantId}&type=packages`),
        fetch(`/api/tenant/cbt/offline-sync?tenantId=${tenantId}&type=fallbacks`),
        fetch(`/api/tenant/cbt/offline-sync?tenantId=${tenantId}&type=statistics`),
      ])

      if (!devicesRes.ok || !packagesRes.ok || !fallbacksRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const devicesData = await devicesRes.json()
      const packagesData = await packagesRes.json()
      const fallbacksData = await fallbacksRes.json()
      const statsData = await statsRes.json()

      setDevices(devicesData.data || [])
      setPackages(packagesData.data || [])
      setFallbacks(fallbacksData.data || [])
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
          <h1 className="text-2xl font-bold text-gray-900">Offline CBT sync</h1>
          <p className="text-sm text-gray-600">Manage package distribution, device readiness, and failover rails before the exam window.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Rescan devices
          </Button>
          <Button>
            <Laptop2 className="h-4 w-4 mr-2" /> Publish package
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
            <p className="text-xs uppercase tracking-wide text-gray-500">Devices ready</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.devicesReady || 0}</p>
            <p className="text-xs text-gray-500">of {statistics?.devicesTotal || 0} provisioned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sync freshness</p>
            <p className="text-3xl font-semibold text-emerald-600">{statistics?.syncFreshness || 0}%</p>
            <p className="text-xs text-gray-500">&lt; 12 hrs old</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Packages pending</p>
            <p className="text-3xl font-semibold text-amber-600">{statistics?.packagesPending || 0}</p>
            <p className="text-xs text-gray-500">Need checksum validation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Conflicts pending</p>
            <p className="text-3xl font-semibold text-gray-900">{statistics?.conflictsPending || 0}</p>
            <p className="text-xs text-gray-500">Awaiting resolution</p>
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
              {devices.length > 0 ? (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium text-gray-900">{device.deviceId}</TableCell>
                    <TableCell>{device.lab}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[device.status] || 'secondary'}>{device.status}</Badge>
                    </TableCell>
                    <TableCell>{device.papers}</TableCell>
                    <TableCell>{device.bandwidth || 'N/A'}</TableCell>
                    <TableCell>{device.eta || 'Pending'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">No devices found</TableCell>
                </TableRow>
              )}
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
            {packages.length > 0 ? (
              packages.map((pkg) => (
                <div key={pkg.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{pkg.examId}</p>
                    <p className="text-sm text-gray-500">Size {pkg.size}</p>
                    <p className="text-xs text-gray-400">Attempts {pkg.attempts}</p>
                  </div>
                  <Badge variant={statusVariant[pkg.status] || 'secondary'}>{pkg.status}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No packages found</p>
            )}
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
            {fallbacks.length > 0 ? (
              fallbacks.map((fallback) => (
                <div key={fallback.id} className="rounded-2xl border border-gray-100 p-4">
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
              ))
            ) : (
              <p className="text-sm text-gray-500">No fallbacks configured</p>
            )}
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
          <p>Need to keep devices offline after sync? Toggle watch mode so clients don't pull live updates mid-session.</p>
        </div>
        <Button variant="outline" size="sm">
          <Server className="h-4 w-4 mr-2" /> Configure watch mode
        </Button>
      </div>
    </div>
  )
}
export default OfflineCBTSync;
