import React, { useState, useEffect } from 'react'
import { Ticket, UserCircle2, Clock3, CheckCircle2, RefreshCcw, MessageCircle, AlertTriangle, Inbox, Workflow, Plane } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import supportTicketsApi from '../../api/tenant/support-tickets'

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
  Online: 'default',
  Assist: 'warning',
  Offline: 'secondary',
  Active: 'default',
  Training: 'warning',
  Paused: 'secondary',
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

export function SupportTickets() {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ openTickets: 0, withinSLA: '0%', breachesToday: 0, avgHandleTime: '28m' })
  const [agents, setAgents] = useState([])
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const tenantId = 'current-tenant' // In real app, get from context

  useEffect(() => {
    loadTicketData()
  }, [statusFilter])

  const loadTicketData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load tickets
      const ticketsData = statusFilter
        ? supportTicketsApi.getTicketsByStatus(tenantId, statusFilter)
        : supportTicketsApi.listTickets(tenantId)
      setTickets(ticketsData.data)

      // Load statistics
      const statsData = supportTicketsApi.getStatistics(tenantId)
      setStats(statsData)

      // Load agents
      const agentsData = supportTicketsApi.listAgents(tenantId)
      setAgents(agentsData)

      // Load rules
      const rulesData = supportTicketsApi.listRules(tenantId)
      setRules(rulesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadTicketData()
  }

  const handleCreateTicket = () => {
    // In real app, open create ticket modal
    console.log('Create ticket')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Loading support tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">Support tickets</h1>
          <p className="text-sm text-gray-600">Monitor queues, SLA risk, and automation coverage across all channels.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync queue
          </Button>
          <Button onClick={handleCreateTicket}>
            <Ticket className="h-4 w-4 mr-2" /> Create ticket
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Open tickets</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.openTickets}</p>
            <p className="text-xs text-gray-500">Updated just now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Within SLA</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats.withinSLA}</p>
            <p className="text-xs text-gray-500">Updated just now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Breaches today</p>
            <p className={`text-3xl font-semibold ${stats.breachesToday > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
              {stats.breachesToday}
            </p>
            <p className="text-xs text-gray-500">Updated just now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg handle time</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.avgHandleTime}</p>
            <p className="text-xs text-gray-500">Updated just now</p>
          </CardContent>
        </Card>
      </div>

      {tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active queue</CardTitle>
            <CardDescription>Priority view with SLA countdown and channel context.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Channel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium text-gray-900">{ticket.ticketId}</TableCell>
                    <TableCell>{ticket.requester}</TableCell>
                    <TableCell className="text-sm text-gray-600">{ticket.topic}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[ticket.priority] || 'secondary'}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell>{ticket.sla}</TableCell>
                    <TableCell>{ticket.channel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {agents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Agent roster</CardTitle>
              <CardDescription>Load balancing per queue with status visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {agents.map((agent: any) => (
                <div key={agent.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCircle2 className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-500">Queue {agent.queue}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant[agent.status] || 'secondary'}>{agent.status}</Badge>
                    <p className="text-xs text-gray-500 mt-1">Load {agent.load}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" /> Reassign tickets
              </Button>
            </CardContent>
          </Card>
        )}

        {rules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Automation rules</CardTitle>
              <CardDescription>Coverage for auto-routing and proactive nudges.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.map((rule: any) => (
                <div key={rule.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{rule.name}</p>
                    <p className="text-sm text-gray-500">Coverage {rule.coverage}</p>
                  </div>
                  <Badge variant={statusVariant[rule.state] || 'secondary'}>{rule.state}</Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                <Workflow className="h-4 w-4 mr-2" /> Tune automations
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>SUP-2216 trending towards SLA breach. Notify finance stakeholder and pin to dashboard.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Clock3 className="h-4 w-4 mr-2" /> Extend SLA
          </Button>
          <Button size="sm">
            <Inbox className="h-4 w-4 mr-2" /> Assign to self
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-slate-500" />
          <p>Ready to close bulk tickets? Download the closure summary with transcript trails.</p>
        </div>
        <Button variant="outline" size="sm">
          <Plane className="h-4 w-4 mr-2" /> Send summary
        </Button>
      </div>
    </div>
  )
}
export default SupportTickets;
