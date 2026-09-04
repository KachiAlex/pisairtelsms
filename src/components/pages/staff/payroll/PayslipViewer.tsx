import React, { useState, useEffect } from 'react'
import { FileText, Mail, RefreshCw, AlertCircle, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { payrollApi, type Payslip } from '../../../../lib/payrollApi'

export function PayslipViewer() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)

  const fetchPayslips = async () => {
    setLoading(true)
    try {
      const data = await payrollApi.getPayslips()
      setPayslips(data)
    } catch { setError('Failed to load payslips') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPayslips() }, [])

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`

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
          <h3 className="text-lg font-semibold">Payslips</h3>
          <p className="text-sm text-gray-500">View and distribute generated payslips</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayslips}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading payslips...</CardContent></Card>
      ) : payslips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            No payslips generated yet. Payslips are auto-generated when payroll runs are disbursed.
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
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Notified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.staffName}</TableCell>
                      <TableCell>{p.month} {p.year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.grossPay)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(p.totalDeductions)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.netPay)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.emailed && <Mail className="w-4 h-4 text-blue-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPayslip(p)}>
                          <FileText className="w-4 h-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip — {selectedPayslip?.month} {selectedPayslip?.year}</DialogTitle>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4 mt-4">
              <div className="border-b pb-3">
                <p className="font-semibold text-lg">{selectedPayslip.staffName}</p>
                <p className="text-sm text-gray-500">Period: {selectedPayslip.month} {selectedPayslip.year}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">EARNINGS</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Basic Salary</span>
                      <span>{formatCurrency(selectedPayslip.basicSalary)}</span>
                    </div>
                    {selectedPayslip.earnings.map((e, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{e.label}</span>
                        <span>{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold border-t pt-1">
                      <span>Gross Pay</span>
                      <span>{formatCurrency(selectedPayslip.grossPay)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">DEDUCTIONS</p>
                  <div className="space-y-1">
                    {selectedPayslip.deductions.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{d.label}</span>
                        <span>-{formatCurrency(d.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold border-t pt-1">
                      <span>Total Deductions</span>
                      <span>-{formatCurrency(selectedPayslip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>NET PAY</span>
                  <span className="text-green-600">{formatCurrency(selectedPayslip.netPay)}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                <div>PAYE Tax: {formatCurrency(selectedPayslip.payeTax)}</div>
                <div>Pension (Employee): {formatCurrency(selectedPayslip.pensionEmployee)}</div>
                <div>Pension (Employer): {formatCurrency(selectedPayslip.pensionEmployer)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayslipViewer
