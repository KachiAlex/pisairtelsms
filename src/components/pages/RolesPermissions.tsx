import React, { useMemo, useState } from 'react'
import { ShieldCheck, UserCog, Plus, Search, Lock, Unlock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface RoleDefinition {
  id: string
  name: string
  description: string
  members: number
  critical: boolean
  lastUpdated: string
}

const roleDefinitions: RoleDefinition[] = [
  {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'Full platform control with guardrails on destructive actions.',
    members: 3,
    critical: true,
    lastUpdated: 'Today, 08:12',
  },
  {
    id: 'school-admin',
    name: 'School Admin',
    description: 'Runs day-to-day school operations and approvals.',
    members: 11,
    critical: true,
    lastUpdated: 'Yesterday, 14:45',
  },
  {
    id: 'faculty-lead',
    name: 'Faculty Lead',
    description: 'Manages teachers, classes, and assessments.',
    members: 28,
    critical: false,
    lastUpdated: 'Monday, 09:10',
  },
  {
    id: 'finance-officer',
    name: 'Finance Officer',
    description: 'Controls billing, payouts, and arrears workflows.',
    members: 7,
    critical: false,
    lastUpdated: 'Feb 12, 16:31',
  },
  {
    id: 'read-only',
    name: 'Read Only Auditor',
    description: 'View-only access for audits and reporting.',
    members: 4,
    critical: false,
    lastUpdated: 'Feb 10, 11:02',
  },
]

const permissionMatrix = [
  { module: 'Student Records', scopes: ['View profiles', 'Edit biodata', 'Export data'] },
  { module: 'Examinations', scopes: ['Schedule exams', 'Monitor live CBT', 'Publish results'] },
  { module: 'Finance', scopes: ['Configure fees', 'Approve waivers', 'Issue refunds'] },
  { module: 'Communication', scopes: ['Send SMS', 'Send emails', 'View communication logs'] },
  { module: 'Security', scopes: ['Manage roles', 'Force logout', 'View audit logs'] },
]

const timeline = [
  { actor: 'Adaeze Nwosu', action: 'Enabled fee waiver approval for Finance Officer', time: '2h ago' },
  { actor: 'Tunde Ajayi', action: 'Created new role: Transport Supervisor', time: 'Yesterday' },
  { actor: 'System', action: 'Auto-revoked unused access for 3 dormant staff', time: '2 days ago' },
]

export function RolesPermissions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState(roleDefinitions[0]?.id ?? '')
  const [grants, setGrants] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {}
    permissionMatrix.forEach((row) => {
      initial[row.module] = {}
      row.scopes.forEach((scope) => {
        initial[row.module][scope] = Math.random() > 0.4
      })
    })
    return initial
  })

  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roleDefinitions
    return roleDefinitions.filter((role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [searchTerm])

  const selectedRole = useMemo(() => roleDefinitions.find((role) => role.id === selectedRoleId), [selectedRoleId])

  const toggleGrant = (moduleName: string, scope: string) => {
    setGrants((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [scope]: !prev[moduleName]?.[scope],
      },
    }))
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
          <Button variant="outline">
            <Lock className="h-4 w-4 mr-2" />
            Access policies
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New role
          </Button>
        </div>
      </div>

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
              <Input
                placeholder="Search roles"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-3">
              {filteredRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedRoleId === role.id ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                    <span
                      className={`text-xs font-semibold ${role.critical ? 'text-rose-600' : 'text-emerald-600'}`}
                    >
                      {role.critical ? 'Critical' : 'Operational'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{role.members} members</span>
                    <span>Updated {role.lastUpdated}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[440px]">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle>{selectedRole?.name ?? 'Select a role'}</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600">
                Clone role
              </Button>
            </div>
            <p className="text-sm text-gray-500">Toggle the capabilities this role can perform.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  {['Capability A', 'Capability B', 'Capability C'].map((label, index) => (
                    <TableHead key={label} className="text-center">
                      {permissionMatrix[index]?.scopes[0] ? `Action ${index + 1}` : label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionMatrix.map((row) => (
                  <TableRow key={row.module}>
                    <TableCell className="font-medium text-gray-900">{row.module}</TableCell>
                    {row.scopes.map((scope) => (
                      <TableCell key={scope} className="text-center">
                        <Switch checked={Boolean(grants[row.module]?.[scope])} onCheckedChange={() => toggleGrant(row.module, scope)} />
                        <p className="mt-2 text-xs text-gray-500">{scope}</p>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserCog className="h-4 w-4 text-emerald-600" />
              Role insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900">Dormant access clean up</p>
              <p className="text-sm text-gray-500">6 users have not logged in for 45+ days.</p>
              <Button variant="ghost" size="sm" className="mt-2 text-blue-600">
                Revoke stale accounts
              </Button>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-900">Privileged scope review</p>
              <p className="text-sm text-gray-500">2 roles bypass dual approval for payouts.</p>
              <Button variant="ghost" size="sm" className="mt-2 text-blue-600">
                Open review
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Unlock className="h-4 w-4 text-blue-600" />
              Access timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {timeline.map((entry) => (
              <div key={entry.action} className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{entry.time}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{entry.actor}</p>
                  <p className="text-sm text-gray-500">{entry.action}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default RolesPermissions;
