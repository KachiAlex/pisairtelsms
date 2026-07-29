import React, { useState, useEffect } from 'react'
import { ShieldCheck, Lock, KeyRound, AlertTriangle, Activity, UserCheck, BadgeCheck, RefreshCcw, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface AccessControlData {
  privilegedIdentities: number
  pendingReviews: number
  mfaCoverage: number
  anomalyAlerts: number
  privilegedRoles: Array<{
    role: string
    members: number
    lastReview: string
    mfa: string
  }>
  approvalMatrix: Array<{
    action: string
    policy: string
    owners: string
    sla: string
  }>
  activityFeed: Array<{
    id: string
    actor: string
    event: string
    time: string
  }>
}

const automationRules = [
  { id: 'AUTO-41', label: 'Dormant staff access cleanup', status: 'Live', detail: 'Revoke accounts inactive > 45 days' },
  { id: 'AUTO-35', label: 'Critical role change alerts', status: 'Live', detail: 'Ping compliance + principal' },
  { id: 'AUTO-33', label: 'Privilege escalation sandbox', status: 'Paused', detail: 'Require ticket reference ID' },
]

export function AccessControl() {
  const [data, setData] = useState<AccessControlData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWithAuth = async (url: string) => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
        const response = await fetch(url, { headers })
    if (!response.ok) throw new Error('Failed to fetch data')
    return response.json()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await fetchWithAuth('/api/tenant/security/access-control')
      setData(result.data)
    } catch (error) {
      console.error('Error loading access control data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const privilegedRoles = data?.privilegedRoles || []
  const approvalMatrix = data?.approvalMatrix || []
  const activityFeed = data?.activityFeed || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Security & compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Access control</h1>
          <p className="text-sm text-gray-600">Oversee privileged roles, approval guardrails, and automated revocation policies.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync directory
          </Button>
          <Button>
            <ShieldCheck className="h-4 w-4 mr-2" /> Launch access review
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Privileged identities</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.privilegedIdentities || 0}</p>
            <p className="text-xs text-gray-500">Across {privilegedRoles.length} critical roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending reviews</p>
            <p className="text-3xl font-semibold text-rose-600">{data?.pendingReviews || 0}</p>
            <p className="text-xs text-gray-500">Must close soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">MFA coverage</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.mfaCoverage || 0}%</p>
            <p className="text-xs text-gray-500">+6% vs last term</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Anomaly alerts</p>
            <p className="text-3xl font-semibold text-amber-600">{data?.anomalyAlerts || 0}</p>
            <p className="text-xs text-gray-500">Auto-paused risky changes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Privileged roles</CardTitle>
          <CardDescription>Track ownership, review cadence, and MFA adoption.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Last review</TableHead>
                <TableHead>MFA coverage</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {privilegedRoles.map((role) => (
                <TableRow key={role.role}>
                  <TableCell className="font-medium text-gray-900">{role.role}</TableCell>
                  <TableCell>{role.members}</TableCell>
                  <TableCell>{role.lastReview}</TableCell>
                  <TableCell>
                    <Badge variant={role.mfa === '100%' ? 'default' : 'warning'}>{role.mfa}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <KeyRound className="h-4 w-4 mr-2" /> Review access
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Approval policies</CardTitle>
            <CardDescription>High-risk actions require layered sign-off.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvalMatrix.map((row) => (
              <div key={row.action} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{row.action}</p>
                  <Badge variant="secondary">{row.policy}</Badge>
                </div>
                <p className="text-sm text-gray-500">Owners: {row.owners}</p>
                <p className="text-xs text-gray-400">SLA: {row.sla}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation center</CardTitle>
            <CardDescription>Let bots handle repetitive governance tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {automationRules.map((rule) => (
              <div key={rule.id} className="flex items-start justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{rule.label}</p>
                  <p className="text-sm text-gray-500">{rule.detail}</p>
                </div>
                <Badge variant={rule.status === 'Live' ? 'default' : 'secondary'}>{rule.status}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Activity className="h-4 w-4 mr-2" /> Manage playbooks
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access activity</CardTitle>
          <CardDescription>Every sensitive change is logged with actor context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activityFeed.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
              <div>
                <p className="font-medium text-gray-900">{event.actor}</p>
                <p className="text-sm text-gray-500">{event.event}</p>
              </div>
              <p className="text-xs text-gray-400">{event.time}</p>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full">
            <AlertTriangle className="h-4 w-4 mr-2" /> View audit log
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5" />
          <p>Next quarterly privileged access review auto-starts soon. Ensure owners are assigned.</p>
        </div>
        <Button size="sm">
          <BadgeCheck className="h-4 w-4 mr-2" /> Assign reviewers
        </Button>
      </div>
    </div>
  )
}
export default AccessControl;
