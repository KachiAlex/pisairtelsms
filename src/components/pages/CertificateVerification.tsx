import React from 'react'
import { BadgeCheck, ShieldCheck, RefreshCcw, Search, HardDriveDownload, Share2, AlertTriangle, Fingerprint } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const verificationFeed = [
  { id: 'CERT-8821', holder: 'Oluwatobi A.', credential: 'WAEC 2024', status: 'Validated', method: 'QR', latency: '3.2s' },
  { id: 'CERT-8817', holder: 'Fatima L.', credential: 'Junior NECO 2023', status: 'Manual review', method: 'Registry API', latency: 'Pending' },
  { id: 'CERT-8813', holder: 'Daniel O.', credential: 'Mock Exams 2025', status: 'Rejected', method: 'Bulk CSV', latency: '1.2s' },
]

const registryIntegrations = [
  { provider: 'WAEC digital vault', status: 'Live', uptime: 99.6, coverage: '2015-2025' },
  { provider: 'NECO records', status: 'Sync lag', uptime: 94.2, coverage: '2016-2024' },
  { provider: 'State internal board', status: 'Offline', uptime: 0, coverage: 'Scheduled' },
]

const fraudSignals = [
  { flag: 'QR reuse detected', severity: 'High', volume: 3 },
  { flag: 'Manual tamper edits', severity: 'Medium', volume: 5 },
  { flag: 'Duplicate registry hits', severity: 'Low', volume: 11 },
]

const issuanceStats = [
  { label: 'Certificates issued (YTD)', value: '1,482' },
  { label: 'Validation success', value: '96%' },
  { label: 'Blockchain anchor', value: '78%' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Validated: 'default',
  'Manual review': 'warning',
  Rejected: 'destructive',
  Live: 'default',
  'Sync lag': 'warning',
  Offline: 'secondary',
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
}

export function CertificateVerification() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Advanced Features</p>
          <h1 className="text-2xl font-bold text-gray-900">Certificate verification</h1>
          <p className="text-sm text-gray-600">Validate issued credentials across QR, blockchain, and registry APIs with tamper-proof evidence.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync registries
          </Button>
          <Button>
            <BadgeCheck className="h-4 w-4 mr-2" /> Issue certificate
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {issuanceStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification feed</CardTitle>
          <CardDescription>Recent checks with method, latency, and outcome.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Holder</TableHead>
                <TableHead>Credential</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verificationFeed.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium text-gray-900">{entry.id}</TableCell>
                  <TableCell>{entry.holder}</TableCell>
                  <TableCell>{entry.credential}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[entry.status] || 'secondary'}>{entry.status}</Badge>
                  </TableCell>
                  <TableCell>{entry.method}</TableCell>
                  <TableCell>{entry.latency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registry integrations</CardTitle>
            <CardDescription>Uptime posture and coverage windows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {registryIntegrations.map((registry) => (
              <div key={registry.provider} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{registry.provider}</p>
                  <p className="text-sm text-gray-500">Coverage {registry.coverage}</p>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[registry.status] || 'secondary'}>{registry.status}</Badge>
                  {registry.uptime > 0 && <p className="text-xs text-gray-400 mt-1">{registry.uptime}% uptime</p>}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <ShieldCheck className="h-4 w-4 mr-2" /> Manage credentials
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fraud signals</CardTitle>
            <CardDescription>High-risk patterns observed in the past 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fraudSignals.map((signal) => (
              <div key={signal.flag} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{signal.flag}</p>
                  <p className="text-sm text-gray-500">{signal.volume} detections</p>
                </div>
                <Badge variant={statusVariant[signal.severity] || 'secondary'}>{signal.severity}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Search className="h-4 w-4 mr-2" /> Open investigation
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>NECO registry sync lag detected. Queue blockchain anchors as backup until API latency normalizes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <HardDriveDownload className="h-4 w-4 mr-2" /> Export anchor hashes
          </Button>
          <Button size="sm">
            <Share2 className="h-4 w-4 mr-2" /> Notify registrars
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <Fingerprint className="h-5 w-5 text-slate-500" />
          <p>Need paper trail? Download signed PDFs with embedded QR seals and verification metadata.</p>
        </div>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" /> Retrieve dossier
        </Button>
      </div>
    </div>
  )
}
export default CertificateVerification;
