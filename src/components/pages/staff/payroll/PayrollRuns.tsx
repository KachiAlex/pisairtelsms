import React, { useState, useEffect } from 'react'
import { Play, Send, CheckCircle, DollarSign, RefreshCw, AlertCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Card, CardContent } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { payrollApi, PayrollApiError, type PayrollRun, type PayrollRunItem, type PayrollApproval, type PayrollAuditEntry } from '../../../../lib/payrollApi'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ROLE_LABELS: Record<string, string> = {
  hr_admin: 'HR Admin',
  principal: 'Principal',
  bursar: 'Bursar',
}

export function PayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [runDetails, setRunDetails] = useState<{ items: PayrollRunItem[]; approvals: PayrollApproval[]; auditLog: PayrollAuditEntry[] } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ month: MONTHS[new Date().getMonth()], year: new Date().getFullYear(), supplementary: false })
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{ runId: string; role: string } | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [disburseTarget, setDisburseTarget] = useState<PayrollRun | null>(null)
  const [disburseMode, setDisburseMode] = useState<'auto' | 'manual'>('auto')
  const [manualRef, setManualRef] = useState('')

  const errMsg = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback

  const fetchRuns = async () => {
    setLoading(true)
    try {
      const data = await payrollApi.getRuns()
      setRuns(data)
    } catch (e) { setError(errMsg(e, 'Failed to load runs')) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRuns() }, [])

  const refreshDetails = async (runId: string) => {
    const data = await payrollApi.getRun(runId)
    setRunDetails({ items: data.items, approvals: data.approvals, auditLog: data.auditLog || [] })
  }

  const handleCreate = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await payrollApi.createRun(createForm.month, createForm.year, undefined, createForm.supplementary)
      setShowCreate(false)
      setNotice(`Payroll run for ${createForm.month} ${createForm.year} created`)
      fetchRuns()
    } catch (e) {
      setError(errMsg(e, 'Failed to create run'))
    } finally { setActionLoading(false) }
  }

  const handleExpand = async (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null)
      setRunDetails(null)
      return
    }
    setExpandedRun(runId)
    setRunDetails(null)
    try {
      await refreshDetails(runId)
    } catch (e) { setError(errMsg(e, 'Failed to load run details')) }
  }

  const handleSubmit = async (id: string) => {
    setActionLoading(true)
    setError(null)
    try { await payrollApi.submitRun(id); fetchRuns(); if (expandedRun === id) refreshDetails(id) }
    catch (e) { setError(errMsg(e, 'Failed to submit run')) }
    finally { setActionLoading(false) }
  }

  const handleApprove = async (id: string, role: string) => {
    setActionLoading(true)
    setError(null)
    try {
      await payrollApi.approveRun(id, role)
      setNotice(`Approved at ${ROLE_LABELS[role] || role} level`)
      fetchRuns()
      refreshDetails(id)
    } catch (e) { setError(errMsg(e, 'Failed to approve run')) }
    finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectComment) return
    setActionLoading(true)
    setError(null)
    try {
      await payrollApi.rejectRun(rejectTarget.runId, rejectTarget.role, rejectComment)
      setRejectTarget(null)
      setRejectComment('')
      fetchRuns()
      refreshDetails(rejectTarget.runId)
    } catch (e) { setError(errMsg(e, 'Failed to reject run')) }
    finally { setActionLoading(false) }
  }

  // First disburse attempt goes through the gateway path. If the server reports
  // no gateway is configured, the dialog switches to an explicit manual-payment
  // confirmation instead of silently marking items paid.
  const handleDisburse = async (run: PayrollRun, confirmed = false) => {
    setActionLoading(true)
    setError(null)
    try {
      const result = await payrollApi.disburseRun(run.id, confirmed ? { manualConfirmation: true, manualReference: manualRef || undefined } : undefined)
      if (result.error) setError(`Disbursement completed with issues: ${result.error}`)
      else setNotice('Payroll disbursed — payslips generated')
      setDisburseTarget(null)
      setDisburseMode('auto')
      setManualRef('')
      fetchRuns()
      refreshDetails(run.id)
    } catch (e) {
      if (e instanceof PayrollApiError && e.code === 'MANUAL_CONFIRMATION_REQUIRED') {
        setDisburseMode('manual')
      } else {
        setError(errMsg(e, 'Disbursement failed'))
        setDisburseTarget(null)
      }
    } finally { setActionLoading(false) }
  }

  const formatCurrency = (n: number) => `₦${Number(n).toLocaleString()}`
  const statusColor = (s: string) =>
    s === 'paid' ? 'bg-green-100 text-green-800' :
    s === 'approved' ? 'bg-blue-100 text-blue-800' :
    s === 'disbursing' ? 'bg-purple-100 text-purple-800' :
    s === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
    s === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const pendingApprovals = runDetails?.approvals.filter(a => a.status === 'pending') || []

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">Dismiss</Button>
          </CardContent>
        </Card>
      )}
      {notice && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-700 text-sm">{notice}</p>
            <Button variant="ghost" size="sm" onClick={() => setNotice(null)} className="ml-auto">Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Payroll Runs</h3>
          <p className="text-sm text-gray-500">Generate, approve, and disburse payroll with multi-level approval workflow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRuns}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Play className="w-4 h-4 mr-1" /> New Run</Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading runs...</CardContent></Card>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            No payroll runs yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map(run => (
            <Card key={run.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => handleExpand(run.id)}>
                  <div className="flex items-center gap-3">
                    {expandedRun === run.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                    <div>
                      <p className="font-semibold text-gray-900">{run.name}</p>
                      <p className="text-xs text-gray-500">{run.totalStaff} staff · Gross: {formatCurrency(run.totalGross)} · Net: {formatCurrency(run.totalNet)}</p>
                      {run.failureReason && <p className="text-xs text-red-600 mt-0.5">{run.failureReason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColor(run.status)}>{run.status.replace(/_/g, ' ')}</Badge>
                    {run.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSubmit(run.id) }} disabled={actionLoading}>
                        <Send className="w-3 h-3 mr-1" /> Submit
                      </Button>
                    )}
                    {(run.status === 'approved' || run.status === 'failed') && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setDisburseTarget(run); setDisburseMode('auto') }} disabled={actionLoading}>
                        <DollarSign className="w-3 h-3 mr-1" /> {run.status === 'failed' ? 'Retry Disbursement' : 'Disburse'}
                      </Button>
                    )}
                  </div>
                </div>

                {expandedRun === run.id && (
                  <div className="mt-4 border-t pt-4">
                    {!runDetails ? (
                      <p className="text-sm text-gray-400 py-4 text-center animate-pulse">Loading details...</p>
                    ) : (
                    <>
                    {/* Approval chain with per-level actions */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2">APPROVAL CHAIN</p>
                      <div className="flex gap-3 flex-wrap">
                        {runDetails.approvals.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1.5">
                            <Badge className={a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}>
                              {ROLE_LABELS[a.approverRole] || a.approverRole}
                            </Badge>
                            <span className="text-gray-500">{a.status}</span>
                            {a.approverName && <span className="text-gray-400">by {a.approverName}</span>}
                            {a.status === 'pending' && run.status === 'pending_approval' && (
                              <span className="flex gap-1 ml-1">
                                <Button size="sm" variant="outline" className="h-6 px-2 text-xs"
                                  onClick={(e) => { e.stopPropagation(); handleApprove(run.id, a.approverRole) }} disabled={actionLoading}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-6 px-2 text-xs text-red-600"
                                  onClick={(e) => { e.stopPropagation(); setRejectTarget({ runId: run.id, role: a.approverRole }) }} disabled={actionLoading}>
                                  Reject
                                </Button>
                              </span>
                            )}
                          </div>
                        ))}
                        {runDetails.approvals.length === 0 && <span className="text-xs text-gray-400">No approvals recorded</span>}
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Staff</TableHead>
                            <TableHead className="text-right">Basic</TableHead>
                            <TableHead className="text-right">Gross</TableHead>
                            <TableHead className="text-right">Deductions</TableHead>
                            <TableHead className="text-right">PAYE</TableHead>
                            <TableHead className="text-right">Pension (Emp)</TableHead>
                            <TableHead className="text-right">Net Pay</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Payslip</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {runDetails.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.staffName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.basicSalary)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.grossPay)}</TableCell>
                              <TableCell className="text-right text-red-600">{formatCurrency(item.totalDeductions)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.payeTax)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.pensionEmployee)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(item.netPay)}</TableCell>
                              <TableCell>
                                <Badge className={item.status === 'paid' ? 'bg-green-100 text-green-800' : item.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                  {item.status}
                                </Badge>
                                {item.failureReason && <p className="text-xs text-red-500 mt-1 max-w-[160px]">{item.failureReason}</p>}
                              </TableCell>
                              <TableCell className="text-xs text-gray-500 max-w-[120px] truncate">{item.paymentReference || '—'}</TableCell>
                              <TableCell>
                                {item.payslipGenerated ? <FileText className="w-4 h-4 text-green-600" /> : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Audit trail */}
                    {runDetails.auditLog.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-600 mb-2">AUDIT TRAIL</p>
                        <div className="space-y-1">
                          {runDetails.auditLog.map(entry => (
                            <div key={entry.id} className="text-xs text-gray-500 flex gap-2">
                              <span className="text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
                              <span className="font-medium text-gray-700">{entry.action.replace(/_/g, ' ')}</span>
                              <span>by {entry.actor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Run Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Payroll Run</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Month</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={createForm.month}
                onChange={e => setCreateForm(f => ({ ...f, month: e.target.value }))}>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label>Year</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={createForm.year}
                onChange={e => setCreateForm(f => ({ ...f, year: Number(e.target.value) }))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={createForm.supplementary}
                onChange={e => setCreateForm(f => ({ ...f, supplementary: e.target.checked }))} />
              Supplementary run (correction — allowed even if a regular run exists for this period)
            </label>
            <p className="text-sm text-gray-500">
              This will auto-generate payroll for all active staff with salaries, applying earnings/deduction rules, tax (PAYE), pension, NHF, and NHIS.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create Run'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject Payroll Run{rejectTarget ? ` — ${ROLE_LABELS[rejectTarget.role] || rejectTarget.role}` : ''}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Reason for rejection</Label>
              <Input value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Enter reason..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectComment || actionLoading}>Reject Run</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disburse Dialog */}
      <Dialog open={!!disburseTarget} onOpenChange={(open) => { if (!open) { setDisburseTarget(null); setDisburseMode('auto'); setManualRef('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Disburse Payroll — {disburseTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            {disburseMode === 'auto' ? (
              <p className="text-sm text-gray-600">
                This will initiate salary transfers to <strong>{disburseTarget?.totalStaff} staff</strong> totaling{' '}
                <strong>{formatCurrency(disburseTarget?.totalNet || 0)}</strong> via the configured payment gateway.
                Staff without bank details on file will fail.
              </p>
            ) : (
              <>
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  No payment gateway is configured. Only continue if salaries were already paid outside this app
                  (cash or direct bank transfer) — this records them as paid and issues payslips.
                </div>
                <div>
                  <Label>Payment reference (optional)</Label>
                  <Input value={manualRef} onChange={e => setManualRef(e.target.value)}
                    placeholder="e.g. bank bulk transfer ref, cash voucher no." />
                  <p className="text-xs text-gray-500 mt-1">Recorded on every payroll item for audit purposes.</p>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setDisburseTarget(null); setDisburseMode('auto'); setManualRef('') }}>Cancel</Button>
            {disburseMode === 'auto' ? (
              <Button onClick={() => disburseTarget && handleDisburse(disburseTarget)} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Confirm Disbursement'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => disburseTarget && handleDisburse(disburseTarget, true)} disabled={actionLoading}>
                {actionLoading ? 'Recording...' : 'Confirm Manual Payment'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayrollRuns
