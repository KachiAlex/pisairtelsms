import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  Users,
  Calendar,
  Save,
  Loader2,
  Copy,
  KeyRound,
  UserPlus,
  Ban,
  RefreshCcw,
  Trash2,
  Hash,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { useToast } from '../ui/use-toast'

interface TenantDetail {
  id: string
  name: string
  subscription: string
  region: string
  usage: number
  status: string
  lastSync: string
  alerts: number
  subdomain?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  trialStartsAt?: string
  trialEndsAt?: string
  billingStatus?: string
  maxStudents?: number
  maxStaff?: number
  createdAt?: string
}

interface TenantAdmin {
  id: string
  staffId: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

interface AvailablePlan {
  planName: string
  rate: number
  isActive: boolean
}

interface TenantDetailDrawerProps {
  tenant: TenantDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTenantUpdated: (tenant: TenantDetail) => void
  onTenantArchived: (id: string) => void
}

function statusBadge(status: string) {
  switch (status) {
    case 'active': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
    case 'suspended': return <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>
    case 'provisioning': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Provisioning</Badge>
    case 'degraded': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Degraded</Badge>
    case 'archived': return <Badge className="bg-gray-100 text-gray-500 border-gray-200">Archived</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

export function TenantDetailDrawer({ tenant, open, onOpenChange, onTenantUpdated, onTenantArchived }: TenantDetailDrawerProps) {
  const { toast } = useToast()
  const [admins, setAdmins] = useState<TenantAdmin[]>([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [plans, setPlans] = useState<AvailablePlan[]>([])
  const [editPlan, setEditPlan] = useState<string>('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editMaxStudents, setEditMaxStudents] = useState<number | ''>('')
  const [editMaxStaff, setEditMaxStaff] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminRole, setAdminRole] = useState('tenant_admin')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null)
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [usageStats, setUsageStats] = useState<{ studentCount: number; staffCount: number } | null>(null)

  const getAuthHeaders = useCallback(() => {
    const authRaw = localStorage.getItem('auth')
    const token = authRaw ? JSON.parse(authRaw).token : null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }, [])

  // Load admins and plans when tenant changes
  useEffect(() => {
    if (!tenant || !open) return
    setEditPlan(tenant.subscription || 'starter')
    setEditContactEmail(tenant.contactEmail || '')
    setEditContactPhone(tenant.contactPhone || '')
    setEditAddress(tenant.address || '')
    setEditMaxStudents(tenant.maxStudents ?? '')
    setEditMaxStaff(tenant.maxStaff ?? '')

    // Fetch admins
    setAdminsLoading(true)
    fetch(`/api/admin/tenant-admins?tenantId=${tenant.id}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => { if (data.success) setAdmins(data.data) })
      .catch(e => console.error('admin load failed:', e))
      .finally(() => setAdminsLoading(false))

    // Fetch plans
    fetch('/api/admin/plans', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => { if (data.success) setPlans(data.data.filter((p: AvailablePlan) => p.isActive)) })
      .catch(e => console.error('plans load failed:', e))

    // Fetch usage stats
    fetch(`/api/admin/tenants?id=${tenant.id}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          // We could fetch student/staff counts here in the future
          setUsageStats({ studentCount: 0, staffCount: 0 })
        }
      })
      .catch(() => {})
  }, [tenant, open, getAuthHeaders])

  async function saveTenantChanges() {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: tenant.id,
          subscription: editPlan,
          contactEmail: editContactEmail,
          contactPhone: editContactPhone,
          address: editAddress,
          maxStudents: editMaxStudents === '' ? undefined : editMaxStudents,
          maxStaff: editMaxStaff === '' ? undefined : editMaxStaff,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save')
      onTenantUpdated(data.data)
      toast({ title: 'Tenant updated', description: `${tenant.name} has been updated.` })
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function updateTenantStatus(status: string) {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: tenant.id, status }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      onTenantUpdated(data.data)
      toast({ title: `Tenant ${status}`, description: `${tenant.name} is now ${status}.` })
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function archiveTenant() {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: tenant.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      onTenantArchived(tenant.id)
      onOpenChange(false)
      toast({ title: 'Tenant archived', description: `${tenant.name} has been archived.` })
    } catch (err: any) {
      toast({ title: 'Archive failed', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant) return
    setAdminLoading(true)
    setAdminError(null)
    setGeneratedPassword(null)
    try {
      const res = await fetch('/api/admin/tenant-admins', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          role: adminRole,
          tenantId: tenant.id,
          password: adminPassword || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      setAdmins(prev => [...prev, data.data])
      setGeneratedPassword(data.generatedPassword)
      setAdminName('')
      setAdminEmail('')
      setAdminPassword('')
      toast({ title: 'Admin created', description: `${data.data.name} has been added.` })
    } catch (err: any) {
      setAdminError(err.message)
    } finally {
      setAdminLoading(false)
    }
  }

  async function toggleAdminStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/admin/tenant-admins', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      setAdmins(prev => prev.map(a => a.id === id ? data.data : a))
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    }
  }

  async function resetAdminPassword(id: string, name: string, password?: string) {
    setResetLoading(true)
    setAdminError(null)
    try {
      const res = await fetch('/api/admin/tenant-admins', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, password: password || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed')
      toast({
        title: 'Password reset',
        description: `New password for ${name}: ${data.generatedPassword}`,
      })
    } catch (err: any) {
      setAdminError(err.message)
    } finally {
      setResetLoading(false)
      setResetTarget(null)
      setResetPasswordInput('')
    }
  }

  if (!tenant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#15161a] flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[#F7931E]" />
              </div>
              <div>
                <DialogTitle className="text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                  {tenant.name}
                </DialogTitle>
                <DialogDescription className="text-[#5b5c63]">
                  {tenant.subdomain ? `${tenant.subdomain}.pisairtelsms.com` : tenant.id}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(tenant.status)}
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white border border-[#e6e2d8] rounded-lg p-1 w-full">
            <TabsTrigger value="overview" className="flex-1 gap-1.5 rounded-md data-[state=active]:bg-[#15161a] data-[state=active]:text-white text-xs">
              <Building2 className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex-1 gap-1.5 rounded-md data-[state=active]:bg-[#15161a] data-[state=active]:text-white text-xs">
              <Shield className="h-3.5 w-3.5" /> Admins
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex-1 gap-1.5 rounded-md data-[state=active]:bg-[#15161a] data-[state=active]:text-white text-xs">
              <CreditCard className="h-3.5 w-3.5" /> Plan & Billing
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex-1 gap-1.5 rounded-md data-[state=active]:bg-[#15161a] data-[state=active]:text-white text-xs">
              <Users className="h-3.5 w-3.5" /> Usage
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#e6e2d8] bg-[#f9f8f4] p-4 space-y-3">
                <h4 className="text-sm font-medium text-[#15161a]">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[#5b5c63]">
                    <Mail className="h-3.5 w-3.5 text-[#9b9a94]" />
                    <input
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                      placeholder="No email"
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5b5c63]">
                    <Phone className="h-3.5 w-3.5 text-[#9b9a94]" />
                    <input
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                      placeholder="No phone"
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-start gap-2 text-sm text-[#5b5c63]">
                    <MapPin className="h-3.5 w-3.5 text-[#9b9a94] mt-0.5" />
                    <input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="No address"
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#e6e2d8] bg-[#f9f8f4] p-4 space-y-3">
                <h4 className="text-sm font-medium text-[#15161a]">Tenant Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[#5b5c63]">
                    <Hash className="h-3.5 w-3.5 text-[#9b9a94]" />
                    <span className="font-mono text-xs">{tenant.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#5b5c63]">
                    <Globe className="h-3.5 w-3.5 text-[#9b9a94]" />
                    <span>{tenant.region}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#5b5c63]">
                    <Calendar className="h-3.5 w-3.5 text-[#9b9a94]" />
                    <span>Created {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'}</span>
                  </div>
                  {tenant.trialEndsAt && (
                    <div className="flex items-center gap-2 text-[#5b5c63]">
                      <Calendar className="h-3.5 w-3.5 text-[#9b9a94]" />
                      <span>Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                className="bg-[#15161a] hover:bg-[#15161a]/90 text-white rounded-lg gap-2"
                disabled={saving}
                onClick={saveTenantChanges}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save changes
              </Button>
              {tenant.status === 'active' ? (
                <Button size="sm" variant="outline" className="border-[#e31e24]/20 text-[#e31e24] hover:bg-[#e31e24]/5 rounded-lg gap-2" disabled={saving} onClick={() => updateTenantStatus('suspended')}>
                  <Ban className="h-3.5 w-3.5" /> Suspend
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg gap-2" disabled={saving} onClick={() => updateTenantStatus('active')}>
                  <RefreshCcw className="h-3.5 w-3.5" /> Activate
                </Button>
              )}
              <Button size="sm" variant="outline" className="border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg gap-2" disabled={saving} onClick={archiveTenant}>
                <Trash2 className="h-3.5 w-3.5" /> Archive
              </Button>
            </div>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2 bg-[#15161a] hover:bg-[#15161a]/90 text-white rounded-lg"
                onClick={() => { setShowAdminForm(s => !s); setAdminError(null); setGeneratedPassword(null) }}
              >
                {showAdminForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {showAdminForm ? 'Cancel' : 'Create Admin'}
              </Button>
            </div>

            {showAdminForm && (
              <form onSubmit={handleCreateAdmin} className="rounded-xl border border-[#e6e2d8] bg-[#f3f1ea] p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#15161a] mb-1">Name</label>
                    <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Doe" className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20" required minLength={2} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#15161a] mb-1">Email</label>
                    <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="john@school.edu" className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#15161a] mb-1">Role</label>
                    <select value={adminRole} onChange={(e) => setAdminRole(e.target.value)} className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm">
                      <option value="tenant_admin">Tenant Admin</option>
                      <option value="Admin">Admin</option>
                      <option value="Principal">Principal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#15161a] mb-1">Password <span className="text-[#9b9a94] font-normal">(optional)</span></label>
                    <input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Auto-generate" className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm" minLength={6} />
                  </div>
                </div>
                {adminError && <p className="text-sm text-[#e31e24]">{adminError}</p>}
                {generatedPassword && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Admin created</p>
                      <p className="text-xs text-emerald-700">Password: <span className="font-mono font-semibold">{generatedPassword}</span></p>
                    </div>
                    <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 rounded-lg" onClick={() => navigator.clipboard.writeText(generatedPassword)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <Button type="submit" size="sm" className="bg-[#e31e24] hover:bg-[#cf1a1f] text-white rounded-lg gap-2" disabled={adminLoading}>
                  {adminLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {adminLoading ? 'Creating...' : 'Create admin'}
                </Button>
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
                  {adminsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto text-[#9b9a94]" /></TableCell></TableRow>
                  ) : admins.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-[#9b9a94] py-6">No admins found</TableCell></TableRow>
                  ) : admins.map(admin => (
                    <TableRow key={admin.id} className="border-[#e6e2d8] hover:bg-[#f3f1ea]/50">
                      <TableCell className="font-medium text-[#15161a]">{admin.name}</TableCell>
                      <TableCell className="text-sm text-[#5b5c63]">{admin.email}</TableCell>
                      <TableCell><Badge variant="outline" className="border-[#d5cfc0] text-[#5b5c63]">{admin.role}</Badge></TableCell>
                      <TableCell>{statusBadge(admin.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-[#9b9a94] hover:text-[#e31e24] rounded-lg" onClick={() => { setResetTarget({ id: admin.id, name: admin.name }); setResetPasswordInput('') }} title="Reset password">
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {admin.status === 'active' ? (
                            <Button size="sm" variant="outline" className="border-[#d5cfc0] text-[#e31e24] hover:bg-[#e31e24]/5 rounded-lg text-xs" onClick={() => toggleAdminStatus(admin.id, 'suspended')}>Suspend</Button>
                          ) : (
                            <Button size="sm" variant="outline" className="border-[#d5cfc0] text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs" onClick={() => toggleAdminStatus(admin.id, 'active')}>Activate</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Plan & Billing Tab */}
          <TabsContent value="plan" className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#e6e2d8] bg-[#f9f8f4] p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#15161a] mb-2">Subscription Plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {plans.length > 0 ? plans.map(p => (
                    <button
                      key={p.planName}
                      onClick={() => setEditPlan(p.planName)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${editPlan === p.planName ? 'border-[#e31e24] bg-white' : 'border-[#e6e2d8] bg-white/50 hover:border-[#d5cfc0]'}`}
                    >
                      <div className="text-sm font-medium capitalize text-[#15161a]">{p.planName}</div>
                      <div className="text-xs text-[#9b9a94]">₦{p.rate.toLocaleString()}/term</div>
                    </button>
                  )) : (
                    <p className="text-sm text-[#9b9a94]">Loading plans...</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#15161a] mb-1">Billing Status</label>
                  <Badge className={tenant.billingStatus === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                    {tenant.billingStatus || 'active'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#15161a] mb-1">Current Plan</label>
                  <Badge variant="outline" className="capitalize border-[#d5cfc0] text-[#5b5c63]">{tenant.subscription}</Badge>
                </div>
              </div>

              {tenant.trialStartsAt && tenant.trialEndsAt && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800">Trial Period</p>
                  <p className="text-xs text-blue-700">
                    {new Date(tenant.trialStartsAt).toLocaleDateString()} — {new Date(tenant.trialEndsAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <Button size="sm" className="bg-[#15161a] hover:bg-[#15161a]/90 text-white rounded-lg gap-2" disabled={saving} onClick={saveTenantChanges}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save plan
            </Button>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#e6e2d8] bg-[#f9f8f4] p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#15161a]">{usageStats?.studentCount ?? '—'}</p>
                    <p className="text-xs text-[#9b9a94]">Students {tenant.maxStudents ? `/ ${tenant.maxStudents} max` : ''}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#e6e2d8] bg-[#f9f8f4] p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#15161a]">{admins.length}</p>
                    <p className="text-xs text-[#9b9a94]">Staff {tenant.maxStaff ? `/ ${tenant.maxStaff} max` : ''}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e6e2d8] p-4">
              <h4 className="text-sm font-medium text-[#15161a] mb-3">Resource Limits</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#9b9a94] mb-1">Max Students</label>
                  <input
                    type="number"
                    value={editMaxStudents}
                    onChange={(e) => setEditMaxStudents(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9b9a94] mb-1">Max Staff</label>
                  <input
                    type="number"
                    value={editMaxStaff}
                    onChange={(e) => setEditMaxStaff(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <Button size="sm" className="bg-[#15161a] hover:bg-[#15161a]/90 text-white rounded-lg gap-2" disabled={saving} onClick={saveTenantChanges}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save limits
            </Button>
          </TabsContent>
        </Tabs>

        {/* Reset Password Dialog */}
        <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setResetPasswordInput('') } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#15161a]">
                <KeyRound className="h-4 w-4 text-[#e31e24]" />
                Reset Password
              </DialogTitle>
              <DialogDescription>{resetTarget ? `Set a new password for ${resetTarget.name}` : ''}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input
                type="text"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder="Leave blank to auto-generate (min 6 chars)"
                className="w-full rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm"
                minLength={6}
              />
              {adminError && <p className="text-sm text-[#e31e24]">{adminError}</p>}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" className="border-[#d5cfc0] text-[#5b5c63] rounded-lg" onClick={() => { setResetTarget(null); setResetPasswordInput(''); setAdminError(null) }} disabled={resetLoading}>Cancel</Button>
                <Button size="sm" className="bg-[#e31e24] hover:bg-[#cf1a1f] text-white rounded-lg gap-2" disabled={resetLoading} onClick={() => resetTarget && resetAdminPassword(resetTarget.id, resetTarget.name, resetPasswordInput || undefined)}>
                  <KeyRound className="h-3.5 w-3.5" />
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
