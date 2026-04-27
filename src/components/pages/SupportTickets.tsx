import React, { useState, useEffect } from 'react'
import { MessageSquare, Plus, Search, Send, TrendingUp, Users } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

// Import API functions
const supportTicketsApi = require('../../../api/tenant/support-tickets').default

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  open: 'warning',
  in_progress: 'secondary',
  resolved: 'default',
  closed: 'secondary',
}

const priorityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

export function SupportTickets() {
  const [stats, setStats] = useState({ openTickets: 0, withinSLA: '0', breachesToday: 0, avgHandleTime: '0m' })
  const [tickets, setTickets] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [commentText, setCommentText] = useState('')
  const [showNewTicketForm, setShowNewTicketForm] = useState(false)
  const [newTicketData, setNewTicketData] = useState({
    requester: '',
    topic: '',
    priority: 'medium',
    channel: 'email',
  })

  const tenantId = 'current-tenant' // In real app, get from context

  useEffect(() => {
    loadTicketData()
  }, [])

  const loadTicketData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load statistics
      const statsData = supportTicketsApi.getStatistics(tenantId)
      setStats(statsData)

      // Load tickets
      const ticketsData = supportTicketsApi.listTickets(tenantId, {
        status: statusFilter,
        priority: priorityFilter,
        limit: 100,
      })
      setTickets(ticketsData.data)

      // Load agents
      const agentsData = supportTicketsApi.listAgents(tenantId)
      setAgents(agentsData)

      // Load automation rules
      const rulesData = supportTicketsApi.listRules(tenantId)
      setRules(rulesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    try {
      if (!newTicketData.requester || !newTicketData.topic) {
        setError('Please fill in all required fields')
        return
      }

      const ticket = supportTicketsApi.createTicket(tenantId, newTicketData)
      setTickets([ticket, ...tickets])
      setNewTicketData({ requester: '', topic: '', priority: 'medium', channel: 'email' })
      setShowNewTicketForm(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    }
  }

  const handleAddComment = async () => {
    try {
      if (!commentText.trim() || !selectedTicket) return

      const comment = supportTicketsApi.addComment(tenantId, selectedTicket.id, 'current-user', commentText)
      setSelectedTicket({
        ...selectedTicket,
        comments: [comment, ...(selectedTicket.comments || [])],
      })
      setCommentText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    }
  }

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updated = supportTicketsApi.updateTicket(tenantId, ticketId, { status: newStatus })
      setTickets(tickets.map(t => t.id === ticketId ? updated : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(updated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket')
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.requester.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

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
          <p className="text-sm text-gray-600">Manage customer support requests and track resolution.</p>
        </div>
        <Button onClick={() => setShowNewTicketForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> New ticket
        </Button>
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
            <p className="text-xs text-gray-500">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Within SLA</p>
            <p className="text-3xl font-semibold text-emerald-600">{stats.withinSLA}%</p>
            <p className="text-xs text-gray-500">On track</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Breaches today</p>
            <p className="text-3xl font-semibold text-red-600">{stats.breachesToday}</p>
            <p className="text-xs text-gray-500">SLA violations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Avg handle time</p>
            <p className="text-3xl font-semibold text-gray-900">{stats.avgHandleTime}</p>
            <p className="text-xs text-gray-500">Per ticket</p>
          </CardContent>
        </Card>
      </div>

      {showNewTicketForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Create new ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requester</label>
              <Input
                placeholder="Customer name or email"
                value={newTicketData.requester}
                onChange={(e) => setNewTicketData({ ...newTicketData, requester: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <Input
                placeholder="Issue description"
                value={newTicketData.topic}
                onChange={(e) => setNewTicketData({ ...newTicketData, topic: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTicketData.priority}
                  onChange={(e) => setNewTicketData({ ...newTicketData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                <select
                  value={newTicketData.channel}
                  onChange={(e) => setNewTicketData({ ...newTicketData, channel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="chat">Chat</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTicket}>Create ticket</Button>
              <Button variant="outline" onClick={() => setShowNewTicketForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ticket queue</CardTitle>
          <CardDescription>All support tickets and their current status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ticket ID, topic, or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={priorityFilter || ''}
                onChange={(e) => setPriorityFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket: any) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedTicket(supportTicketsApi.getTicketById(tenantId, ticket.id))}
                    >
                      <TableCell className="font-medium text-blue-600">{ticket.ticketId}</TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.topic}</TableCell>
                      <TableCell>{ticket.requester}</TableCell>
                      <TableCell>
                        <Badge variant={priorityVariant[ticket.priority] || 'secondary'}>{ticket.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[ticket.status] || 'secondary'}>{ticket.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{ticket.sla}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No tickets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedTicket && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTicket.ticketId}</CardTitle>
                <CardDescription>{selectedTicket.topic}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Requester</p>
                <p className="font-medium">{selectedTicket.requester}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Channel</p>
                <p className="font-medium">{selectedTicket.channel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <p className="text-sm text-gray-600">Priority</p>
                <Badge variant={priorityVariant[selectedTicket.priority] || 'secondary'}>{selectedTicket.priority}</Badge>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Comments</h3>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map((comment: any) => (
                    <div key={comment.id} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">{comment.userId}</p>
                      <p className="text-sm text-gray-600 mt-1">{comment.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No comments yet</p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment} size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Support agents</CardTitle>
            <CardDescription>Current agent status and workload.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {agents.map((agent: any) => (
              <div key={agent.id} className="rounded-2xl border border-gray-100 p-4">
                <p className="font-medium text-gray-900">{agent.name}</p>
                <p className="text-sm text-gray-500 mt-1">Queue: {agent.queue}</p>
                <p className="text-sm text-gray-500">Load: {agent.load}%</p>
                <Badge className="mt-2" variant={agent.status === 'online' ? 'default' : 'secondary'}>
                  {agent.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Automation rules</CardTitle>
            <CardDescription>Active automation rules for ticket routing and resolution.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {rules.map((rule: any) => (
              <div key={rule.id} className="rounded-2xl border border-gray-100 p-4">
                <p className="font-medium text-gray-900">{rule.name}</p>
                <p className="text-sm text-gray-500 mt-1">Coverage: {rule.coverage}</p>
                <Badge className="mt-2" variant={rule.state === 'active' ? 'default' : 'secondary'}>
                  {rule.state}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SupportTickets
