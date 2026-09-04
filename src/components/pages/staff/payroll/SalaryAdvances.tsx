import React, { useState, useEffect } from 'react'
import { Plus, CheckCircle, XCircle, RefreshCw, AlertCircle, HandCoins } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Textarea } from '../../../ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { payrollApi, type SalaryAdvance } from '../../../../lib/payrollApi'

interface Staff {
  id: string
  name: string
}

export function SalaryAdvances() {
  const [advances, setAdvances] = useState<SalaryAdvance[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ staffId: '', staffName: '', amount: '', type: 'advance', reason: '', installments: '3' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [advData, staffRes] = await Promise.all([
        payrollApi.getAdvances(),
        fetch('/api/tenant/staff', { headers: getAuthHeaders() }).then(r => r.json()),
      ])
      setAdvances(advData)
      const staffList: Staff[] = staffRes.data || []
      setStaff(staffList)
      if (staffList.length > 0) setForm(f => f.staffId ? f : { ...f, staffId: staffList[0].id, staffName: staffList[0].name })
    } catch { setError('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async () => {
    if (!form.staffId || !form.amount) return
    try {
      await payrollApi.createAdvance({
        staffId: form.staffId,
        staffName: form.staffName,
        amount: Number(form.amount),
        type: form.type,
        reason: form.reason,
        installments: Number(form.installments),
      })
      setShowForm(false)
      setForm({ staffId: form.staffId, staffName: '', amount: '', type: 'advance', reason: '', installments: '3' })
      fetchData()
    } catch { setError('Failed to create advance') }
  }

  const handleApprove = async (id: string) => {
    try { await payrollApi.approveAdvance(id); fetchData() }
    catch { setError('Failed to approve advance') }
  }

  const handleReject = async (id: string) => {
    try { await payrollApi.rejectAdvance(id); fetchData() }
    catch { setError('Failed to reject advance') }
  }

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`
  const statusColor = (s: string) =>
    s === 'active' ? 'bg-green-100 text-green-800' :
    s === 'pending' ? 'bg-yellow-100 text-yellow-800' :
    s === 'rejected' ? 'bg-red-100 text-red-800' :
    s === 'cleared' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'

  const monthlyDeduction = form.amount && form.installments ? (Number(form.amount) / Number(form.installments)).toFixed(2) : '0'

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Salary Advances & Loans</h3>
          <p className="text-sm text-gray-500">Manage staff advances with automatic monthly repayment deductions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Request</Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading advances...</CardContent></Card>
      ) : advances.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <HandCoins className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            No salary advances or loans recorded.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Monthly Ded.</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.staffName}</TableCell>
                      <TableCell className="capitalize">{a.type}</TableCell>
                      <TableCell className="text-right">{formatCurrency(a.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(a.monthlyDeduction)}</TableCell>
                      <TableCell>{a.installmentsPaid}/{a.installments} paid</TableCell>
                      <TableCell><Badge className={statusColor(a.status)}>{a.status}</Badge></TableCell>
                      <TableCell>
                        {a.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleApprove(a.id)}><CheckCircle className="w-4 h-4 text-green-600" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleReject(a.id)}><XCircle className="w-4 h-4 text-red-600" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Salary Advance / Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Staff Member *</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.staffId}
                onChange={e => {
                  const s = staff.find(st => st.id === e.target.value)
                  setForm(f => ({ ...f, staffId: e.target.value, staffName: s?.name || '' }))
                }}>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="advance">Salary Advance</option>
                <option value="loan">Loan</option>
              </select>
            </div>
            <div>
              <Label>Amount (₦) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Number of Installments</Label>
              <Input type="number" min={1} value={form.installments} onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} />
            </div>
            {form.amount && form.installments && (
              <p className="text-sm text-blue-600 font-medium">Monthly deduction: ₦{Number(monthlyDeduction).toLocaleString()}</p>
            )}
            <div>
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for advance/loan..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.staffId || !form.amount}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getAuthHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return { 'Content-Type': 'application/json', ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) }
  } catch { return { 'Content-Type': 'application/json' } }
}

export default SalaryAdvances
