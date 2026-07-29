import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Plus, Search, Filter, ShieldCheck, Mail, Loader, RefreshCw, AlertCircle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { useToast } from '../ui/use-toast'

interface UserAccount {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'invited' | 'suspended'
  last_active: string | null
  created_at: string
}

function getApiHeaders() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
                  ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json'}
}

const statusColors: Record<UserAccount['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700',
  invited: 'bg-amber-100 text-amber-700',
  suspended: 'bg-rose-100 text-rose-700',
}

const ROLES = ['School Admin', 'Finance Officer', 'Faculty Lead', 'Read Only Auditor', 'Staff']

function InviteUserDialog({ onInvited }: { onInvited: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sendInvite, setSendInvite] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', role: 'Staff' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/tenant/users', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to invite user')
      toast({ title: 'User invited', description: `${form.name} has been added${sendInvite ? ' and will receive an invite email' : ''}.` })
      setOpen(false)
      setForm({ name: '', email: '', role: 'Staff' })
      onInvited()
    } catch (err) {
      toast({ title: 'Invite failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>Provision an account with scoped access. They will be prompted to set a secure password.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label>Full name</Label>
            <Input placeholder="Adaeze Nwosu" required className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Work email</Label>
            <Input type="email" placeholder="you@school.edu" required className="mt-1" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label>Assign role</Label>
            <select className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Send invite email</p>
              <p className="text-xs text-gray-500">Deliver a secure one-time link to their inbox.</p>
            </div>
            <Switch checked={sendInvite} onCheckedChange={(value) => setSendInvite(Boolean(value))} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting || !form.name.trim() || !form.email.trim()}>
              {submitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
              Send invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UserAccounts() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | UserAccount['status']>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/tenant/users', { headers: getApiHeaders() })
      if (!res.ok) throw new Error('Failed to load users')
      const json = await res.json()
      setUsers(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleToggleStatus = async (user: UserAccount) => {
    const next = user.status === 'suspended' ? 'active' : 'suspended'
    try {
      setTogglingId(user.id)
      const res = await fetch('/api/tenant/users', {
        method: 'PATCH',
        headers: getApiHeaders(),
        body: JSON.stringify({ id: user.id, status: next }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update status')
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: next } : u))
      toast({ title: `User ${next === 'suspended' ? 'suspended' : 'reactivated'}`, description: `${user.name} is now ${next}.` })
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, searchTerm, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Workspace directory</p>
          <h1 className="text-2xl font-bold text-gray-900">User accounts</h1>
          <p className="text-sm text-gray-500">Invite, suspend, or reactivate teammates across your Scholix tenant.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <InviteUserDialog onInvited={loadUsers} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2.3fr_1fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Directory</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search people or roles"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Last active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader className="h-6 w-6 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-500"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No users found.</p></TableCell></TableRow>
                  ) : filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{user.role}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[user.status]}`}>
                          {user.status === 'active' && 'Active'}
                          {user.status === 'invited' && 'Invited'}
                          {user.status === 'suspended' && 'Suspended'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {user.last_active ? new Date(user.last_active).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.status !== 'invited' && (
                          <Button
                            size="sm" variant="ghost"
                            className={user.status === 'suspended' ? 'text-emerald-600' : 'text-rose-600'}
                            disabled={togglingId === user.id}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {togglingId === user.id ? <Loader className="h-3 w-3 animate-spin" /> : user.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Provisioning health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">{users.filter(u => u.status === 'active').length} active users</p>
                <p className="text-xs text-gray-500">{users.filter(u => u.status === 'suspended').length} suspended</p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">{users.filter(u => u.status === 'invited').length} pending invitations</p>
                <p className="text-xs text-gray-500">Resend reminders if they remain inactive for 48h.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-emerald-600" />
                Invitation log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              {users.filter(u => u.status === 'invited').length === 0 ? (
                <p className="text-gray-400 text-xs">No pending invitations.</p>
              ) : users.filter(u => u.status === 'invited').map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <span>{u.name} <span className="text-gray-400">({u.email})</span></span>
                  <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default UserAccounts;
