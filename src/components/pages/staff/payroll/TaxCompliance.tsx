import React, { useState, useEffect } from 'react'
import { Save, RefreshCw, AlertCircle, FileBarChart, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table'
import { payrollApi, type TaxConfig, type ComplianceReport } from '../../../../lib/payrollApi'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function TaxCompliance() {
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null)
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [editConfig, setEditConfig] = useState<TaxConfig | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [config, rpt] = await Promise.all([
        payrollApi.getTaxConfig(),
        payrollApi.getComplianceReport(new Date().getFullYear()),
      ])
      setTaxConfig(config)
      setEditConfig(config)
      setReport(rpt)
    } catch { setError('Failed to load tax data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!editConfig) return
    setSaving(true)
    try {
      const updated = await payrollApi.updateTaxConfig(editConfig.id, editConfig)
      setTaxConfig(updated)
      setError(null)
    } catch { setError('Failed to save tax config') }
    finally { setSaving(false) }
  }

  const fetchReport = async (year: number) => {
    setReportYear(year)
    try {
      const rpt = await payrollApi.getComplianceReport(year)
      setReport(rpt)
    } catch { setError('Failed to load report') }
  }

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

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

      <div>
        <h3 className="text-lg font-semibold">Tax & Compliance</h3>
        <p className="text-sm text-gray-500">Configure Nigeria PAYE tax brackets, pension rates, and generate compliance reports</p>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading tax configuration...</CardContent></Card>
      ) : (
        <>
          {/* Tax Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax Configuration — {taxConfig?.taxYear || 'N/A'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editConfig && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Cratum Allowance (₦)</Label>
                      <Input type="number" value={editConfig.cratumAllowance}
                        onChange={e => setEditConfig(c => c ? { ...c, cratumAllowance: Number(e.target.value) } : c)} />
                    </div>
                    <div>
                      <Label>Cratum Percentage (%)</Label>
                      <Input type="number" step="0.01" value={editConfig.cratumPercentage}
                        onChange={e => setEditConfig(c => c ? { ...c, cratumPercentage: Number(e.target.value) } : c)} />
                    </div>
                    <div>
                      <Label>Pension Rate — Employee (%)</Label>
                      <Input type="number" step="0.01" value={editConfig.pensionRateEmployee}
                        onChange={e => setEditConfig(c => c ? { ...c, pensionRateEmployee: Number(e.target.value) } : c)} />
                    </div>
                    <div>
                      <Label>Pension Rate — Employer (%)</Label>
                      <Input type="number" step="0.01" value={editConfig.pensionRateEmployer}
                        onChange={e => setEditConfig(c => c ? { ...c, pensionRateEmployer: Number(e.target.value) } : c)} />
                    </div>
                    <div>
                      <Label>NHF Rate (%)</Label>
                      <Input type="number" step="0.01" value={editConfig.nhfRate}
                        onChange={e => setEditConfig(c => c ? { ...c, nhfRate: Number(e.target.value) } : c)} />
                    </div>
                    <div>
                      <Label>NHIS Rate (%)</Label>
                      <Input type="number" step="0.01" value={editConfig.nhisRate}
                        onChange={e => setEditConfig(c => c ? { ...c, nhisRate: Number(e.target.value) } : c)} />
                    </div>
                  </div>

                  {/* Tax Brackets */}
                  <div>
                    <Label className="mb-2 block">PAYE Tax Brackets</Label>
                    <div className="space-y-2">
                      {editConfig.brackets.map((b, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="text-xs text-gray-500 w-8">Band {i + 1}</span>
                          <Input type="number" className="w-32" placeholder="Min" value={b.min}
                            onChange={e => {
                              const brackets = [...editConfig.brackets]
                              brackets[i] = { ...b, min: Number(e.target.value) }
                              setEditConfig(c => c ? { ...c, brackets } : c)
                            }} />
                          <Input type="number" className="w-32" placeholder="Max" value={b.max ?? ''}
                            onChange={e => {
                              const brackets = [...editConfig.brackets]
                              brackets[i] = { ...b, max: e.target.value ? Number(e.target.value) : null }
                              setEditConfig(c => c ? { ...c, brackets } : c)
                            }} />
                          <Input type="number" step="0.01" className="w-24" placeholder="Rate %" value={b.rate}
                            onChange={e => {
                              const brackets = [...editConfig.brackets]
                              brackets[i] = { ...b, rate: Number(e.target.value) }
                              setEditConfig(c => c ? { ...c, brackets } : c)
                            }} />
                          <span className="text-xs text-gray-500">% tax</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Compliance Report */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Compliance Report — {reportYear}</CardTitle>
                <div className="flex gap-2 items-center">
                  <select className="px-3 py-1.5 border border-gray-300 rounded-md text-sm" value={reportYear}
                    onChange={e => fetchReport(Number(e.target.value))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => fetchReport(reportYear)}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Download className="w-3 h-3 mr-1" /> Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {report && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total Gross (YTD)</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(report.totalGross)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total PAYE Tax</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(report.totalPAYE)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total Pension (Employee)</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(report.totalPensionEmployee)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">Total Pension (Employer)</p>
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(report.totalPensionEmployer)}</p>
                    </div>
                  </div>

                  {report.monthlyBreakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Gross</TableHead>
                            <TableHead className="text-right">PAYE</TableHead>
                            <TableHead className="text-right">Pension</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.monthlyBreakdown.map((m, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{m.month}</TableCell>
                              <TableCell className="text-right">{formatCurrency(m.gross)}</TableCell>
                              <TableCell className="text-right text-red-600">{formatCurrency(m.paye)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(m.pension)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <FileBarChart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      No payroll data for {reportYear}. Run payroll to generate compliance data.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default TaxCompliance
