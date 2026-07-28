import React, { useState, useEffect } from 'react'
import { ClipboardCheck, ShieldCheck, Timer, AlertTriangle, Filter, CheckCircle2, CalendarClock, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface ApprovalStream {
  id: string
  surface: string
  owner: string
  sla_hours: number
  risk: string
  pending: number
}

interface ApprovalRequest {
  id: string
  type: string
  requester: string
  submitted_at: string
  sla_deadline: string | null
  status: string
}

interface SlaBreach {
  id: string
  label: string
  owner: string
  severity: string
}

interface ReviewerWorkload {
  id: string
  reviewer: string
  pending_count: number
  eta: string | null
}

interface ApprovalStats {
  itemsAwaitingAction: number
  withinSla: number
  escalationsOpen: number
  fastestStream: string
  avgTurnaround: string
}

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  'In review': 'default',
  'Pending finance': 'secondary',
  Escalated: 'destructive',
  Queued: 'secondary',
}

const riskBadge: Record<string, 'default' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'warning',
  high: 'destructive',
}

export function PendingApprovals() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [streams, setStreams] = useState<ApprovalStream[]>([])
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [breaches, setBreaches] = useState<SlaBreach[]>([])
  const [workloads, setWorkloads] = useState<ReviewerWorkload[]>([])

  const fetchTenantId = () => {
    return localStorage.getItem('tenantId') || 'default-tenant'
  }

  const fetchData = async () => {
    setLoading(true)
    const tenantId = fetchTenantId()
    
    try {
      // Fetch statistics
      const statsRes = await fetch(`/api/tenant/approvals/statistics?tenantId=${tenantId}`)
      const statsData = await statsRes.json()
      if (statsData.success) setStats(statsData.data)

      // Fetch streams
      const streamsRes = await fetch(`/api/tenant/approvals/streams?tenantId=${tenantId}`)
      const streamsData = await streamsRes.json()
      if (streamsData.success) setStreams(streamsData.data)

      // Fetch requests
      const requestsRes = await fetch(`/api/tenant/approvals?tenantId=${tenantId}&limit=10`)
      const requestsData = await requestsRes.json()
      if (requestsData.success) setRequests(requestsData.data)

      // Fetch breaches
      const breachesRes = await fetch(`/api/tenant/approvals/breaches?tenantId=${tenantId}`)
      const breachesData = await breachesRes.json()
      if (breachesData.success) setBreaches(breachesData.data)

      // Fetch workloads
      const workloadsRes = await fetch(`/api/tenant/approvals/workloads?tenantId=${tenantId}`)
      const workloadsData = await workloadsRes.json()
      if (workloadsData.success) setWorkloads(workloadsData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSavedFilters = () => {
    alert('Saved filters functionality')
  }

  const handleApproveBulk = () => {
    alert('Bulk approve functionality')
  }

  const handleSlaBoard = () => {
    alert('SLA board view')
  }

  const handleEscalationPlaybooks = () => {
    alert('Escalation playbooks')
  }

  const handleReassignApprovals = () => {
    alert('Reassign approvals')
  }

  const handleDownloadCertification = () => {
    alert('Download certification pack')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900">Pending approvals</h1>
          <p className="text-sm text-gray-600">Triage decision queues across academics, finance, and operations from a single command hub.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleSavedFilters}>
            <Filter className="h-4 w-4 mr-2" /> Saved filters
          </Button>
          <Button onClick={handleApproveBulk}>
            <ClipboardCheck className="h-4 w-4 mr-2" /> Approve bulk items
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Items awaiting action</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.itemsAwaitingAction || 0}</p>
            <p className="text-xs text-gray-500">Real-time data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Within SLA</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats?.withinSla || 0}%</p>
            <p className="text-xs text-gray-500">Real-time data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Escalations open</p>
            <p className="text-3xl font-semibold text-rose-600">{stats?.escalationsOpen || 0}</p>
            <p className="text-xs text-gray-500">Need resolution &lt; 1 hr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Fastest stream</p>
            <p className="text-3xl font-semibold text-gray-900">{stats?.fastestStream || 'N/A'}</p>
            <p className="text-xs text-gray-500">Avg {stats?.avgTurnaround || 'N/A'} turnaround</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval streams</CardTitle>
          <CardDescription>See where requests are concentrated and which teams are behind.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {streams.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full">No approval streams configured</p>
          ) : (
            streams.map((stream) => (
              <div key={stream.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{stream.surface}</p>
                  <Badge variant={stream.risk === 'low' ? 'default' : stream.risk === 'medium' ? 'warning' : 'destructive'}>Risk: {stream.risk}</Badge>
                </div>
                <p className="text-sm text-gray-500">Owner: {stream.owner}</p>
                <p className="text-xs text-gray-400">Pending {stream.pending} • SLA {stream.sla_hours}h</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>Prioritized list with SLA context.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSlaBoard}>
            <Timer className="h-4 w-4 mr-2" /> SLA board
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">No pending approvals</TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium text-gray-900">{request.id.slice(0, 8)}</TableCell>
                    <TableCell>{request.type}</TableCell>
                    <TableCell>{request.requester}</TableCell>
                    <TableCell>{new Date(request.submitted_at).toLocaleString()}</TableCell>
                    <TableCell>{request.sla_deadline ? new Date(request.sla_deadline).toLocaleString() : 'No SLA'}</TableCell>
                    <TableCell>
                      <Badge variant={request.status === 'approved' ? 'default' : request.status === 'escalated' ? 'destructive' : 'secondary'}>{request.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA breaches & escalations</CardTitle>
            <CardDescription>Anything red here pages leadership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {breaches.length === 0 ? (
              <p className="text-sm text-gray-500">No active SLA breaches</p>
            ) : (
              breaches.map((breach) => (
                <div key={breach.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">{breach.label}</p>
                    <Badge variant={breach.severity === 'destructive' ? 'destructive' : 'warning'}>Alert</Badge>
                  </div>
                  <p className="text-sm text-gray-500">Owner: {breach.owner}</p>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={handleEscalationPlaybooks}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Escalation playbooks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviewer workloads</CardTitle>
            <CardDescription>Balance approvals across leadership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workloads.length === 0 ? (
              <p className="text-sm text-gray-500">No workload data available</p>
            ) : (
              workloads.map((workload) => (
                <div key={workload.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                  <div>
                    <p className="font-medium text-gray-900">{workload.reviewer}</p>
                    <p className="text-sm text-gray-500">{workload.pending_count} items in queue</p>
                  </div>
                  <Badge variant="secondary">ETA {workload.eta || 'TBD'}</Badge>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={handleReassignApprovals}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Reassign approvals
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5" />
          <p>Monthly audit window begins in <span className="font-semibold">3 days</span>. Ensure all approvals are certified with comments.</p>
        </div>
        <Button size="sm" onClick={handleDownloadCertification}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Download certification pack
        </Button>
      </div>
    </div>
  )
}
export default PendingApprovals;
