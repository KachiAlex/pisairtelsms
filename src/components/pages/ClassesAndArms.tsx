import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Users,
  Sparkles,
  Layers3,
  RefreshCw,
  Plus,
  Search,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'

type ClassArm = {
  id: string
  name: string
  arm: string
  level: string
  createdAt?: string
  updatedAt?: string
}

export function ClassesAndArms() {
  const [classes, setClasses] = useState<ClassArm[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({ name: '', arm: '', level: '' })

  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const response = await tenantApiGet('/api/tenant/cbt/classes')
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to fetch classes')
      }
      const payload = await response.json()
      const data = Array.isArray(payload.data) ? payload.data : []
      setClasses(data)
      setError(null)
      setLastSyncedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load classes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const levelOptions = useMemo(() => {
    const unique = new Set<string>()
    classes.forEach((c) => {
      if (c.name?.trim()) unique.add(c.name.trim())
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [classes])

  const filteredClasses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return classes.filter((classArm) => {
      if (levelFilter !== 'all' && classArm.name !== levelFilter) return false
      if (!query) return true
      return (
        classArm.name.toLowerCase().includes(query) ||
        classArm.arm.toLowerCase().includes(query) ||
        classArm.level.toLowerCase().includes(query)
      )
    })
  }, [classes, levelFilter, searchTerm])

  const levelSummaries = useMemo(() => {
    const grouped = new Map<string, { name: string; levelLabel: string; arms: ClassArm[] }>()
    classes.forEach((classArm) => {
      const key = classArm.name || 'Unspecified'
      if (!grouped.has(key)) {
        grouped.set(key, { name: key, levelLabel: classArm.level || 'Not tagged', arms: [] })
      }
      grouped.get(key)!.arms.push(classArm)
    })
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [classes])

  const multiArmLevels = useMemo(() => levelSummaries.filter((summary) => summary.arms.length > 1).length, [levelSummaries])

  const lastSyncedLabel = lastSyncedAt ? lastSyncedAt.toLocaleString() : 'Awaiting first sync…'

  const resetCreateForm = () => {
    setCreateForm({ name: '', arm: '', level: '' })
    setCreateError(null)
  }

  const handleCreateArm = async () => {
    if (!createForm.name.trim() || !createForm.arm.trim()) {
      setCreateError('Class name and arm are required')
      return
    }
    setCreating(true)
    try {
      const response = await tenantApiPost('/api/tenant/cbt/classes', {
        name: createForm.name.trim(),
        arm: createForm.arm.trim(),
        level: createForm.level.trim(),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to create class arm')
      }
      setIsDialogOpen(false)
      resetCreateForm()
      loadClasses()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create class arm')
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Level orchestration</p>
          <h1 className="text-2xl font-bold text-gray-900">Classes & arms</h1>
          <p className="text-sm text-gray-600">Balance capacity, shift policies, and advisor coverage in one view.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadClasses} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Reload
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetCreateForm() }}>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add class arm
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create new class arm</DialogTitle>
                <DialogDescription>Provide the level and arm name that should appear across CBT workflows.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">Class / Level name</span>
                  <Input value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g., JSS 1" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">Arm</span>
                  <Input value={createForm.arm} onChange={(e) => setCreateForm((prev) => ({ ...prev, arm: e.target.value }))} placeholder="e.g., A" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-600">Level tag (optional)</span>
                  <Input value={createForm.level} onChange={(e) => setCreateForm((prev) => ({ ...prev, level: e.target.value }))} placeholder="Junior Secondary" />
                </label>
                {createError && <p className="text-xs text-rose-600">{createError}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetCreateForm() }}>Cancel</Button>
                  <Button onClick={handleCreateArm} disabled={creating}>{creating ? 'Saving…' : 'Create arm'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Unique levels</p>
            <p className="text-3xl font-semibold text-gray-900">{levelSummaries.length}</p>
            <p className="text-xs text-gray-500">Across {classes.length} arms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Multi-arm levels</p>
            <p className="text-3xl font-semibold text-gray-900">{multiArmLevels}</p>
            <p className="text-xs text-gray-500">Levels requiring per-arm scheduling</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Latest update</p>
            <p className="text-3xl font-semibold text-gray-900">{formatDate(classes[0]?.updatedAt)}</p>
            <p className="text-xs text-gray-500">Last synced: {lastSyncedLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-indigo-50 text-indigo-600 w-10 h-10 flex items-center justify-center">
              <Layers3 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Total arms</p>
            <p className="text-3xl font-semibold text-gray-900">{classes.length}</p>
            <p className="text-xs text-gray-500">Live from CBT data</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Level snapshot</CardTitle>
          <CardDescription>Live view of class arms grouped by level name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {levelSummaries.length === 0 && (
            <p className="text-sm text-gray-500">No class data available yet.</p>
          )}
          {levelSummaries.map((summary) => (
            <div key={summary.name} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{summary.name}</p>
                  <p className="text-xs text-gray-500">Tag: {summary.levelLabel}</p>
                </div>
                <Badge variant="outline" className="text-xs">{summary.arms.length} arm{summary.arms.length === 1 ? '' : 's'}</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-gray-600">
                {summary.arms.map((arm) => (
                  <div key={arm.id} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{arm.arm}</p>
                      <p className="text-xs text-gray-500">Updated: {formatDate(arm.updatedAt)}</p>
                    </div>
                    <Badge variant="outline" className="text-[11px]">{arm.level || 'Not tagged'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class directory</CardTitle>
          <CardDescription>These class arms feed directly into CBT exam creation and monitoring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by class or arm" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={levelFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setLevelFilter('all')}>
                All levels
              </Button>
              {levelOptions.map((level) => (
                <Button
                  key={level}
                  variant={levelFilter === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLevelFilter((prev) => (prev === level ? 'all' : level))}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Arm</TableHead>
                  <TableHead>Level tag</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-gray-500">
                      Loading classes…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredClasses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-gray-500">
                      No classes match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {filteredClasses.map((classArm) => (
                  <TableRow key={classArm.id}>
                    <TableCell className="font-semibold text-gray-900">{classArm.name}</TableCell>
                    <TableCell>{classArm.arm}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {classArm.level || 'Not tagged'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(classArm.createdAt)}</TableCell>
                    <TableCell>{formatDate(classArm.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default ClassesAndArms;
