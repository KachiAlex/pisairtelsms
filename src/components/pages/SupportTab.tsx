import React, { useState, useEffect, useCallback } from 'react'
import {
  Headphones,
  Search,
  Send,
  Loader2,
  X,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  ArrowLeft,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { useToast } from '../ui/use-toast'

interface SupportTicket {
  id: string
  tenantId: string
  tenantName?: string
  ticketNumber: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  createdBy: string
  createdByName: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  messages?: TicketMessage[]
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

function priorityBadge(priority: string) {
  switch (priority) {
    case 'urgent': return <Badge className="bg-red-100 text-red-700 border-red-200">Urgent</Badge>
    case 'high': return <Badge className="bg-orange-100 text-orange-700 border-orange-200">High</Badge>
    case 'medium': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Medium</Badge>
    case 'low': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Low</Badge>
    default: return <Badge variant="outline">{priority}</Badge>
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'open': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Open</Badge>
    case 'in_progress': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">In Progress</Badge>
    case 'resolved': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Resolved</Badge>
    case 'closed': return <Badge className="bg-gray-100 text-gray-500 border-gray-200">Closed</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

function categoryBadge(category: string) {
  const colors: Record<string, string> = {
    technical: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    billing: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    feature_request: 'bg-purple-100 text-purple-700 border-purple-200',
    general: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return <Badge className={colors[category] || colors.general}>{category.replace('_', ' ')}</Badge>
}

export function SupportTab() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [internalNoteText, setInternalNoteText] = useState('')
  const [sending, setSending] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const getAuthHeaders = useCallback(() => {
    const authRaw = localStorage.getItem('auth')
    const token = authRaw ? JSON.parse(authRaw).token : null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }, [])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/admin/support-tickets?${params}`, { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setTickets(data.data)
    } catch (e) {
      console.error('fetch tickets failed:', e)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, getAuthHeaders])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  async function openTicket(id: string) {
    setDetailLoading(true)
    setSelectedTicket(null)
    try {
      const res = await fetch(`/api/admin/support-tickets?id=${id}`, { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setSelectedTicket(data.data)
    } catch (e) {
      console.error('open ticket failed:', e)
    } finally {
      setDetailLoading(false)
    }
  }

  async function sendReply(isInternal: boolean = false) {
    if (!selectedTicket) return
    const text = isInternal ? internalNoteText : replyText
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/support-tickets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: isInternal ? 'add-internal-note' : 'respond',
          ticketId: selectedTicket.id,
          message: text.trim(),
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...(prev.messages || []), data.data],
        status: isInternal ? prev.status : 'in_progress',
      } : prev)
      if (isInternal) setInternalNoteText('')
      else setReplyText('')
      toast({ title: isInternal ? 'Internal note added' : 'Reply sent' })
      fetchTickets()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  async function updateStatus(status: string) {
    if (!selectedTicket) return
    try {
      const res = await fetch('/api/admin/support-tickets', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: selectedTicket.id, status }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      setSelectedTicket(prev => prev ? { ...prev, status } : prev)
      toast({ title: `Ticket ${status}` })
      fetchTickets()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return t.subject.toLowerCase().includes(q) ||
      t.ticketNumber.toLowerCase().includes(q) ||
      (t.tenantName || '').toLowerCase().includes(q) ||
      (t.createdByName || '').toLowerCase().includes(q)
  })

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  // Detail view
  if (selectedTicket || detailLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" className="gap-2 border-[#d5cfc0] text-[#5b5c63] rounded-lg" onClick={() => { setSelectedTicket(null); fetchTickets() }}>
            <ArrowLeft className="h-4 w-4" /> Back to tickets
          </Button>
          {selectedTicket && (
            <div className="flex items-center gap-2">
              {statusBadge(selectedTicket.status)}
              {priorityBadge(selectedTicket.priority)}
              {categoryBadge(selectedTicket.category)}
            </div>
          )}
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#9b9a94]" />
          </div>
        ) : selectedTicket && (
          <>
            {/* Ticket header */}
            <div className="rounded-xl border border-[#e6e2d8] bg-[#f9f8f4] p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#15161a]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 560 }}>
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-sm text-[#9b9a94] mt-1">
                    {selectedTicket.ticketNumber} · {selectedTicket.tenantName || 'Unknown tenant'} · Created by {selectedTicket.createdByName}
                  </p>
                </div>
              </div>
              {selectedTicket.description && (
                <p className="text-sm text-[#5b5c63] mt-2">{selectedTicket.description}</p>
              )}
              <div className="flex gap-2 mt-4">
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs" onClick={() => updateStatus('resolved')}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                  </Button>
                )}
                {selectedTicket.status !== 'closed' && (
                  <Button size="sm" variant="outline" className="border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg text-xs" onClick={() => updateStatus('closed')}>
                    Close Ticket
                  </Button>
                )}
                {selectedTicket.status === 'closed' && (
                  <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs" onClick={() => updateStatus('open')}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>

            {/* Conversation thread */}
            <div className="rounded-xl border border-[#e6e2d8] bg-white p-5 space-y-4">
              <h4 className="text-sm font-medium text-[#15161a]">Conversation</h4>
              {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                <p className="text-sm text-[#9b9a94] text-center py-4">No messages yet. Be the first to respond.</p>
              ) : (
                <div className="space-y-3">
                  {selectedTicket.messages.map(msg => {
                    const isSuperAdmin = msg.authorRole === 'super_admin'
                    return (
                      <div key={msg.id} className={`flex ${isSuperAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-xl p-3 ${msg.isInternal ? 'bg-amber-50 border border-amber-200' : isSuperAdmin ? 'bg-[#15161a] text-white' : 'bg-[#f3f1ea]'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${isSuperAdmin && !msg.isInternal ? 'text-white/80' : 'text-[#5b5c63]'}`}>
                              {msg.authorName}
                            </span>
                            {msg.isInternal && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                <Lock className="h-2.5 w-2.5 mr-1" /> Internal
                              </Badge>
                            )}
                            <span className={`text-xs ${isSuperAdmin && !msg.isInternal ? 'text-white/60' : 'text-[#9b9a94]'}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className={`text-sm ${isSuperAdmin && !msg.isInternal ? 'text-white' : 'text-[#15161a]'}`}>{msg.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Reply box */}
              <div className="border-t border-[#e6e2d8] pt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#5b5c63] mb-1">Reply to tenant</label>
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response..."
                      rows={3}
                      className="flex-1 rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31e24]/20 focus:border-[#e31e24] resize-none"
                    />
                    <Button size="sm" className="self-end bg-[#e31e24] hover:bg-[#cf1a1f] text-white rounded-lg gap-2" disabled={sending || !replyText.trim()} onClick={() => sendReply(false)}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5b5c63] mb-1">Internal note <span className="text-[#9b9a94]">(not visible to tenant)</span></label>
                  <div className="flex gap-2">
                    <textarea
                      value={internalNoteText}
                      onChange={(e) => setInternalNoteText(e.target.value)}
                      placeholder="Add an internal note for your team..."
                      rows={2}
                      className="flex-1 rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                    />
                    <Button size="sm" variant="outline" className="self-end border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg gap-2" disabled={sending || !internalNoteText.trim()} onClick={() => sendReply(true)}>
                      <Lock className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#e6e2d8] bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#15161a]">{stats.open}</p>
            <p className="text-xs text-[#9b9a94]">Open</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#e6e2d8] bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#15161a]">{stats.inProgress}</p>
            <p className="text-xs text-[#9b9a94]">In Progress</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#e6e2d8] bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#15161a]">{stats.resolved}</p>
            <p className="text-xs text-[#9b9a94]">Resolved</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9b9a94]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject, ticket #, tenant..."
            className="pl-9 rounded-lg border-[#d5cfc0] bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[#d5cfc0] bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <Button variant="outline" size="sm" className="gap-2 border-[#d5cfc0] text-[#5b5c63] rounded-lg" onClick={fetchTickets}>
          <AlertCircle className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Ticket table */}
      <div className="rounded-xl border border-[#e6e2d8] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f3f1ea] border-[#e6e2d8]">
              <TableHead className="text-[#5b5c63] font-medium">Ticket</TableHead>
              <TableHead className="text-[#5b5c63] font-medium">Tenant</TableHead>
              <TableHead className="text-[#5b5c63] font-medium">Category</TableHead>
              <TableHead className="text-[#5b5c63] font-medium">Priority</TableHead>
              <TableHead className="text-[#5b5c63] font-medium">Status</TableHead>
              <TableHead className="text-[#5b5c63] font-medium">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-[#9b9a94]" /></TableCell></TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-[#9b9a94] py-8">No support tickets found</TableCell></TableRow>
            ) : filteredTickets.map(ticket => (
              <TableRow
                key={ticket.id}
                className="border-[#e6e2d8] hover:bg-[#f3f1ea]/50 cursor-pointer"
                onClick={() => openTicket(ticket.id)}
              >
                <TableCell>
                  <div className="font-medium text-[#15161a]">{ticket.subject}</div>
                  <p className="text-xs text-[#9b9a94]">{ticket.ticketNumber} · {ticket.createdByName}</p>
                </TableCell>
                <TableCell><span className="text-sm text-[#5b5c63]">{ticket.tenantName || '—'}</span></TableCell>
                <TableCell>{categoryBadge(ticket.category)}</TableCell>
                <TableCell>{priorityBadge(ticket.priority)}</TableCell>
                <TableCell>{statusBadge(ticket.status)}</TableCell>
                <TableCell className="text-xs text-[#9b9a94]">{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
