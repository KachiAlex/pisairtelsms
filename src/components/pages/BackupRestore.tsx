import React from 'react'
import { CloudUpload, CloudDownload, History, Shield, RefreshCcw, HardDrive, AlertTriangle, Download, Upload, ArchiveRestore } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const backupJobs = [
  { id: 'BK-4121', type: 'Nightly full', window: '02:00 - 02:18', status: 'Succeeded', size: '24.6 GB', location: 'Azure West EU' },
  { id: 'BK-4110', type: 'Hourly diff', window: '10:00 - 10:03', status: 'Succeeded', size: '1.2 GB', location: 'S3 eu-west-2' },
  { id: 'BK-4099', type: 'Exam archive', window: 'Yesterday 21:00', status: 'Running', size: '—', location: 'Local NAS' },
]

const restoreRequests = [
  { id: 'RS-118', cohort: 'JSS 2', scope: 'Result snapshots', requestedBy: 'Academics', eta: 'Ready', status: 'Ready' },
  { id: 'RS-115', cohort: 'Finance', scope: 'Invoices Q1', requestedBy: 'Finance Ops', eta: 'In 40 mins', status: 'Processing' },
  { id: 'RS-112', cohort: 'Student docs', scope: 'Admissions 2024', requestedBy: 'Admissions', eta: 'Awaiting approval', status: 'Pending' },
]

const redundancyMatrix = [
  { id: 'tier-1', label: 'Primary cloud', region: 'Azure West EU', retention: '35 days', integrity: 99 },
  { id: 'tier-2', label: 'Secondary cloud', region: 'AWS eu-west-2', retention: '180 days', integrity: 96 },
  { id: 'tier-3', label: 'On-prem NAS', region: 'Lagos data room', retention: '14 days', integrity: 91 },
]

const complianceSignals = [
  { id: 'cmp-78', label: 'BCP drill due', owner: 'IT Operations', due: 'Mar 06', status: 'Scheduled' },
  { id: 'cmp-76', label: 'WAEC archive verification', owner: 'Exam Office', due: 'Feb 29', status: 'Due soon' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  Succeeded: 'default',
  Running: 'warning',
  Ready: 'default',
  Processing: 'warning',
  Pending: 'secondary',
}

export function BackupRestore() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Backup & restore</h1>
          <p className="text-sm text-gray-600">Coordinate snapshots, redundancy layers, and quick restores for every academic surface.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh status
          </Button>
          <Button>
            <CloudUpload className="h-4 w-4 mr-2" /> Run backup now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Successful jobs (24h)</p>
            <p className="text-3xl font-semibold text-gray-900">28</p>
            <p className="text-xs text-gray-500">100% success rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Restore requests</p>
            <p className="text-3xl font-semibold text-gray-900">3 active</p>
            <p className="text-xs text-gray-500">1 awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Storage utilization</p>
            <p className="text-3xl font-semibold text-gray-900">62%</p>
            <p className="text-xs text-gray-500">Across 3 tiers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">BCP compliance</p>
            <p className="text-3xl font-semibold text-emerald-600">95%</p>
            <p className="text-xs text-gray-500">Next drill in 12 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup jobs</CardTitle>
          <CardDescription>Watch windows, destinations, and throughput.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium text-gray-900">{job.id}</TableCell>
                  <TableCell>{job.type}</TableCell>
                  <TableCell>{job.window}</TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell>{job.size}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[job.status] || 'default'}>{job.status}</Badge>
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
            <CardTitle>Restore control tower</CardTitle>
            <CardDescription>Prioritize requests and keep stakeholders updated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {restoreRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{request.scope}</p>
                  <Badge variant={statusVariant[request.status] || 'secondary'}>{request.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">Cohort: {request.cohort}</p>
                <p className="text-xs text-gray-400">Requester: {request.requestedBy} • ETA {request.eta}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <CloudDownload className="h-4 w-4 mr-2" /> Start new restore
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redundancy tiers</CardTitle>
            <CardDescription>Layered storage with integrity scoring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {redundancyMatrix.map((tier) => (
              <div key={tier.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{tier.label}</p>
                  <Badge variant={tier.integrity >= 95 ? 'default' : 'warning'}>{tier.integrity}% integrity</Badge>
                </div>
                <p className="text-sm text-gray-500">Region: {tier.region}</p>
                <p className="text-xs text-gray-400">Retention: {tier.retention}</p>
                <Progress className="mt-3" value={tier.integrity} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance signals</CardTitle>
          <CardDescription>Upcoming drills and verifications linked to backups.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {complianceSignals.map((signal) => (
            <div key={signal.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
              <div>
                <p className="font-medium text-gray-900">{signal.label}</p>
                <p className="text-sm text-gray-500">Owner: {signal.owner}</p>
              </div>
              <div className="text-right">
                <Badge variant={signal.status === 'Due soon' ? 'warning' : 'secondary'}>{signal.status}</Badge>
                <p className="text-xs text-gray-400">Due {signal.due}</p>
              </div>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full">
            <Shield className="h-4 w-4 mr-2" /> View BCP calendar
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
        <div className="flex items-center gap-3">
          <ArchiveRestore className="h-5 w-5" />
          <p>Need point-in-time recovery for guardian portal? Launch a sandbox restore without impacting prod.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Preview snapshot
          </Button>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-2" /> Restore to sandbox
          </Button>
        </div>
      </div>
    </div>
  )
}
export default BackupRestore;
