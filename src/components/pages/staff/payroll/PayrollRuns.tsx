import React, { useState, useEffect } from 'react'
import { Play, Send, CheckCircle, XCircle, DollarSign, RefreshCw, AlertCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../ui/dialog'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { payrollApi, type PayrollRun, type PayrollRunItem, type PayrollApproval } from '../../../../lib/payrollApi'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function PayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [runDetails, setRunDetails] = useState<{ items: PayrollRunItem[]; approvals: PayrollApproval[] } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ month: MONTHS[new Date().getMonth()], year: new Date().getFullYear() })
  const [actionLoading, setActionLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectComment, setRejectComment] = useState('')

  const fetchRuns = async () => {
    setLoading(true)
    try {
      const data = await payrollApi.getRuns()
      setRuns(data)
    } catch { setError('Failed to load runs') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRuns() }, [])

  const handleCreate = async () => {
    setActionLoading(true)
    try {
      await payrollApi.createRun(createForm.month, createForm.year)
      setShowCreate(false)
      fetchRuns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run')
    } finally { setActionLoading(false) }
  }

  const handleExpand = async (runId: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null)
      setRunDetails(null)
      return
    }
    setExpandedRun(runId)
    try {
      const data = await payrollApi.getRun(runId)
      setRunDetails({ items: data.items, approvals: data.approvals })
    } catch { setError('Failed to load run details') }
  }

  const handleSubmit = async (id: string) => {
    setActionLoading(true)
    try { await payrollApi.submitRun(id); fetchRuns() }
    catch { setError('Failed to submit run') }
    finally { setActionLoading(false) }
  }

  const handleApprove = async (id: string) => {
    setActionLoading(true)
    try { await payrollApi.approveRun(id, 'tenant_admin'); fetchRuns(); handleExpand(id) }
    catch { setError('Failed to approve run') }
    finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    if (!expandedRun || !rejectComment) return
    setActionLoading(true)
    try {
      await payrollApi.rejectRun(expandedRun, 'tenant_admin', rejectComment)
      setShowReject(false)
      setRejectComment('')
      fetchRuns()
    } catch { setError('Failed to reject run') }
    finally { setActionLoading(false) }
  }

  const handleDisburse = async (id: string) => {
    if (!confirm('Disburse salary payments? This will trigger bank transfers to all staff.')) return
    setActionLoading(true)
    try {
      const result = await payrollApi.disburseRun(id)
      if (result.error) setError(`Disbursement completed with errors: ${result.error}`)
      fetchRuns()
      handleExpand(id)
    } catch { setError('Disbursement failed') }
    finally { setActionLoading(false) }
  }

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`
  const statusColor = (s: string) =>
    s === 'paid' ? 'bg-green-100 text-green-800' :
    s === 'approved' ? 'bg-blue-100 text-blue-800' :
    s === 'disbursing' ? 'bg-purple-100 text-purple-800' :
    s === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
    s === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

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
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColor(run.status)}>{run.status.replace(/_/g, ' ')}</Badge>
                    {run.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSubmit(run.id) }} disabled={actionLoading}>
                        <Send className="w-3 h-3 mr-1" /> Submit
                      </Button>
                    )}
                    {run.status === 'pending_approval' && (
                      <>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleApprove(run.id) }} disabled={actionLoading}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowReject(true); setExpandedRun(run.id) }} disabled={actionLoading}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {run.status === 'approved' && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDisburse(run.id) }} disabled={actionLoading}>
                        <DollarSign className="w-3 h-3 mr-1" /> Disburse
                      </Button>
                    )}
                  </div>
                </div>

                {expandedRun === run.id && runDetails && (
                  <div className="mt-4 border-t pt-4">
                    {/* Approval chain */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2">APPROVAL CHAIN</p>
                      <div className="flex gap-2 flex-wrap">
                        {runDetails.approvals.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <Badge className={a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}>
                              {a.approverRole}
                            </Badge>
                            <span className="text-gray-500">{a.status}</span>
                            {a.approverName && <span className="text-gray-400">by {a.approverName}</span>}
                          </div>
                        ))}
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
                              </TableCell>
                              <TableCell>
                                {item.payslipGenerated ? <FileText className="w-4 h-4 text-green-600" /> : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject Payroll Run</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Reason for rejection</Label>
              <Input value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Enter reason..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectComment || actionLoading}>Reject Run</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayrollRuns
