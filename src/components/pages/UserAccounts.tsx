import React, { useMemo, useState } from 'react'
import { Users, Plus, Search, Filter, ShieldCheck, Mail } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

interface UserAccount {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'invited' | 'suspended'
  lastActive: string
}

const userAccounts: UserAccount[] = [
  { id: '1', name: 'Adaeze Nwosu', email: 'adaeze@scholix.com', role: 'Super Admin', status: 'active', lastActive: '3m ago' },
  { id: '2', name: 'Tunde Ajayi', email: 'tajayi@heritage.edu', role: 'School Admin', status: 'active', lastActive: '8m ago' },
  { id: '3', name: 'Chioma Okeke', email: 'cokeke@heritage.edu', role: 'Finance Officer', status: 'active', lastActive: '20m ago' },
  { id: '4', name: 'Ibrahim Hassan', email: 'ihassan@heritage.edu', role: 'Faculty Lead', status: 'invited', lastActive: '—' },
  { id: '5', name: 'Lola Balogun', email: 'lbalogun@heritage.edu', role: 'Read Only Auditor', status: 'suspended', lastActive: '5d ago' },
  { id: '6', name: 'John Mensah', email: 'jmensah@heritage.edu', role: 'Transport Supervisor', status: 'active', lastActive: '1h ago' },
]

const statusColors: Record<UserAccount['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700',
  invited: 'bg-amber-100 text-amber-700',
  suspended: 'bg-rose-100 text-rose-700',
}

function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [sendInvite, setSendInvite] = useState(true)

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
        <form className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input placeholder="Adaeze Nwosu" required className="mt-1" />
          </div>
          <div>
            <Label>Work email</Label>
            <Input type="email" placeholder="you@school.edu" required className="mt-1" />
          </div>
          <div>
            <Label>Assign role</Label>
            <select className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option>School Admin</option>
              <option>Finance Officer</option>
              <option>Faculty Lead</option>
              <option>Read Only Auditor</option>
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Send invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UserAccounts() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | UserAccount['status']>('all')

  const filteredUsers = useMemo(() => {
    return userAccounts.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Workspace directory</p>
          <h1 className="text-2xl font-bold text-gray-900">User accounts</h1>
          <p className="text-sm text-gray-500">Invite, suspend, or reactivate teammates across your Scholix tenant.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Bulk actions
          </Button>
          <InviteUserDialog />
        </div>
      </div>

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
                  {filteredUsers.map((user) => (
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
                      <TableCell className="text-right text-sm text-gray-500">{user.lastActive}</TableCell>
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
                <p className="text-sm font-semibold text-gray-900">24 active sessions</p>
                <p className="text-xs text-gray-500">3 password resets requested today.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">2 pending invitations</p>
                <p className="text-xs text-gray-500">Resend reminders if they remain inactive for 48h.</p>
                <Button variant="ghost" size="sm" className="mt-2 text-blue-600">
                  Send reminders
                </Button>
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
              <div className="flex items-center justify-between">
                <span>Adaeze invited Chioma</span>
                <span className="text-xs text-gray-400">2h ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span>System revoked 3 dormant accounts</span>
                <span className="text-xs text-gray-400">Yesterday</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tunde reactivated Ibrahim</span>
                <span className="text-xs text-gray-400">3d ago</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default UserAccounts;
