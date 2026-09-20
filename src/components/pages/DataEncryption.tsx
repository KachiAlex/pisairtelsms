import React, { useState, useEffect } from 'react'
import { Lock, ShieldCheck, ServerCog, AlertTriangle, Key, RefreshCcw, Database, GlobeLock, ClipboardList, Loader2 } from 'lucide-react'
import { getAuthFromStorage } from '../../lib/auth'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

interface DataEncryptionData {
  encryptedServices: number
  keysExpiringSoon: number
  complianceTasksOpen: number
  tlsAdoption: number
  encryptionInventory: Array<{
    surface: string
    algorithm: string
    keyRotation: string
    owner: string
    status: string
  }>
  keyVaults: Array<{
    id: string
    label: string
    keys: number
    health: string
    lastRotation: string
  }>
  complianceTasks: Array<{
    id: string
    label: string
    owner: string
    due: string
    status: string
  }>
  coverageMetrics: Array<{
    label: string
    value: number | null
  }>
}

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  Healthy: 'default',
  'Review due': 'warning',
  Operational: 'default',
  Degraded: 'warning',
}

export function DataEncryption() {
  const [data, setData] = useState<DataEncryptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchWithAuth = async (url: string) => {
    const auth = getAuthFromStorage()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`
        const response = await fetch(url, { headers })
    if (!response.ok) throw new Error('Failed to fetch data')
    return response.json()
  }

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await fetchWithAuth('/api/tenant/security/data-encryption')
      setData(result.data)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load data encryption data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && !data && !loadError) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loadError && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-gray-700 font-medium">Failed to load data encryption data</p>
        <p className="text-sm text-gray-500">{loadError}</p>
        <Button variant="outline" onClick={loadData}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const encryptionInventory = data?.encryptionInventory || []
  const keyVaults = data?.keyVaults || []
  const complianceTasks = data?.complianceTasks || []
  const coverageMetrics = data?.coverageMetrics || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Data encryption</h1>
          <p className="text-sm text-gray-600">Monitor cryptography posture, rotation cadences, and audit readiness from one pane.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync KMS status
          </Button>

        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Encrypted services</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.encryptedServices || 0}</p>
            <p className="text-xs text-gray-500">Managed encryption keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Keys expiring soon</p>
            <p className="text-3xl font-semibold text-rose-600">{data?.keysExpiringSoon || 0}</p>
            <p className="text-xs text-gray-500">Rotation overdue or nearing expiry</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Compliance tasks</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.complianceTasksOpen || 0} open</p>
            <p className="text-xs text-gray-500">Open encryption evidence tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">TLS adoption</p>
            <p className="text-3xl font-semibold text-emerald-600">{data?.tlsAdoption || 0}%</p>
            <p className="text-xs text-gray-500">Enforced at the edge</p>
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
              {encryptionInventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-8">
                    No encryption keys registered yet.
                  </TableCell>
                </TableRow>
              )}
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
            {keyVaults.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">No key vaults configured.</p>
            )}
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
                  <span>{metric.value != null ? `${metric.value}%` : '—'}</span>
                </div>
                <Progress value={metric.value ?? 0} />
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
          {complianceTasks.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">No open compliance tasks.</p>
          )}
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
        </CardContent>
      </Card>
    </div>
  )
}
export default DataEncryption;
