import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Textarea } from '../../ui/textarea'
import { getAuthFromStorage } from '../../../lib/auth'
import { useToast } from '../../ui/use-toast'
import {
  BookOpen, Calendar, Clock, DollarSign, CheckCircle, XCircle,
  RefreshCw, Loader2, Users
} from 'lucide-react'

interface PrivateLessonRequest {
  id: string
  teacher_name: string | null
  student_names: string[] | null
  student_ids: string[]
  subject_name: string | null
  purpose: string
  proposed_schedule: string
  duration_minutes: number
  num_sessions: number
  fee_amount: number | null
  fee_currency: string
  payment_mode: string
  status: string
  admin_notes: string | null
  created_at: string
}

const statusLabel: Record<string, string> = {
  pending_admin: 'Awaiting school approval',
  pending_parent: 'Awaiting your approval',
  approved: 'Approved — payment pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected by school',
  declined: 'Declined by you',
}

interface LessonPayment {
  id: string
  request_id: string
  amount: number
  currency: string
  payment_status: string
  payment_method: string | null
}

export function ParentPrivateLessons() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<PrivateLessonRequest[]>([])
  const [payments, setPayments] = useState<Record<string, LessonPayment[]>>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [declineNotes, setDeclineNotes] = useState<Record<string, string>>({})

  const token = getAuthFromStorage()?.token

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/private-lesson-requests', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load requests')
      const reqs: PrivateLessonRequest[] = data.data || []
      setRequests(reqs)

      // Approved fee-bearing requests carry a payment record — fetch it so the
      // parent can see status and confirm payment.
      const payable = reqs.filter(r => r.status === 'approved' && (r.fee_amount ?? 0) > 0)
      const paymentEntries = await Promise.all(
        payable.map(async r => {
          const pr = await fetch(`/api/tenant/private-lesson-payments?requestId=${r.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null)
          if (!pr?.ok) return [r.id, []] as const
          const pd = await pr.json().catch(() => ({}))
          return [r.id, (pd.data || []) as LessonPayment[]] as const
        })
      )
      setPayments(Object.fromEntries(paymentEntries))
    } catch (err) {
      toast({
        title: 'Failed to load private lesson requests',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  const confirmPayment = async (payment: LessonPayment) => {
    setActing(payment.id)
    try {
      const res = await fetch('/api/tenant/private-lesson-payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: payment.id, paymentStatus: 'paid' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not confirm payment')
      toast({ title: 'Payment confirmed', description: 'The school will verify and schedule the lesson.' })
      load()
    } catch (err) {
      toast({
        title: 'Payment confirmation failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setActing(null)
    }
  }

  useEffect(() => { load() }, [load])

  const act = async (id: string, action: 'parent_approve' | 'parent_decline') => {
    setActing(id)
    try {
      const res = await fetch('/api/tenant/private-lesson-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action, notes: declineNotes[id] || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Action failed')
      toast({ title: action === 'parent_approve' ? 'Lesson approved' : 'Lesson declined' })
      load()
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setActing(null)
    }
  }

  const pending = requests.filter(r => r.status === 'pending_parent')
  const rest = requests.filter(r => r.status !== 'pending_parent')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Private Lessons</h1>
          <p className="text-sm text-gray-500">
            Review and approve private tutoring requests for your children.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No private lesson requests for your children.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              Needs your approval ({pending.length})
            </h2>
          )}
          {[...pending, ...rest].map(req => (
            <Card key={req.id} className={req.status === 'pending_parent' ? 'border-amber-300' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{req.purpose}</h3>
                      <Badge variant={req.status === 'pending_parent' ? 'secondary' : 'outline'}>
                        {statusLabel[req.status] || req.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {req.teacher_name && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {req.teacher_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {req.student_names?.length ? req.student_names.join(', ') : `${req.student_ids?.length || 0} student(s)`}
                      </span>
                      {req.subject_name && <span>{req.subject_name}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(req.proposed_schedule).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {req.duration_minutes} min × {req.num_sessions}
                      </span>
                      {req.fee_amount !== null && (
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                          <DollarSign className="h-3 w-3" /> {req.fee_amount} {req.fee_currency}
                        </span>
                      )}
                    </div>
                    {req.admin_notes && (
                      <p className="text-xs text-gray-400">School notes: {req.admin_notes}</p>
                    )}
                  </div>
                </div>

                {req.status === 'approved' && (req.fee_amount ?? 0) > 0 && (
                  <div className="border-t pt-3">
                    {(payments[req.id] || []).map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-600">
                          Payment: <span className="font-medium">{p.amount} {p.currency}</span>
                          <Badge variant="outline" className="ml-2 capitalize">{p.payment_status}</Badge>
                        </p>
                        {p.payment_status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmPayment(p)}
                            disabled={acting === p.id}
                          >
                            {acting === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />}
                            Confirm payment made
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {req.status === 'pending_parent' && (
                  <div className="border-t pt-3 space-y-3">
                    <Textarea
                      value={declineNotes[req.id] || ''}
                      onChange={e => setDeclineNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Optional note for the school (e.g. reason if declining)"
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => act(req.id, 'parent_approve')}
                        disabled={acting === req.id}
                      >
                        {acting === req.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(req.id, 'parent_decline')}
                        disabled={acting === req.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ParentPrivateLessons
