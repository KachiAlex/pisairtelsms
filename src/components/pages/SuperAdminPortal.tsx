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
  KeyRound,
  Ban,
  Server,
  Zap,
} from 'lucide-react'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Progress } from '../ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'

import { useToast } from '../ui/use-toast'

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
    case 'active':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
    case 'Degraded':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Degraded</Badge>
    case 'Provisioning':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Provisioning</Badge>
    case 'suspended':
      return <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export function SuperAdminPortal({ onSignOut }: SuperAdminPortalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [provisioningQueue, setProvisioningQueue] = useState<ProvisioningItem[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [incidentLog, setIncidentLog] = useState<Incident[]>([])
  const [showProvisionForm, setShowProvisionForm] = useState(false)
  const [provisionName, setProvisionName] = useState('')
  const [provisionRegion, setProvisionRegion] = useState('global')
  const [provisionPlan, setProvisionPlan] = useState('starter')
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  // Tenant Admin Modal
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [modalAdmins, setModalAdmins] = useState<Array<{
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
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [resetPasswordResult, setResetPasswordResult] = useState<{ name: string; password: string } | null>(null)
  const [tenantActionLoading, setTenantActionLoading] = useState(false)
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null)
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    const authRaw = localStorage.getItem('auth')
    const token = authRaw ? JSON.parse(authRaw).token : null
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
    ]).then(([tenantsRes, queueRes, feedRes, incidentsRes, statsRes]) => {
      if (tenantsRes.data) setTenants(tenantsRes.data)
      if (queueRes.data) setProvisioningQueue(queueRes.data)
      if (feedRes.data) setActivityFeed(feedRes.data)
      if (incidentsRes.data) setIncidentLog(incidentsRes.data)
      if (statsRes.data) setStats(statsRes.data)
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
      setProvisionPlan('starter')
      setProvisionRegion('global')
    } catch (err: any) {
      setProvisionError(err.message || 'Something went wrong')
    } finally {
      setProvisionLoading(false)
    }
  }

  async function loadAdminsForTenant(tenantId: string) {
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch(`/api/admin/tenant-admins?tenantId=${tenantId}`, {
        headers: {
          'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()
      if (res.ok && data.success) setModalAdmins(data.data)
      else setModalAdmins([])
    } catch (e) {
      console.error(e)
      setModalAdmins([])
    }
  }

  function openAdminModal(tenant: Tenant) {
    setSelectedTenant(tenant)
    setAdminModalOpen(true)
    setShowAdminForm(false)
    setAdminError(null)
    setGeneratedPassword(null)
    setResetPasswordResult(null)
    setAdminName('')
    setAdminEmail('')
    setAdminRole('tenant_admin')
    setAdminPassword('')
    loadAdminsForTenant(tenant.id)
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
    if (!selectedTenant) {
      setAdminError('No tenant selected')
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
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: adminName.trim(),
          email: adminEmail.trim(),
          role: adminRole,
          tenantId: selectedTenant.id,
          password: adminPassword.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create tenant admin')
      }
      setModalAdmins((prev) => [...prev, data.data])
      setGeneratedPassword(data.generatedPassword || null)
      setAdminName('')
      setAdminEmail('')
      setAdminRole('tenant_admin')
      setAdminPassword('')
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
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      setModalAdmins((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: data.data.status } : a))
      )
    } catch (err: any) {
      setAdminError(err.message || 'Failed to update status')
    }
  }

  async function resetAdminPassword(adminId: string, adminName: string, password?: string) {
    setResetLoading(true)
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/tenant-admins', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: adminId, password: password || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reset password')
      setResetPasswordResult({ name: adminName, password: data.generatedPassword })
      setAdminError(null)
      setResetTarget(null)
      setResetPasswordInput('')
    } catch (err: any) {
      setAdminError(err.message || 'Failed to reset password')
    } finally {
      setResetLoading(false)
    }
  }

  async function updateTenantStatus(tenantId: string, status: string) {
    setTenantActionLoading(true)
    try {
      const authRaw = localStorage.getItem('auth')
      const token = authRaw ? JSON.parse(authRaw).token : null
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: tenantId, status }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update tenant')
      setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, status: data.data.status } : t)))
      if (selectedTenant && selectedTenant.id === tenantId) {
        setSelectedTenant((prev) => (prev ? { ...prev, status: data.data.status } : prev))
      }
    } catch (err: any) {
      setAdminError(err.message || 'Failed to update tenant')
    } finally {
      setTenantActionLoading(false)
    }
  }

  const tenantsNeedingAttention = tenants.filter((tenant) => tenant.alerts > 0)

  const tenantStats = [
    { label: 'Active Tenants', value: stats?.activeTenants?.toString() ?? '—', delta: 'live count', icon: Building2 },
    { label: 'Pending Provisioning', value: stats?.pendingProvisioning?.toString() ?? '—', delta: 'in queue', icon: RefreshCcw },
    { label: 'Compliance Alerts', value: stats?.complianceAlerts?.toString() ?? '—', delta: 'open', icon: AlertTriangle },
    { label: 'Overall Health', value: stats?.overallHealth ?? '—', delta: 'uptime', icon: ShieldCheck },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3f1ea]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#d5cfc0] border-t-[#e31e24] rounded-full animate-spin" />
          <p className="text-sm text-[#5b5c63]">Loading command center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f1ea]">
      <header className="border-b border-[#e6e2d8] bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-[42px] w-[42px] rounded-[12px] bg-[#15161a] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-[#e31e24]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#9b9a94]">Pisairtel Schools</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#e31e24] bg-[#e31e24]/10 px-2 py-0.5 rounded-full">Super Admin</span>
              </div>
              <h1 className="text-xl font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                Command Center
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2 border-[#d5cfc0] text-[#5b5c63] hover:bg-[#f3f1ea] hover:text-[#15161a]" onClick={() => toast({ title: 'Security Controls', description: 'Global firewall and encryption settings are currently managed via Terraform.' })}>
              <ShieldCheck className="h-4 w-4" />
              Security
            </Button>
            <Button variant="outline" className="gap-2 border-[#d5cfc0] text-[#5b5c63] hover:bg-[#f3f1ea] hover:text-[#15161a]" onClick={() => toast({ title: 'System Diagnostics', description: 'Starting global health scan across all clusters...' })}>
              <Activity className="h-4 w-4" />
              Diagnostics
            </Button>
            <Button onClick={onSignOut} className="bg-[#15161a] hover:bg-[#15161a]/90 text-white gap-2 rounded-lg">
              <Power className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Stats overview */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tenantStats.map((stat, idx) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#e6e2d8] bg-white p-5 transition-all hover:shadow-md hover:border-[#d5cfc0]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[#9b9a94] uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-semibold text-[#15161a] mt-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>{stat.value}</p>
                  <p className="text-xs text-[#5b5c63] mt-0.5">{stat.delta}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${
                  idx === 0 ? 'bg-[#e31e24]/10' :
                  idx === 1 ? 'bg-[#F7931E]/10' :
                  idx === 2 ? 'bg-[#F7C93C]/10' :
                  'bg-emerald-50'
                }`}>
                  <stat.icon className={`h-5 w-5 ${
                    idx === 0 ? 'text-[#e31e24]' :
                    idx === 1 ? 'text-[#F7931E]' :
                    idx === 2 ? 'text-[#F7C93C]' :
                    'text-emerald-600'
                  }`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tenants + Provisioning */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-[#e6e2d8] bg-white overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                    Connected Tenants
                  </h2>
                  <p className="text-sm text-[#5b5c63]">Live pulse across every deployed workspace.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 border-[#d5cfc0] text-[#5b5c63] hover:bg-[#f3f1ea]" onClick={() => toast({ title: 'Region Status', description: 'All regions (US-East, EU-West, Asia-Pacific) are currently operational.' })}>
                    <Globe className="h-4 w-4" />
                    Regions
                  </Button>
                  <Button size="sm" className="gap-2 bg-[#e31e24] hover:bg-[#cf1a1f] text-white rounded-lg" onClick={() => { setShowProvisionForm((s) => !s); setProvisionError(null) }}>
                    {showProvisionForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showProvisionForm ? 'Cancel' : 'Provision'}
                  </Button>
                </div>
              </div>
              {showProvisionForm && (
                <form onSubmit={handleProvisionSubmit} className="rounded-xl border border-[#e6e2d8] bg-[#f3f1ea] p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[#15161a] mb-1">Tenant name</label>
                    <input
                      type="text"
                      value={provisionName}
                      onChange={(e) => setProvisionName(e.target.value)}
                      placeholder="e.g. Lincoln High School"
                      className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                      required
                      minLength={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#15161a] mb-1">Plan</label>
                      <select
                        value={provisionPlan}
                        onChange={(e) => setProvisionPlan(e.target.value)}
                        className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                      >
                        <option value="starter">Starter (₦2,000)</option>
                        <option value="standard">Standard (₦3,000)</option>
                        <option value="premium">Premium (₦6,000)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#15161a] mb-1">Region</label>
                      <select
                        value={provisionRegion}
                        onChange={(e) => setProvisionRegion(e.target.value)}
                        className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                      >
                        <option value="global">Global</option>
                        <option value="us-east">US East</option>
                        <option value="eu-west">EU West</option>
                        <option value="asia-pacific">Asia Pacific</option>
                      </select>
                    </div>
                  </div>
                  {provisionError && <p className="text-sm text-[#e31e24]">{provisionError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-[#e31e24] hover:bg-[#cf1a1f] text-white rounded-lg" disabled={provisionLoading}>
                      {provisionLoading ? 'Provisioning...' : 'Create tenant'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="border-[#d5cfc0] text-[#5b5c63]" onClick={() => setShowProvisionForm(false)} disabled={provisionLoading}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <TabsList className="bg-[#f3f1ea]">
                    <TabsTrigger value="all">All tenants</TabsTrigger>
                    <TabsTrigger value="alerts">Needs attention</TabsTrigger>
                  </TabsList>
                  <p className="text-xs text-[#9b9a94]">Data refreshed {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                <TabsContent value="all" className="mt-4">
                  <div className="rounded-xl border border-[#e6e2d8] overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f3f1ea] border-[#e6e2d8]">
                          <TableHead className="text-[#5b5c63] font-medium">Tenant</TableHead>
                          <TableHead className="text-[#5b5c63] font-medium">Plan</TableHead>
                          <TableHead className="text-[#5b5c63] font-medium">Region</TableHead>
                          <TableHead className="text-[#5b5c63] font-medium">Adoption</TableHead>
                          <TableHead className="text-[#5b5c63] font-medium">Status</TableHead>
                          <TableHead className="text-right text-[#5b5c63] font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenants.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-[#9b9a94] py-8">No tenants found</TableCell></TableRow>
                        ) : tenants.map((tenant) => (
                          <TableRow key={tenant.id ?? tenant.name} className="border-[#e6e2d8] hover:bg-[#f3f1ea]/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-[#15161a] flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-4 w-4 text-[#F7931E]" />
                                </div>
                                <div>
                                  <div className="font-medium text-[#15161a]">{tenant.name}</div>
                                  <p className="text-xs text-[#9b9a94]">{tenant.alerts > 0 ? `${tenant.alerts} open alerts` : 'Operational'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><span className="text-sm text-[#5b5c63] capitalize">{tenant.subscription}</span></TableCell>
                            <TableCell><span className="text-sm text-[#5b5c63]">{tenant.region}</span></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 w-32">
                                <Progress value={tenant.usage} className="h-2" />
                                <span className="text-xs text-[#5b5c63]">{tenant.usage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{statusBadge(tenant.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="gap-1 border-[#d5cfc0] text-[#15161a] hover:bg-[#f3f1ea] rounded-lg" onClick={() => openAdminModal(tenant)}>
                                <Shield className="h-3.5 w-3.5" />
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="alerts" className="mt-4">
                  {tenantsNeedingAttention.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#d5cfc0] p-8 text-center text-sm text-[#9b9a94]">
                      All tenants are healthy right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tenantsNeedingAttention.map((tenant) => (
                        <div key={tenant.id ?? tenant.name} className="rounded-xl border border-[#F7C93C]/40 bg-[#F7C93C]/5 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[#15161a]">{tenant.name}</p>
                              <p className="text-xs text-[#5b5c63]">{tenant.alerts} alert(s) • {tenant.status}</p>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1 border-[#d5cfc0] text-[#15161a] rounded-lg">
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
            </div>
          </div>

          <div className="rounded-2xl border border-[#e6e2d8] bg-white overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-[#F7931E]/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[#F7931E]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                    Provisioning Queue
                  </h2>
                  <p className="text-xs text-[#9b9a94]">Fast-track rollouts</p>
                </div>
              </div>
              <div className="space-y-3">
                {provisioningQueue.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d5cfc0] p-6 text-center text-sm text-[#9b9a94]">
                    No items in queue
                  </div>
                ) : provisioningQueue.map((item) => (
                  <div key={item.id ?? item.name} className="rounded-xl border border-[#e6e2d8] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#15161a]">{item.name}</p>
                        <p className="text-xs text-[#9b9a94]">{item.type}</p>
                      </div>
                      <Badge className="bg-[#F7931E]/10 text-[#F7931E] border-[#F7931E]/20">{item.eta}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-[#5b5c63]">Owner • {item.owner}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 border-[#d5cfc0] text-[#5b5c63] rounded-lg">
                        Pause
                      </Button>
                      <Button size="sm" className="flex-1 bg-[#15161a] hover:bg-[#15161a]/90 text-white rounded-lg">
                        Push live
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Incidents + Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[#e6e2d8] bg-white overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-[#e31e24]/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-[#e31e24]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                    Operational Incidents
                  </h2>
                  <p className="text-xs text-[#9b9a94]">Live SRE timeline</p>
                </div>
              </div>
              <div className="space-y-3">
                {incidentLog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d5cfc0] p-6 text-center text-sm text-[#9b9a94]">
                    No incidents
                  </div>
                ) : incidentLog.map((incident) => (
                  <div key={incident.id ?? incident.title} className="rounded-xl border border-[#e6e2d8] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#15161a]">{incident.title}</p>
                        <p className="text-xs text-[#9b9a94]">Impact: {incident.impact}</p>
                      </div>
                      <Badge className="bg-[#f3f1ea] text-[#5b5c63] border-[#d5cfc0]">{incident.timestamp}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      {incident.status === 'Mitigated' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-[#F7C93C]" />
                      )}
                      <span className="text-[#5b5c63]">Status: {incident.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e6e2d8] bg-white overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-[#F7C93C]/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-[#F7C93C]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                    Activity Feed
                  </h2>
                  <p className="text-xs text-[#9b9a94]">Latest orchestration events</p>
                </div>
              </div>
              <div className="space-y-3">
                {activityFeed.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d5cfc0] p-6 text-center text-sm text-[#9b9a94]">
                    No recent activity
                  </div>
                ) : activityFeed.map((activity) => (
                  <div key={activity.id ?? activity.title} className="flex items-start gap-3">
                    <div className="rounded-full bg-[#f3f1ea] p-2 flex-shrink-0">
                      <Activity className="h-4 w-4 text-[#5b5c63]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#15161a]">{activity.title}</p>
                      <p className="text-xs text-[#9b9a94]">{activity.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 pb-2">
          <p className="text-xs text-[#9b9a94]">
            Pisairtel Schools · Super Admin Command Center
          </p>
          <div className="flex items-center gap-2 text-xs text-[#9b9a94]">
            <Server className="h-3.5 w-3.5" />
            <span>All systems operational</span>
          </div>
        </div>
      </main>

      {/* Tenant Admin Management Modal */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-[#15161a]">
                  <div className="h-7 w-7 rounded-lg bg-[#15161a] flex items-center justify-center">
                    <Shield className="h-4 w-4 text-[#e31e24]" />
                  </div>
                  {selectedTenant ? `Manage Admins — ${selectedTenant.name}` : 'Manage Admins'}
                </DialogTitle>
                <DialogDescription className="text-[#5b5c63]">
                  Create and manage administrators for this tenant.
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {selectedTenant && selectedTenant.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-[#e31e24] border-[#e31e24]/20 hover:bg-[#e31e24]/5 rounded-lg"
                    disabled={tenantActionLoading}
                    onClick={() => updateTenantStatus(selectedTenant.id, 'suspended')}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg"
                    disabled={tenantActionLoading}
                    onClick={() => updateTenantStatus(selectedTenant!.id, 'active')}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Renew
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {selectedTenant && (
              <div className="flex items-center gap-2 text-sm text-[#5b5c63]">
                <span className="font-medium text-[#15161a]">Status:</span>
                {statusBadge(selectedTenant.status)}
                <span className="ml-2">Plan: <span className="capitalize">{selectedTenant.subscription}</span></span>
              </div>
            )}

            {adminError && (
              <div className="rounded-lg border border-[#e31e24]/20 bg-[#e31e24]/5 p-3">
                <p className="text-sm text-[#e31e24]">{adminError}</p>
              </div>
            )}
            {resetPasswordResult && (
              <div className="rounded-lg border border-[#F7931E]/20 bg-[#F7931E]/5 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#15161a]">Password reset for {resetPasswordResult.name}</p>
                  <p className="text-xs text-[#5b5c63]">New temporary password: <span className="font-mono font-semibold text-[#e31e24]">{resetPasswordResult.password}</span></p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#F7931E]/20 text-[#F7931E] hover:bg-[#F7931E]/10 rounded-lg"
                  onClick={() => navigator.clipboard.writeText(resetPasswordResult.password)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2 bg-[#15161a] hover:bg-[#15161a]/90 text-white rounded-lg"
                onClick={() => {
                  setShowAdminForm((s) => !s)
                  setAdminError(null)
                  setGeneratedPassword(null)
                  setResetPasswordResult(null)
                }}
              >
                {showAdminForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {showAdminForm ? 'Cancel' : 'Create Admin'}
              </Button>
            </div>

            {showAdminForm && (
              <form onSubmit={handleCreateAdminSubmit} className="rounded-xl border border-[#e6e2d8] bg-[#f3f1ea] p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#15161a] mb-1">Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                      required
                      minLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#15161a] mb-1">Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="john@school.edu"
                      className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#15161a] mb-1">Role</label>
                  <select
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value)}
                    className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                  >
                    <option value="tenant_admin">Tenant Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Principal">Principal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#15161a] mb-1">
                    Password <span className="text-[#9b9a94] font-normal">(optional — auto-generated if left blank)</span>
                  </label>
                  <input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                    minLength={6}
                  />
                </div>
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
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                      onClick={() => navigator.clipboard.writeText(generatedPassword)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="bg-[#e31e24] hover:bg-[#cf1a1f] text-white rounded-lg" disabled={adminLoading}>
                    {adminLoading ? 'Creating...' : 'Create admin'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-[#d5cfc0] text-[#5b5c63] rounded-lg" onClick={() => setShowAdminForm(false)} disabled={adminLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-[#e6e2d8] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f3f1ea] border-[#e6e2d8]">
                    <TableHead className="text-[#5b5c63] font-medium">Name</TableHead>
                    <TableHead className="text-[#5b5c63] font-medium">Email</TableHead>
                    <TableHead className="text-[#5b5c63] font-medium">Role</TableHead>
                    <TableHead className="text-[#5b5c63] font-medium">Status</TableHead>
                    <TableHead className="text-right text-[#5b5c63] font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalAdmins.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-[#9b9a94] py-6">No tenant admins found</TableCell></TableRow>
                  ) : modalAdmins.map((admin) => (
                    <TableRow key={admin.id} className="border-[#e6e2d8] hover:bg-[#f3f1ea]/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#15161a] flex items-center justify-center flex-shrink-0">
                            <Users className="h-3.5 w-3.5 text-[#F7931E]" />
                          </div>
                          <div>
                            <div className="font-medium text-[#15161a]">{admin.name}</div>
                            <div className="text-xs text-[#9b9a94]">{admin.staffId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[#5b5c63]">{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 border-[#d5cfc0] text-[#5b5c63]">
                          <Shield className="h-3 w-3" />
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(admin.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#9b9a94] hover:text-[#e31e24] rounded-lg"
                            onClick={() => { setResetTarget({ id: admin.id, name: admin.name }); setResetPasswordInput(''); setAdminError(null) }}
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {admin.status !== 'active' ? (
                            <Button size="sm" variant="outline" className="border-[#d5cfc0] text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={() => toggleAdminStatus(admin.id, 'active')}>
                              Activate
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="border-[#d5cfc0] text-[#e31e24] hover:bg-[#e31e24]/5 rounded-lg" onClick={() => toggleAdminStatus(admin.id, 'suspended')}>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setResetPasswordInput('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#15161a]">
              <div className="h-7 w-7 rounded-lg bg-[#15161a] flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-[#e31e24]" />
              </div>
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-[#5b5c63]">
              {resetTarget ? `Set a new password for ${resetTarget.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#15161a] mb-1">
                New Password <span className="text-[#9b9a94] font-normal">(leave blank to auto-generate)</span>
              </label>
              <input
                type="text"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24]"
                minLength={6}
              />
            </div>
            {adminError && (
              <div className="rounded-lg border border-[#e31e24]/20 bg-[#e31e24]/5 p-3">
                <p className="text-sm text-[#e31e24]">{adminError}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-[#d5cfc0] text-[#5b5c63] rounded-lg"
                onClick={() => { setResetTarget(null); setResetPasswordInput(''); setAdminError(null) }}
                disabled={resetLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#e31e24] hover:bg-[#cf1a1f] text-white rounded-lg gap-2"
                disabled={resetLoading}
                onClick={() => {
                  if (resetTarget) {
                    resetAdminPassword(resetTarget.id, resetTarget.name, resetPasswordInput || undefined)
                  }
                }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default SuperAdminPortal;
