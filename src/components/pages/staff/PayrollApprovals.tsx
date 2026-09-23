import React, { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronRight, DollarSign } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Textarea } from '../../ui/textarea'
import { payrollApi, type PayrollRun, type PayrollRunItem, type PayrollApproval } from '../../../lib/payrollApi'

const ROLE_LABELS: Record<string, string> = {
  hr_admin: 'HR Admin',
  principal: 'Principal',
  bursar: 'Bursar',
}

// Staff-portal surface for designated payroll approvers (principal, bursar,
// HR). The API only serves this to staff whose role maps to an approver level;
// everyone else gets a 403 and sees the notice below.
export function PayrollApprovals() {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [details, setDetails] = useState<{ items: PayrollRunItem[]; approvals: PayrollApproval[] } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{ runId: string; role: string } | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  const fetchRuns = async () => {
    setLoading(true)
    try {
      const data = await payrollApi.getRuns('pending_approval')
      setRuns(data)
      setForbidden(false)
    } catch (e) {
      if (e instanceof Error && /approver|admin/i.test(e.message)) setForbidden(true)
      else setError(e instanceof Error ? e.message : 'Failed to load payroll runs')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchRuns() }, [])

  const refreshDetails = async (runId: string) => {
    const data = await payrollApi.getRun(runId)
    setDetails({ items: data.items, approvals: data.approvals })
  }

  const handleExpand = async (runId: string) => {
    if (expandedRun === runId) { setExpandedRun(null); setDetails(null); return }
    setExpandedRun(runId)
    setDetails(null)
    try { await refreshDetails(runId) }
    catch { setError('Failed to load run details') }
  }

  const handleApprove = async (runId: string, role: string) => {
    setActionLoading(true)
    setError(null)
    try {
      await payrollApi.approveRun(runId, role)
      setNotice(`Approved at ${ROLE_LABELS[role] || role} level`)
      fetchRuns()
      refreshDetails(runId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve')
    } finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectComment.trim()) return
    setActionLoading(true)
    setError(null)
    try {
      await payrollApi.rejectRun(rejectTarget.runId, rejectTarget.role, rejectComment.trim())
      setRejectTarget(null)
      setRejectComment('')
      setNotice('Run rejected — returned to draft')
      fetchRuns()
      if (expandedRun === rejectTarget.runId) refreshDetails(rejectTarget.runId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject')
    } finally { setActionLoading(false) }
  }

  const fmt = (n: number) => `₦${Number(n).toLocaleString()}`

  if (loading) {
    return <Card><CardContent className="p-8 text-center animate-pulse text-gray-500">Checking approver access…</CardContent></Card>
  }

  if (forbidden) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">Payroll approvals</p>
          <p className="text-sm mt-1">This page is for designated approvers (Principal, Bursar, HR). Your role doesn't include payroll approval.</p>
        </CardContent>
      </Card>
    )
  }

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
          <h3 className="text-lg font-semibold">Payroll Approvals</h3>
          <p className="text-sm text-gray-500">Runs awaiting sign-off at your approval level</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRuns}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            No payroll runs pending approval.
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
                      <p className="text-xs text-gray-500">{run.totalStaff} staff · Gross: {fmt(run.totalGross)} · Net: {fmt(run.totalNet)}</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">pending approval</Badge>
                </div>

                {expandedRun === run.id && (
                  <div className="mt-4 border-t pt-4">
                    {!details ? (
                      <p className="text-sm text-gray-400 py-4 text-center animate-pulse">Loading details…</p>
                    ) : (
                      <>
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-600 mb-2">APPROVAL CHAIN</p>
                          <div className="flex gap-3 flex-wrap">
                            {details.approvals.map(a => (
                              <div key={a.id} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1.5">
                                <Badge className={a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}>
                                  {ROLE_LABELS[a.approverRole] || a.approverRole}
                                </Badge>
                                <span className="text-gray-500">{a.status}</span>
                                {a.approverName && <span className="text-gray-400">by {a.approverName}</span>}
                                {a.status === 'pending' && (
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
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Staff</TableHead>
                                <TableHead className="text-right">Basic</TableHead>
                                <TableHead className="text-right">Gross</TableHead>
                                <TableHead className="text-right">Deductions</TableHead>
                                <TableHead className="text-right">Net Pay</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {details.items.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.staffName}</TableCell>
                                  <TableCell className="text-right">{fmt(item.basicSalary)}</TableCell>
                                  <TableCell className="text-right">{fmt(item.grossPay)}</TableCell>
                                  <TableCell className="text-right text-red-600">{fmt(item.totalDeductions)}</TableCell>
                                  <TableCell className="text-right font-semibold">{fmt(item.netPay)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => { setRejectTarget(null); setRejectComment('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject at {rejectTarget ? ROLE_LABELS[rejectTarget.role] || rejectTarget.role : ''} level</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              placeholder="Reason for rejection (required)"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleReject} disabled={!rejectComment.trim() || actionLoading}>
                Reject Run
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
