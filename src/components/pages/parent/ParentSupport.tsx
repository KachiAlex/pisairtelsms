import React, { useCallback, useEffect, useState } from 'react'
import { LifeBuoy, Plus, AlertCircle, Send, ArrowLeft } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

interface Ticket {
  id: string; ticketNumber: string; subject: string; description: string
  category: string; priority: string; status: string; createdAt: string; updatedAt: string
  messages?: { id: string; authorName: string; authorRole: string; message: string; createdAt: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}

export function ParentSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', category: 'general' })
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)

  const auth = () => ({ Authorization: `Bearer ${getAuthFromStorage()?.token}` })
  const jsonAuth = () => ({ Authorization: `Bearer ${getAuthFromStorage()?.token}`, 'Content-Type': 'application/json' })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/parent/support', { headers: auth() })
      if (!res.ok) throw new Error('Failed to load tickets')
      const data = await res.json()
      setTickets(data.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openDetail = async (id: string) => {
    const res = await fetch(`/api/parent/support?id=${id}`, { headers: auth() })
    if (res.ok) setOpenTicket(await res.json())
  }

  const createTicket = async () => {
    if (!form.subject.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/parent/support', {
        method: 'POST', headers: jsonAuth(), body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create ticket')
      setForm({ subject: '', description: '', category: 'general' })
      setShowNew(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setPosting(false)
    }
  }

  const sendReply = async () => {
    if (!reply.trim() || !openTicket) return
    setPosting(true)
    try {
      const res = await fetch('/api/parent/support', {
        method: 'POST', headers: jsonAuth(),
        body: JSON.stringify({ ticketId: openTicket.id, message: reply }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to send')
      setReply('')
      openDetail(openTicket.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setPosting(false)
    }
  }

  if (openTicket) {
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenTicket(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </button>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">{openTicket.subject}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[openTicket.status] || ''}`}>
              {openTicket.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{openTicket.ticketNumber} · opened {new Date(openTicket.createdAt).toLocaleString()}</p>
          <p className="text-gray-700 mt-3 whitespace-pre-wrap">{openTicket.description}</p>
        </div>
        <div className="space-y-3">
          {(openTicket.messages || []).map(m => (
            <div key={m.id} className={`rounded-lg border p-4 ${m.authorRole === 'parent' ? 'bg-blue-50 border-blue-100 ml-8' : 'bg-white border-gray-200 mr-8'}`}>
              <p className="text-xs text-gray-500">{m.authorName} · {new Date(m.createdAt).toLocaleString()}</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
        {openTicket.status !== 'closed' && (
          <div className="flex gap-2">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && sendReply()}
            />
            <Button onClick={sendReply} disabled={posting || !reply.trim()}><Send className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
          <p className="text-sm text-gray-500 mt-1">Report an issue or ask the school for help.</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4 mr-1" /> New ticket
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showNew && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <input
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            placeholder="What do you need help with?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="general">General</option>
            <option value="academics">Academics</option>
            <option value="fees">Fees & Payments</option>
            <option value="technical">Technical issue</option>
            <option value="account">Account & Login</option>
          </select>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the issue in detail..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={createTicket} disabled={posting || !form.subject.trim()}>Submit ticket</Button>
            <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />)}</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <LifeBuoy className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-600 font-medium">No support tickets</p>
          <p className="text-sm text-gray-400">Create a ticket and the school will respond here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {tickets.map(t => (
            <button key={t.id} onClick={() => openDetail(t.id)} className="w-full text-left p-4 hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 flex-1 truncate">{t.subject}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || ''}`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.ticketNumber} · {new Date(t.updatedAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ParentSupport
