import React, { useState, useEffect } from 'react'
import { Scale, Save, ShieldCheck, Calculator, AlertTriangle, FileText, ArrowUpWideNarrow, Loader, AlertCircle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

const statusVariant: Record<string, 'default' | 'secondary'> = {
  live: 'default',
  Live: 'default',
  draft: 'secondary',
  Draft: 'secondary',
}

const TENANT_ID = localStorage.getItem('tenantId') || 'default-tenant'
const HEADERS = { 'x-tenant-id': TENANT_ID, 'Content-Type': 'application/json' }

export function GradingScale() {
  const [scales, setScales] = useState<any[]>([])
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newScaleName, setNewScaleName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const [scalesRes, auditRes] = await Promise.all([
        fetch('/api/tenant/grading-scales', { headers: HEADERS }),
        fetch('/api/tenant/grading-scales?id=audit', { headers: HEADERS }),
      ])
      if (!scalesRes.ok) throw new Error('Failed to load grading scales')
      const scalesJson = await scalesRes.json()
      setScales(scalesJson.data || [])
      if (auditRes.ok) {
        const auditJson = await auditRes.json()
        setAuditLog(auditJson.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grading scales')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateScale = async () => {
    if (!newScaleName.trim()) return
    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/tenant/grading-scales', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ name: newScaleName, type: 'primary' }),
      })
      if (!res.ok) throw new Error('Failed to create scale')
      const json = await res.json()
      setScales([json.data, ...scales])
      setNewScaleName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scale')
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async (scaleId: string) => {
    try {
      const res = await fetch(`/api/tenant/grading-scales?id=${scaleId}&action=publish`, {
        method: 'POST', headers: HEADERS,
      })
      if (!res.ok) throw new Error('Failed to publish scale')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const liveScales = scales.filter(s => s.status === 'live')
  const draftScales = scales.filter(s => s.status === 'draft')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900">Grading scale</h1>
          <p className="text-sm text-gray-600">Control grade bands, GPA weights, and equivalency mappings for every division.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Grading scales</p>
            <p className="text-3xl font-semibold text-gray-900">{scales.length}</p>
            <p className="text-xs text-gray-500">Primary + Secondary</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <Calculator className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Live scales</p>
            <p className="text-3xl font-semibold text-gray-900">{liveScales.length}</p>
            <p className="text-xs text-gray-500">Active in use</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Draft scales</p>
            <p className="text-3xl font-semibold text-gray-900">{draftScales.length}</p>
            <p className="text-xs text-gray-500">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Open alerts</p>
            <p className="text-3xl font-semibold text-rose-600">0</p>
            <p className="text-xs text-gray-500">All systems normal</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grading scales</CardTitle>
          <CardDescription>Manage all grading scales and versions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New scale name..."
              value={newScaleName}
              onChange={(e) => setNewScaleName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateScale()}
            />
            <Button onClick={handleCreateScale} disabled={creating || !newScaleName.trim()}>
              {creating ? <Loader className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            </Button>
          </div>
          {scales.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scales.map((scale) => (
                    <TableRow key={scale.id}>
                      <TableCell className="font-medium text-gray-900">{scale.name}</TableCell>
                      <TableCell>{scale.type}</TableCell>
                      <TableCell>v{scale.version}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[scale.status] || 'secondary'}>{scale.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(scale.created_at || scale.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {scale.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handlePublish(scale.id)}>
                            <Save className="h-3 w-3 mr-1" /> Publish
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No grading scales yet. Create one to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equivalency sets</CardTitle>
            <CardDescription>Map scores to regional reporting standards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scales.filter(s => s.type === 'equivalency').length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <ArrowUpWideNarrow className="h-7 w-7 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No equivalency sets configured yet.</p>
              </div>
            ) : (
              scales.filter(s => s.type === 'equivalency').map((set) => (
                <div key={set.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{set.name}</p>
                    <p className="text-sm text-gray-600">{set.description || '—'}</p>
                  </div>
                  <Badge variant={statusVariant[set.status] || 'secondary'}>{set.status}</Badge>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full">
              <ArrowUpWideNarrow className="h-4 w-4 mr-2" /> Import mapping
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy rules</CardTitle>
            <CardDescription>Guardrails from your active grading scales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scales.filter(s => s.status === 'live' && (s.minimum_pass_mark || s.distinction_threshold || s.remediation_trigger)).length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Scale className="h-7 w-7 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No policy rules set. Edit a grading scale to configure thresholds.</p>
              </div>
            ) : (
              scales.filter(s => s.status === 'live').map((scale) => (
                <div key={scale.id} className="rounded-2xl border border-gray-100 p-4 space-y-2">
                  <p className="font-medium text-gray-900 text-sm">{scale.name}</p>
                  {scale.minimum_pass_mark != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Minimum pass mark</span>
                      <Badge variant="secondary">{scale.minimum_pass_mark}%</Badge>
                    </div>
                  )}
                  {scale.distinction_threshold != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Distinction threshold</span>
                      <Badge variant="secondary">{scale.distinction_threshold}%</Badge>
                    </div>
                  )}
                  {scale.remediation_trigger != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Remediation trigger</span>
                      <Badge variant="secondary">&lt; {scale.remediation_trigger}%</Badge>
                    </div>
                  )}
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full">
              <Scale className="h-4 w-4 mr-2" /> Edit policy
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit feed</CardTitle>
          <CardDescription>Every grading scale change is logged with actor context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLog.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No changes logged yet.</p>
            </div>
          ) : (
            auditLog.slice(0, 10).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{entry.performed_by || 'System'}</p>
                  <p className="text-sm text-gray-500">{entry.description || entry.action}</p>
                </div>
                <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
          <Button variant="ghost" size="sm" className="w-full">
            <FileText className="h-4 w-4 mr-2" /> Export change log
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Create and configure grading scales to manage academic performance standards.</p>
        </div>
        <Button size="sm">
          <ShieldCheck className="h-4 w-4 mr-2" /> Learn more
        </Button>
      </div>
    </div>
  )
}
export default GradingScale;
