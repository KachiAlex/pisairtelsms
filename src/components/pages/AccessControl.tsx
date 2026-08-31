import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, KeyRound, AlertTriangle, Activity, UserCheck, BadgeCheck, RefreshCcw, Loader2, Settings, ShieldAlert, Fingerprint } from 'lucide-react'
import { getAuthFromStorage } from '../../lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'

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

const securityPolicies = [
  { id: 'pol-1', name: 'Global MFA Enforcement', description: 'Require multi-factor authentication for all staff and admin accounts.', icon: Fingerprint, enabled: true },
  { id: 'pol-2', name: 'Strict Password Complexity', description: 'Minimum 12 characters, including symbols and numbers (NIST 800-63).', icon: Lock, enabled: true },
  { id: 'pol-3', name: 'Session Idle Timeout', description: 'Automatically log out users after 30 minutes of inactivity.', icon: Activity, enabled: true },
  { id: 'pol-4', name: 'Account Lockout Threshold', description: 'Suspend accounts after 5 consecutive failed login attempts.', icon: ShieldAlert, enabled: false },
];

export function AccessControl() {
  const navigate = useNavigate()
  const [data, setData] = useState<AccessControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchWithAuth = async (url: string) => {
    const auth = getAuthFromStorage()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`
    const response = await fetch(url, { headers })
    if (!response.ok) throw new Error('Failed to fetch data')
    return response.json()
  }

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await fetchWithAuth('/api/tenant/security/access-control')
      setData(result.data)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load access control data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && !data && !loadError) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loadError && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-gray-700 font-medium">Failed to load access control data</p>
        <p className="text-sm text-gray-500">{loadError}</p>
        <Button variant="outline" onClick={loadData}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
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
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Access Control</h1>
          <p className="text-sm text-gray-600">Oversee privileged roles, approval guardrails, and global security policies.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync Directory
          </Button>
          <Button>
            <ShieldCheck className="h-4 w-4 mr-2" /> Start Access Review
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Privileged Roles</p>
            <p className="text-3xl font-semibold text-gray-900">{data?.privilegedIdentities || 0}</p>
            <p className="text-xs text-gray-500">Across {privilegedRoles.length} critical roles</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending Reviews</p>
            <p className="text-3xl font-semibold text-rose-600">{data?.pendingReviews || 0}</p>
            <p className="text-xs text-gray-500">Must close by end of week</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">MFA Adoption</p>
            <p className="text-3xl font-semibold text-green-600">{data?.mfaCoverage || 0}%</p>
            <p className="text-xs text-gray-500">+6% vs last audit</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Anomaly Alerts</p>
            <p className="text-3xl font-semibold text-amber-600">{data?.anomalyAlerts || 0}</p>
            <p className="text-xs text-gray-500">Flagged suspicious logins</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="roles" className="rounded-lg">Privileged Roles</TabsTrigger>
          <TabsTrigger value="policies" className="rounded-lg">Security Policies</TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-lg">Approval Matrix</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg">Audit Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privileged Identity Management (PIM)</CardTitle>
              <CardDescription>Track ownership, review cadence, and MFA adoption for critical roles.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Last Review</TableHead>
                    <TableHead>MFA Coverage</TableHead>
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
                          <KeyRound className="h-4 w-4 mr-2" /> Review Access
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {securityPolicies.map((policy) => {
              const Icon = policy.icon;
              return (
                <Card key={policy.id} className="hover:border-blue-200 transition-colors">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <Icon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">{policy.name}</CardTitle>
                      </div>
                      <CardDescription>{policy.description}</CardDescription>
                    </div>
                    <Switch checked={policy.enabled} />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                        {policy.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <Button variant="ghost" size="sm">Configure</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conditional Access Rules</CardTitle>
              <CardDescription>Define environment-based restrictions for platform access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Dormant Staff Cleanup', detail: 'Revoke accounts inactive > 45 days', status: 'Live' },
                { label: 'Impossible Travel Detection', detail: 'Flag logins from geographic distances too large for time elapsed', status: 'Live' },
                { label: 'Privilege Escalation Sandbox', detail: 'Require ticket reference ID for temporary elevation', status: 'Paused' }
              ].map((rule, idx) => (
                <div key={idx} className="flex items-start justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{rule.label}</p>
                    <p className="text-sm text-gray-500">{rule.detail}</p>
                  </div>
                  <Badge variant={rule.status === 'Live' ? 'default' : 'secondary'}>{rule.status}</Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                <Activity className="h-4 w-4 mr-2" /> Manage All Policy Playbooks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Matrix</CardTitle>
              <CardDescription>High-risk actions require layered sign-off across different departments.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Approval Policy</TableHead>
                    <TableHead>Required Owners</TableHead>
                    <TableHead>SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalMatrix.map((row) => (
                    <TableRow key={row.action}>
                      <TableCell className="font-medium">{row.action}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.policy}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.owners}</TableCell>
                      <TableCell className="text-sm text-gray-500">{row.sla}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privileged Access Activity</CardTitle>
              <CardDescription>Real-time stream of sensitive identity and permission changes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityFeed.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-xl border p-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{event.actor}</p>
                    <p className="text-sm text-gray-700">{event.event}</p>
                  </div>
                  <p className="text-xs text-gray-400">{event.time}</p>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-blue-600" onClick={() => navigate('/tenant/audit-logs')}>
                <Activity className="h-4 w-4 mr-2" /> Access full security audit trail →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-900">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Identity Governance Review</p>
            <p className="text-emerald-800/80">Next quarterly privileged access review auto-starts in 12 days. Ensure reviewers are assigned.</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6">
          Assign Reviewers
        </Button>
      </div>
    </div>
  )
}

export default AccessControl;
