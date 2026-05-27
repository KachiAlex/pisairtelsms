import React, { useState, useEffect } from 'react'
import {
  Building2,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Power,
  RefreshCcw,
  ArrowUpRight,
  Users,
  Plus,
  X,
  Shield,
  UserPlus,
  Copy,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Progress } from '../ui/progress'

interface SuperAdminPortalProps {
  onSignOut: () => void
}

interface Tenant {
  id: string
  name: string
  subscription: string
  region: string
  usage: number
  status: string
  lastSync: string
  alerts: number
}

interface ProvisioningItem {
  id: string
  name: string
  type: string
  eta: string
  owner: string
}

interface ActivityItem {
  id: string
  title: string
  meta: string
}

interface Incident {
  id: string
  title: string
  impact: string
  status: string
  timestamp: string
}

interface AdminStats {
  activeTenants: number
  pendingProvisioning: number
  complianceAlerts: number
  overallHealth: string
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'Healthy':
      return <Badge className="bg-emerald-100 text-emerald-700">Healthy</Badge>
    case 'Degraded':
      return <Badge className="bg-amber-100 text-amber-700">Degraded</Badge>
    case 'Provisioning':
      return <Badge className="bg-blue-100 text-blue-700">Provisioning</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export function SuperAdminPortal({ onSignOut }: SuperAdminPortalProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [provisioningQueue, setProvisioningQueue] = useState<ProvisioningItem[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [incidentLog, setIncidentLog] = useState<Incident[]>([])
  const [showProvisionForm, setShowProvisionForm] = useState(false)
  const [provisionName, setProvisionName] = useState('')
  const [provisionRegion, setProvisionRegion] = useState('global')
  const [provisionPlan, setProvisionPlan] = useState('basic')
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  // Tenant Admins
  const [tenantAdmins, setTenantAdmins] = useState<Array<{
    id: string
    staffId: string
    name: string
    email: string
    role: string
    tenantId: string
    status: string
    createdAt: string
  }>>([])
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminRole, setAdminRole] = useState('tenant_admin')
  const [adminTenantId, setAdminTenantId] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  useEffect(() => {
    const authRaw = localStorage.getItem('auth')
    const token = authRaw ? JSON.parse(authRaw).token : null
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': 'super-admin',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    Promise.all([
      fetch('/api/admin/tenants', { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Tenants API ${r.status}`)
        return r.json()
      }).catch((e) => { console.error(e); return {} }),
      fetch('/api/admin/provisioning-queue', { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Provisioning API ${r.status}`)
        return r.json()
      }).catch((e) => { console.error(e); return {} }),
      fetch('/api/admin/activity-feed', { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Activity API ${r.status}`)
        return r.json()
      }).catch((e) => { console.error(e); return {} }),
      fetch('/api/admin/incidents', { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Incidents API ${r.status}`)
        return r.json()
      }).catch((e) => { console.error(e); return {} }),
      fetch('/api/admin/stats', { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Stats API ${r.status}`)
        return r.json()
      }).catch((e) => { console.error(e); return {} }),
      fetch('/api/admin/tenant-admins', { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`TenantAdmins API ${r.status}`)
        return r.json()
      }).catch((e) => { console.error(e); return {} }),
    ]).then(([tenantsRes, queueRes, feedRes, incidentsRes, statsRes, adminsRes]) => {
      if (tenantsRes.data) setTenants(tenantsRes.data)
      if (queueRes.data) setProvisioningQueue(queueRes.data)
      if (feedRes.data) setActivityFeed(feedRes.data)
      if (incidentsRes.data) setIncidentLog(incidentsRes.data)
      if (statsRes.data) setStats(statsRes.data)
      if (adminsRes.data) setTenantAdmins(adminsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  async function handleProvisionSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProvisionError(null)
    if (!provisionName.trim() || provisionName.trim().length < 2) {
      setProvisionError('Tenant name must be at least 2 characters')
      return
    }
    setProvisionLoading(true)
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'super-admin',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: provisionName.trim(),
          subscription: provisionPlan,
          region: provisionRegion,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to provision tenant')
      }
      setTenants((prev) => [...prev, data.data])
      setShowProvisionForm(false)
      setProvisionName('')
      setProvisionPlan('basic')
      setProvisionRegion('global')
    } catch (err: any) {
      setProvisionError(err.message || 'Something went wrong')
    } finally {
      setProvisionLoading(false)
    }
  }

  async function handleCreateAdminSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAdminError(null)
    setGeneratedPassword(null)
    if (!adminName.trim() || adminName.trim().length < 2) {
      setAdminError('Name is required (min 2 chars)')
      return
    }
    if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setAdminError('Valid email is required')
      return
    }
    if (!adminTenantId.trim()) {
      setAdminError('Please select a tenant')
      return
    }
    setAdminLoading(true)
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/tenant-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'super-admin',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: adminName.trim(),
          email: adminEmail.trim(),
          role: adminRole,
          tenantId: adminTenantId,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create tenant admin')
      }
      setTenantAdmins((prev) => [...prev, data.data])
      setGeneratedPassword(data.generatedPassword || null)
      setAdminName('')
      setAdminEmail('')
      setAdminRole('tenant_admin')
      setAdminTenantId('')
    } catch (err: any) {
      setAdminError(err.message || 'Something went wrong')
    } finally {
      setAdminLoading(false)
    }
  }

  async function toggleAdminStatus(id: string, status: string) {
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/tenant-admins', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'super-admin',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      setTenantAdmins((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: data.data.status } : a))
      )
    } catch (err: any) {
      setAdminError(err.message || 'Failed to update status')
    }
  }

  const tenantsNeedingAttention = tenants.filter((tenant) => tenant.alerts > 0)

  const tenantStats = [
    { label: 'Active Tenants', value: stats?.activeTenants?.toString() ?? '—', delta: 'live count', color: 'text-blue-600', bg: 'bg-blue-50', icon: Building2 },
    { label: 'Pending Provisioning', value: stats?.pendingProvisioning?.toString() ?? '—', delta: 'in queue', color: 'text-purple-600', bg: 'bg-purple-50', icon: RefreshCcw },
    { label: 'Compliance Alerts', value: stats?.complianceAlerts?.toString() ?? '—', delta: 'open', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
    { label: 'Overall Health', value: stats?.overallHealth ?? '—', delta: 'uptime', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ShieldCheck },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading portal data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Scholix Super Admin</p>
            <h1 className="text-2xl font-semibold text-slate-900">Tenant orchestration command center</h1>
            <p className="text-sm text-slate-500">
              Monitor health, compliance, and provisioning across every subscribed school network.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Security controls
            </Button>
            <Button variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              Run diagnostics
            </Button>
            <Button onClick={onSignOut} className="bg-slate-900 hover:bg-slate-800">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Stats overview */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tenantStats.map((stat) => (
            <Card key={stat.label} className="border border-slate-100">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                  <p className={`text-xs font-medium ${stat.color}`}>{stat.delta}</p>
                </div>
                <div className={`rounded-2xl ${stat.bg} p-3 text-slate-700`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tenants + Provisioning */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Connected tenants</CardTitle>
                  <p className="text-sm text-slate-500">Live pulse across every deployed workspace.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    Regions
                  </Button>
                  <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => { setShowProvisionForm((s) => !s); setProvisionError(null) }}>
                    {showProvisionForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showProvisionForm ? 'Cancel' : 'Provision tenant'}
                  </Button>
                </div>
              </div>
              {showProvisionForm && (
                <form onSubmit={handleProvisionSubmit} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tenant name</label>
                    <input
                      type="text"
                      value={provisionName}
                      onChange={(e) => setProvisionName(e.target.value)}
                      placeholder="e.g. Lincoln High School"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
                      <select
                        value={provisionPlan}
                        onChange={(e) => setProvisionPlan(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                      <select
                        value={provisionRegion}
                        onChange={(e) => setProvisionRegion(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="global">Global</option>
                        <option value="us-east">US East</option>
                        <option value="eu-west">EU West</option>
                        <option value="asia-pacific">Asia Pacific</option>
                      </select>
                    </div>
                  </div>
                  {provisionError && <p className="text-sm text-red-600">{provisionError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={provisionLoading}>
                      {provisionLoading ? 'Provisioning...' : 'Create tenant'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowProvisionForm(false)} disabled={provisionLoading}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <TabsList>
                    <TabsTrigger value="all">All tenants</TabsTrigger>
                    <TabsTrigger value="alerts">Needs attention</TabsTrigger>
                  </TabsList>
                  <p className="text-xs text-slate-500">Data refreshed 16 seconds ago</p>
                </div>

                <TabsContent value="all" className="mt-4">
                  <div className="rounded-xl border border-slate-100">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tenant</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead>Adoption</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Last sync</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenants.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-gray-500">No tenants found</TableCell></TableRow>
                        ) : tenants.map((tenant) => (
                          <TableRow key={tenant.id ?? tenant.name}>
                            <TableCell>
                              <div className="font-medium text-slate-900">{tenant.name}</div>
                              <p className="text-xs text-slate-500">{tenant.alerts > 0 ? `${tenant.alerts} open alerts` : 'Operational'}</p>
                            </TableCell>
                            <TableCell>{tenant.subscription}</TableCell>
                            <TableCell>{tenant.region}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={tenant.usage} className="h-2" />
                                <span className="text-sm text-slate-600">{tenant.usage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{statusBadge(tenant.status)}</TableCell>
                            <TableCell className="text-right text-sm text-slate-500">{tenant.lastSync}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="alerts" className="mt-4">
                  {tenantsNeedingAttention.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      All tenants are healthy right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tenantsNeedingAttention.map((tenant) => (
                        <div key={tenant.id ?? tenant.name} className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{tenant.name}</p>
                              <p className="text-xs text-slate-500">{tenant.alerts} alert(s) • {tenant.status}</p>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1">
                              Investigate
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Provisioning queue</CardTitle>
              <p className="text-sm text-slate-500">Fast-track rollouts and escalations.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {provisioningQueue.length === 0 ? (
                <p className="text-sm text-slate-500">No items in queue</p>
              ) : provisioningQueue.map((item) => (
                <div key={item.id ?? item.name} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.type}</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700">{item.eta}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Owner • {item.owner}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Pause
                    </Button>
                    <Button size="sm" className="flex-1 bg-slate-900 hover:bg-slate-800">
                      Push live
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Tenant Admins */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Tenant Admins</CardTitle>
                <p className="text-sm text-slate-500">Manage administrators across all tenants.</p>
              </div>
              <Button
                size="sm"
                className="gap-2 bg-slate-900 hover:bg-slate-800"
                onClick={() => {
                  setShowAdminForm((s) => !s)
                  setAdminError(null)
                  setGeneratedPassword(null)
                }}
              >
                {showAdminForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {showAdminForm ? 'Cancel' : 'Create Tenant Admin'}
              </Button>
            </div>
            {showAdminForm && (
              <form onSubmit={handleCreateAdminSubmit} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      required
                      minLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="john@school.edu"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tenant</label>
                    <select
                      value={adminTenantId}
                      onChange={(e) => setAdminTenantId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      required
                    >
                      <option value="">Select a tenant</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="tenant_admin">Tenant Admin</option>
                      <option value="Admin">Admin</option>
                      <option value="Principal">Principal</option>
                    </select>
                  </div>
                </div>
                {adminError && <p className="text-sm text-red-600">{adminError}</p>}
                {generatedPassword && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Tenant admin created successfully</p>
                      <p className="text-xs text-emerald-700">Temporary password: <span className="font-mono font-semibold">{generatedPassword}</span></p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      onClick={() => navigator.clipboard.writeText(generatedPassword)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800" disabled={adminLoading}>
                    {adminLoading ? 'Creating...' : 'Create admin'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowAdminForm(false)} disabled={adminLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantAdmins.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-500">No tenant admins found</TableCell></TableRow>
                  ) : tenantAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{admin.name}</div>
                        <div className="text-xs text-slate-500">{admin.staffId}</div>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tenants.find((t) => t.id === admin.tenantId)?.name || admin.tenantId}
                      </TableCell>
                      <TableCell>{statusBadge(admin.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {admin.status !== 'active' ? (
                            <Button size="sm" variant="outline" onClick={() => toggleAdminStatus(admin.id, 'active')}>
                              Activate
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => toggleAdminStatus(admin.id, 'suspended')}>
                              Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Incidents + Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle>Operational incidents</CardTitle>
              <p className="text-sm text-slate-500">Live SRE timeline across connected services.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {incidentLog.length === 0 ? (
                <p className="text-sm text-slate-500">No incidents</p>
              ) : incidentLog.map((incident) => (
                <div key={incident.id ?? incident.title} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{incident.title}</p>
                      <p className="text-xs text-slate-500">Impact: {incident.impact}</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700">{incident.timestamp}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    {incident.status === 'Mitigated' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-slate-600">Status: {incident.status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle>Activity feed</CardTitle>
              <p className="text-sm text-slate-500">Latest orchestration and compliance events.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityFeed.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity</p>
              ) : activityFeed.map((activity) => (
                <div key={activity.id ?? activity.title} className="flex items-start gap-3">
                  <div className="rounded-full bg-white p-2 shadow-sm bg-slate-100">
                    <Activity className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-500">{activity.meta}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
export default SuperAdminPortal;
