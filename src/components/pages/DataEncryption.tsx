import React from 'react'
import { Lock, ShieldCheck, ServerCog, AlertTriangle, Key, RefreshCcw, Database, GlobeLock, ClipboardList } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const encryptionInventory = [
  { surface: 'Student records API', algorithm: 'AES-256-GCM', keyRotation: '30 days', owner: 'Data Ops', status: 'Healthy' },
  { surface: 'Exam results archive', algorithm: 'RSA-4096', keyRotation: '180 days', owner: 'Compliance', status: 'Review due' },
  { surface: 'Guardian portal cache', algorithm: 'ChaCha20-Poly1305', keyRotation: '7 days', owner: 'Engineering', status: 'Healthy' },
]

const keyVaults = [
  { id: 'vault-1', label: 'Primary KMS cluster', keys: 142, health: 'Operational', lastRotation: 'Today 06:00' },
  { id: 'vault-2', label: 'Disaster recovery vault', keys: 48, health: 'Operational', lastRotation: '3 days ago' },
  { id: 'vault-3', label: 'Legacy on-prem HSM', keys: 21, health: 'Degraded', lastRotation: '28 days ago' },
]

const complianceTasks = [
  { id: 'task-981', label: 'PCI scope attestation', owner: 'Finance Ops', due: 'Mar 04', status: 'In progress' },
  { id: 'task-978', label: 'GDPR key audit', owner: 'Legal', due: 'Feb 28', status: 'Due soon' },
  { id: 'task-975', label: 'NITDA encryption statement', owner: 'Compliance', due: 'Mar 12', status: 'Scheduled' },
]

const coverageMetrics = [
  { label: 'At-rest encryption', value: 98 },
  { label: 'In-transit TLS 1.3', value: 94 },
  { label: 'Key rotation compliance', value: 88 },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  Healthy: 'default',
  'Review due': 'warning',
  Operational: 'default',
  Degraded: 'warning',
}

export function DataEncryption() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Data encryption</h1>
          <p className="text-sm text-gray-600">Monitor cryptography posture, rotation cadences, and audit readiness from one pane.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync KMS status
          </Button>
          <Button>
            <Lock className="h-4 w-4 mr-2" /> Rotate master keys
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Encrypted services</p>
            <p className="text-3xl font-semibold text-gray-900">34</p>
            <p className="text-xs text-gray-500">+4 added this term</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Keys expiring soon</p>
            <p className="text-3xl font-semibold text-rose-600">6</p>
            <p className="text-xs text-gray-500">Auto alerts sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Compliance tasks</p>
            <p className="text-3xl font-semibold text-gray-900">3 open</p>
            <p className="text-xs text-gray-500">Two due this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">TLS adoption</p>
            <p className="text-3xl font-semibold text-emerald-600">97%</p>
            <p className="text-xs text-gray-500">Target 100% by April</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encryption inventory</CardTitle>
          <CardDescription>Algorithms, owners, and rotation SLAs at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Surface</TableHead>
                <TableHead>Algorithm</TableHead>
                <TableHead>Rotation cadence</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encryptionInventory.map((item) => (
                <TableRow key={item.surface}>
                  <TableCell className="font-medium text-gray-900">{item.surface}</TableCell>
                  <TableCell>{item.algorithm}</TableCell>
                  <TableCell>{item.keyRotation}</TableCell>
                  <TableCell>{item.owner}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Key vaults</CardTitle>
            <CardDescription>Primary KMS and backup HSM health overview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {keyVaults.map((vault) => (
              <div key={vault.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{vault.label}</p>
                  <p className="text-sm text-gray-500">{vault.keys} managed keys</p>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[vault.health] || 'default'}>{vault.health}</Badge>
                  <p className="text-xs text-gray-400">Last rotation {vault.lastRotation}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <ServerCog className="h-4 w-4 mr-2" /> Manage vault connections
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage metrics</CardTitle>
            <CardDescription>How close we are to policy targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {coverageMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{metric.label}</span>
                  <span>{metric.value}%</span>
                </div>
                <Progress value={metric.value} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance tasks</CardTitle>
          <CardDescription>Encryption evidence packages and attestations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {complianceTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
              <div>
                <p className="font-medium text-gray-900">{task.label}</p>
                <p className="text-sm text-gray-500">Owner: {task.owner}</p>
              </div>
              <div className="text-right">
                <Badge variant={task.status === 'Due soon' ? 'warning' : 'secondary'}>{task.status}</Badge>
                <p className="text-xs text-gray-400">Due {task.due}</p>
              </div>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full">
            <ClipboardList className="h-4 w-4 mr-2" /> Export evidence pack
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        <div className="flex items-center gap-3">
          <GlobeLock className="h-5 w-5" />
          <p>Enable regional key residency to satisfy EU/UK data localization requirements.</p>
        </div>
        <Button size="sm">
          <ShieldCheck className="h-4 w-4 mr-2" /> Configure residency
        </Button>
      </div>
    </div>
  )
}
export default DataEncryption;
