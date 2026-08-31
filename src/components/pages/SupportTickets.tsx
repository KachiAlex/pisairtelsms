import React, { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Search, Send, Loader2, RefreshCcw } from 'lucide-react'
import { useToast } from '../ui/use-toast'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

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

function getAuthHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

interface TicketMessage {
  id: string
  authorId: string
  authorName: string
  authorRole: string
  message: string
  isInternal: boolean
  createdAt: string
}

interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  createdByName: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  messages?: TicketMessage[]
}

interface SupportAgent {
  id: string
  name: string
  queue: number
  load: number
  status: 'online' | 'offline'
}

interface AutomationRule {
  id: string
  name: string
  coverage: string
  state: 'active' | 'inactive'
}

export function SupportTickets() {
  const { toast } = useToast()
  const [stats, setStats] = useState({ openTickets: 0, withinSLA: '0', breachesToday: 0, avgHandleTime: '0m' })
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [commentText, setCommentText] = useState('')
  const [showNewTicketForm, setShowNewTicketForm] = useState(false)
  const [newTicketData, setNewTicketData] = useState({
    topic: '',
    description: '',
    category: 'general',
    priority: 'medium',
  })

  const loadTicketData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = getAuthHeaders()

      // Load all data in parallel
      const [statsRes, ticketsRes, agentsRes, rulesRes] = await Promise.all([
        fetch('/api/tenant/support-tickets?type=statistics', { headers }),
        fetch('/api/tenant/support-tickets?type=tickets', { headers }),
        fetch('/api/tenant/support-tickets?type=agents', { headers }),
        fetch('/api/tenant/support-tickets?type=rules', { headers }),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json()
        setTickets(ticketsData.data || [])
      }
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        setAgents(agentsData.data || [])
      }
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json()
        setRules(rulesData.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets')
      toast({ title: 'System Error', description: 'Could not fetch support tickets.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadTicketData()
  }, [loadTicketData])

  const handleRefresh = () => {
    loadTicketData()
    toast({ title: 'Synced', description: 'Ticket queue is now up to date.' })
  }

  const handleCreateTicket = async () => {
    try {
      if (!newTicketData.topic) {
        toast({ title: 'Validation Error', description: 'Please fill in the subject.', variant: 'destructive' })
        return
      }

      const headers = getAuthHeaders()
      const res = await fetch('/api/tenant/support-tickets', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'create-ticket', payload: newTicketData }),
      })

      if (!res.ok) throw new Error('Failed to create ticket')
      const json = await res.json()
      const ticket = json.data || json
      setTickets([ticket, ...tickets])
      setNewTicketData({ topic: '', description: '', category: 'general', priority: 'medium' })
      setShowNewTicketForm(false)
      toast({ title: 'Ticket Created', description: `Ticket ${ticket.ticketNumber} has been opened.` })
    } catch (err) {
      toast({ title: 'Error', description: 'Could not create support ticket.', variant: 'destructive' })
    }
  }

  const handleAddComment = async () => {
    try {
      if (!commentText.trim() || !selectedTicket) return

      const headers = getAuthHeaders()
      const res = await fetch('/api/tenant/support-tickets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'add-comment',
          ticketId: selectedTicket.id,
          payload: { text: commentText },
        }),
      })

      if (!res.ok) throw new Error('Failed to add comment')
      const json = await res.json()
      const msg = json.data || json
      setSelectedTicket({
        ...selectedTicket,
        messages: [...(selectedTicket.messages || []), msg],
      })
      setCommentText('')
      toast({ title: 'Comment Added', description: 'Your message has been sent.' })
    } catch (err) {
      toast({ title: 'Error', description: 'Could not post comment.', variant: 'destructive' })
    }
  }

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/tenant/support-tickets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update-ticket',
          ticketId,
          payload: { status: newStatus },
        }),
      })

      if (!res.ok) throw new Error('Failed to update ticket')
      const json = await res.json()
      const updated = json.data || json
      setTickets(tickets.map(t => t.id === ticketId ? updated : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(updated)
      }
      toast({ title: 'Status Updated', description: `Ticket is now marked as ${newStatus}.` })
    } catch (err) {
      toast({ title: 'Error', description: 'Could not update ticket status.', variant: 'destructive' })
    }
  }

  const handleSelectTicket = async (ticketId: string) => {
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`/api/tenant/support-tickets?type=ticket&id=${ticketId}`, { headers })
      if (res.ok) {
        const json = await res.json()
        setSelectedTicket(json.data || json)
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.createdByName || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || ticket.status === statusFilter
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Loading support ecosystem...</p>
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
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync queue
          </Button>
          <Button onClick={() => setShowNewTicketForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> New ticket
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Input
                placeholder="Briefly describe the issue"
                value={newTicketData.topic}
                onChange={(e) => setNewTicketData({ ...newTicketData, topic: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                placeholder="Provide details about your issue or request..."
                value={newTicketData.description}
                onChange={(e) => setNewTicketData({ ...newTicketData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTicketData.category}
                  onChange={(e) => setNewTicketData({ ...newTicketData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="feature_request">Feature Request</option>
                </select>
              </div>
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
                  <option value="urgent">Urgent</option>
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
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket: SupportTicket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSelectTicket(ticket.id)}
                    >
                      <TableCell className="font-medium text-blue-600">{ticket.ticketNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell className="text-sm text-gray-600 capitalize">{ticket.category.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={priorityVariant[ticket.priority] || 'secondary'}>{ticket.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[ticket.status] || 'secondary'}>{ticket.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
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
                <CardTitle>{selectedTicket.ticketNumber}</CardTitle>
                <CardDescription>{selectedTicket.subject}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTicket.description && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{selectedTicket.description}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Created by</p>
                <p className="font-medium">{selectedTicket.createdByName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium capitalize">{selectedTicket.category.replace('_', ' ')}</p>
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
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Conversation</h3>
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg: TicketMessage) => {
                    const isSuperAdmin = msg.authorRole === 'super_admin'
                    return (
                      <div key={msg.id} className={`flex ${isSuperAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl p-3 ${isSuperAdmin ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${isSuperAdmin ? 'text-white/80' : 'text-gray-600'}`}>
                              {isSuperAdmin ? 'Support Team' : msg.authorName}
                            </span>
                            <span className={`text-xs ${isSuperAdmin ? 'text-white/60' : 'text-gray-400'}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className={`text-sm ${isSuperAdmin ? 'text-white' : 'text-gray-700'}`}>{msg.message}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray-500">No messages yet. The support team will respond shortly.</p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a reply..."
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
            {agents.map((agent: SupportAgent) => (
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
            {rules.map((rule: AutomationRule) => (
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
