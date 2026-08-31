import React, { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, Clock, Users, Calendar, DollarSign,
  RefreshCw, Settings, BookOpen
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select'
import { getAuthFromStorage } from '../../lib/auth'
import { tenantApiGet, tenantApiPost, tenantApiPut } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'

interface LessonRequest {
  id: string
  teacher_id: string
  teacher_name: string | null
  student_ids: string[]
  subject_name: string | null
  purpose: string
  proposed_schedule: string
  duration_minutes: number
  num_sessions: number
  fee_amount: number | null
  fee_currency: string
  payment_mode: string
  admin_status: string
  parent_status: string
  status: string
  admin_notes: string | null
  created_at: string
}

interface RateCard {
  id: string
  rate_type: string
  amount: number
  currency: string
  payment_mode: string
  is_active: boolean
}

export function PrivateLessonApprovals() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<LessonRequest[]>([])
  const [rates, setRates] = useState<RateCard[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending_admin')
  const [showRateDialog, setShowRateDialog] = useState(false)
  const [approveDialog, setApproveDialog] = useState<LessonRequest | null>(null)
  const [feeAmount, setFeeAmount] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tenantApiGet('/api/tenant/private-lesson-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
      }
    } catch (err) {
      toast({ title: 'Failed to load requests', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchRates = useCallback(async () => {
    try {
      const res = await tenantApiGet('/api/tenant/private-lesson-rates')
      if (res.ok) {
        const data = await res.json()
        setRates(data.data || [])
      }
    } catch (err) {
      toast({ title: 'Failed to load rate cards', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => {
    fetchRequests()
    fetchRates()
  }, [fetchRequests, fetchRates])

  const handleApprove = async () => {
    if (!approveDialog) return
    try {
      const res = await tenantApiPut('/api/tenant/private-lesson-requests', {
        id: approveDialog.id,
        action: 'admin_approve',
        feeAmount: feeAmount ? Number(feeAmount) : undefined,
        notes: adminNotes,
      })
      if (res.ok) {
        setApproveDialog(null)
        setFeeAmount('')
        setAdminNotes('')
        fetchRequests()
        toast({ title: 'Request approved', description: 'Parent has been notified for approval.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to approve', description: err.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to approve', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleReject = async (id: string) => {
    const notes = prompt('Reason for rejection (optional):') || ''
    try {
      const res = await tenantApiPut('/api/tenant/private-lesson-requests', { id, action: 'admin_reject', notes })
      if (res.ok) {
        fetchRequests()
        toast({ title: 'Request rejected', description: 'Private lesson request rejected.' })
      } else {
        toast({ title: 'Failed to reject', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to reject', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending_admin') return r.status === 'pending_admin'
    if (activeTab === 'pending_parent') return r.status === 'pending_parent'
    if (activeTab === 'approved') return r.status === 'approved' || r.status === 'scheduled'
    if (activeTab === 'all') return true
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Digital Learning</p>
          <h1 className="text-2xl font-bold text-gray-900">Private Lesson Approvals</h1>
          <p className="text-sm text-gray-600">Review and approve private lesson requests from teachers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => { fetchRates(); setShowRateDialog(true) }}>
            <Settings className="h-4 w-4 mr-2" /> Rate Card
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Admin Review</p>
            <p className="text-2xl font-semibold text-amber-600">
              {requests.filter(r => r.status === 'pending_admin').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Parent</p>
            <p className="text-2xl font-semibold text-blue-600">
              {requests.filter(r => r.status === 'pending_parent').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Approved</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {requests.filter(r => r.status === 'approved' || r.status === 'scheduled').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Active Rate Cards</p>
            <p className="text-2xl font-semibold">{rates.filter(r => r.is_active).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending_admin">Pending Admin</TabsTrigger>
          <TabsTrigger value="pending_parent">Pending Parent</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No requests in this category.</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map(req => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{req.purpose}</h3>
                        <Badge variant="secondary">{req.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {req.teacher_name || req.teacher_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {req.student_ids?.length || 0} student(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(req.proposed_schedule).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {req.duration_minutes} min × {req.num_sessions}
                        </span>
                        {req.fee_amount !== null && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> {req.fee_amount} {req.fee_currency}
                          </span>
                        )}
                      </div>
                      {req.admin_notes && (
                        <p className="text-xs text-gray-400">Admin notes: {req.admin_notes}</p>
                      )}
                    </div>
                    {req.status === 'pending_admin' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleReject(req.id)}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => {
                          setApproveDialog(req)
                          setFeeAmount(req.fee_amount?.toString() || '')
                        }}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Private Lesson</DialogTitle>
            <DialogDescription>
              Confirm the fee and approve this request. The parent will be notified next.
            </DialogDescription>
          </DialogHeader>
          {approveDialog && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                <p><strong>Purpose:</strong> {approveDialog.purpose}</p>
                <p><strong>Schedule:</strong> {new Date(approveDialog.proposed_schedule).toLocaleString()}</p>
                <p><strong>Duration:</strong> {approveDialog.duration_minutes} min × {approveDialog.num_sessions} session(s)</p>
                <p><strong>Students:</strong> {approveDialog.student_ids?.length || 0}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee">Fee Amount ({approveDialog.fee_currency})</Label>
                <Input
                  id="fee"
                  type="number"
                  value={feeAmount}
                  onChange={e => setFeeAmount(e.target.value)}
                  placeholder="e.g. 5000"
                />
                <p className="text-xs text-gray-400">
                  Auto-calculated from rate card: {approveDialog.fee_amount || 'Not set'}. You can adjust if needed.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Any notes for the parent or teacher..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
            <Button onClick={handleApprove}>Approve & Notify Parent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Card Dialog */}
      <RateCardDialog open={showRateDialog} onClose={() => setShowRateDialog(false)} rates={rates} onRefresh={fetchRates} />
    </div>
  )
}

function RateCardDialog({ open, onClose, rates, onRefresh }: {
  open: boolean; onClose: () => void; rates: RateCard[]; onRefresh: () => void
}) {
  const { toast } = useToast()
  const [rateType, setRateType] = useState('per_session')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [paymentMode, setPaymentMode] = useState('direct_payment')

  const handleCreate = async () => {
    try {
      const res = await tenantApiPost('/api/tenant/private-lesson-rates', { rateType, amount: Number(amount), currency, paymentMode })
      if (res.ok) {
        setAmount('')
        onRefresh()
        toast({ title: 'Rate card added', description: 'New rate card created successfully.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to create rate', description: err.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to create rate', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await tenantApiPut('/api/tenant/private-lesson-rates', { id, isActive: !isActive })
      if (res.ok) {
        onRefresh()
      } else {
        toast({ title: 'Failed to toggle rate', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to toggle rate', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Private Lesson Rate Card</DialogTitle>
          <DialogDescription>Configure pricing for private lessons. Fees are auto-calculated from these rates.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Existing rates */}
          <div className="space-y-2">
            {rates.length === 0 ? (
              <p className="text-sm text-gray-400">No rate cards configured yet.</p>
            ) : (
              rates.map(rate => (
                <div key={rate.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">
                    <span className="font-medium">{rate.amount} {rate.currency}</span>
                    <span className="text-gray-500"> / {rate.rate_type.replace('_', ' ')}</span>
                    <span className="ml-2 text-xs text-gray-400">({rate.payment_mode.replace('_', ' ')})</span>
                  </div>
                  <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                    {rate.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(rate.id, rate.is_active)}>
                    {rate.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add new rate */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium">Add New Rate</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rate Type</Label>
                <Select value={rateType} onValueChange={setRateType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_session">Per Session</SelectItem>
                    <SelectItem value="per_hour">Per Hour</SelectItem>
                    <SelectItem value="per_subject">Per Subject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="NGN" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_payment">Direct Payment</SelectItem>
                    <SelectItem value="add_to_invoice">Add to Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={handleCreate} disabled={!amount}>
              <Settings className="h-4 w-4 mr-1" /> Add Rate
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PrivateLessonApprovals
