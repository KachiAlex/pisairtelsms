import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, UserCog, Plus, Search, Loader, AlertCircle, RefreshCw } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { useToast } from '../ui/use-toast'

interface RoleDefinition {
  id: string
  name: string
  description: string
  member_count: number
  critical: boolean
  updated_at: string
}

interface PermissionRow {
  module: string
  scopes: string[]
}

function getApiHeaders() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
                }
  } catch {
    return { 'Content-Type': 'application/json'}
}

function NewRoleDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', critical: false })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      setSaving(true)
      const res = await fetch('/api/tenant/roles', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create role')
      toast({ title: 'Role created', description: `"${form.name}" is now available.` })
      setOpen(false)
      setForm({ name: '', description: '', critical: false })
      onCreated()
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />New role</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a new role</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label>Role name</Label>
            <Input required className="mt-1" placeholder="e.g. Transport Supervisor" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Input className="mt-1" placeholder="What does this role do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Mark as critical</p>
              <p className="text-xs text-gray-500">Critical roles require extra confirmation for destructive actions.</p>
            </div>
            <Switch checked={form.critical} onCheckedChange={v => setForm(f => ({ ...f, critical: Boolean(v) }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}Create role
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RolesPermissions() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionRow[]>([])
  const [grants, setGrants] = useState<Record<string, Record<string, Record<string, boolean>>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [savingGrant, setSavingGrant] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/tenant/roles', { headers: getApiHeaders() })
      if (!res.ok) throw new Error('Failed to load roles')
      const json = await res.json()
      const { roles: r, grants: g, permissionMatrix: pm } = json.data
      setRoles(r || [])
      setPermissionMatrix(pm || [])
      setGrants(g || {})
      if (!selectedRoleId && r?.length > 0) setSelectedRoleId(r[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [selectedRoleId])

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles
    return roles.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [roles, searchTerm])

  const selectedRole = useMemo(() => roles.find(r => r.id === selectedRoleId), [roles, selectedRoleId])

  const toggleGrant = async (module: string, scope: string) => {
    const current = grants[selectedRoleId]?.[module]?.[scope] ?? false
    const next = !current
    const key = `${selectedRoleId}|${module}|${scope}`

    setGrants(prev => ({
      ...prev,
      [selectedRoleId]: {
        ...prev[selectedRoleId],
        [module]: { ...(prev[selectedRoleId]?.[module] ?? {}), [scope]: next },
      },
    }))

    try {
      setSavingGrant(key)
      const res = await fetch('/api/tenant/roles', {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ roleId: selectedRoleId, module, scope, granted: next }),
      })
      if (!res.ok) {
        setGrants(prev => ({
          ...prev,
          [selectedRoleId]: {
            ...prev[selectedRoleId],
            [module]: { ...(prev[selectedRoleId]?.[module] ?? {}), [scope]: current },
          },
        }))
        toast({ title: 'Save failed', description: 'Permission change could not be saved.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Save failed', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setSavingGrant(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Access Control</p>
          <h1 className="text-2xl font-bold text-gray-900">Roles & permissions</h1>
          <p className="text-sm text-gray-500">Shape who can change what inside your Scholix tenant.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <NewRoleDialog onCreated={loadAll} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Role directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search roles" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><Loader className="h-6 w-6 animate-spin text-blue-600" /></div>
            ) : (
              <div className="space-y-3">
                {filteredRoles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${selectedRoleId === role.id ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                      <span className={`text-xs font-semibold ${role.critical ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {role.critical ? 'Critical' : 'Operational'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{role.member_count} members</span>
                      <span>Updated {new Date(role.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[440px]">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle>{selectedRole?.name ?? 'Select a role'}</CardTitle>
            </div>
            <p className="text-sm text-gray-500">Toggle the capabilities this role can perform. Changes save instantly.</p>
          </CardHeader>
          <CardContent>
            {!selectedRole ? (
              <p className="text-sm text-gray-400 py-8 text-center">Select a role from the left to manage its permissions.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    {permissionMatrix[0]?.scopes.map(s => (
                      <TableHead key={s} className="text-center text-xs">{s}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionMatrix.map(row => (
                    <TableRow key={row.module}>
                      <TableCell className="font-medium text-gray-900">{row.module}</TableCell>
                      {row.scopes.map(scope => {
                        const key = `${selectedRoleId}|${row.module}|${scope}`
                        return (
                          <TableCell key={scope} className="text-center">
                            <Switch
                              checked={Boolean(grants[selectedRoleId]?.[row.module]?.[scope])}
                              onCheckedChange={() => toggleGrant(row.module, scope)}
                              disabled={savingGrant === key}
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserCog className="h-4 w-4 text-emerald-600" />
              Role summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900">{roles.length} roles configured</p>
              <p className="text-sm text-gray-500">{roles.filter(r => r.critical).length} critical, {roles.filter(r => !r.critical).length} operational</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900">{permissionMatrix.length} modules protected</p>
              <p className="text-sm text-gray-500">{permissionMatrix.reduce((a, r) => a + r.scopes.length, 0)} total permission scopes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Selected role grants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedRole ? (
              <p className="text-sm text-gray-400">Select a role to see its active grants.</p>
            ) : permissionMatrix.map(row => {
              const activeScopes = row.scopes.filter(s => grants[selectedRoleId]?.[row.module]?.[s])
              if (activeScopes.length === 0) return null
              return (
                <div key={row.module} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">{row.module}</p>
                  <div className="flex flex-wrap gap-1">
                    {activeScopes.map(s => (
                      <span key={s} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{s}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default RolesPermissions;
