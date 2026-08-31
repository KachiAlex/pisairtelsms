import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Download, Filter } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { financeApiGet } from '../../../lib/financeApi';

interface ReportData {
  title: string;
  type: string;
  generatedAt: string;
  data: any;
  summary?: Record<string, any>;
}

const REPORT_TYPES = [
  { value: 'collection-summary', label: 'Collection Summary' },
  { value: 'aging-analysis', label: 'Aging Analysis' },
  { value: 'defaulters', label: 'Defaulter List' },
  { value: 'revenue-forecast', label: 'Revenue Forecast' },
  { value: 'payment-methods', label: 'Payment Method Analysis' },
  { value: 'financial-statement', label: 'Financial Statement' },
];

export function ReportViewer() {
  const [reportType, setReportType] = useState('collection-summary');
  const [classFilter, setClassFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      // Fetch available classes and terms
      const response = await financeApiGet('/api/tenant/students');
      if (response.ok) {
        const data = await response.json();
        const uniqueClasses = [...new Set((data.data || []).map((s: any) => s.class))];
        setClasses(uniqueClasses as string[]);
      }
      // In a real app, fetch terms from academic calendar
      setTerms(['Term 1', 'Term 2', 'Term 3']);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (classFilter) params.append('class', classFilter);
      if (termFilter) params.append('term', termFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (paymentMethodFilter) params.append('paymentMethod', paymentMethodFilter);

      const response = await financeApiGet(`/api/tenant/finance/reports/${reportType}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      const data = await response.json();
      setReportData({
        title: REPORT_TYPES.find((r) => r.value === reportType)?.label || reportType,
        type: reportType,
        generatedAt: new Date().toISOString(),
        data: data.data || data,
        summary: data.summary,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    // In a real app, use a library like jsPDF to generate PDF
    const content = JSON.stringify(reportData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.type}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    // Convert data to CSV
    let csv = '';
    if (Array.isArray(reportData.data)) {
      const headers = Object.keys(reportData.data[0] || {});
      csv = headers.join(',') + '\n';
      reportData.data.forEach((row: any) => {
        csv += headers.map((h) => row[h]).join(',') + '\n';
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (reportData.type) {
      case 'collection-summary':
        return (
          <div className="space-y-4">
            {reportData.summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Target</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(reportData.summary.target || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Actual</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(reportData.summary.actual || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Rate</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {((reportData.summary.rate || 0) * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      {formatCurrency(reportData.summary.outstanding || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            {Array.isArray(reportData.data) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Collection by Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Target</TableHead>
                          <TableHead className="text-right">Collected</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.data.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.class}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.target)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.collected)}</TableCell>
                            <TableCell className="text-right">{(row.rate * 100).toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'aging-analysis':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aging Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {reportData.summary && (
                  <>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Current</p>
                      <p className="text-xl font-bold text-green-600 mt-1">
                        {formatCurrency(reportData.summary.current || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-600">30 Days</p>
                      <p className="text-xl font-bold text-yellow-600 mt-1">
                        {formatCurrency(reportData.summary.days30 || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600">60 Days</p>
                      <p className="text-xl font-bold text-orange-600 mt-1">
                        {formatCurrency(reportData.summary.days60 || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">90+ Days</p>
                      <p className="text-xl font-bold text-red-600 mt-1">
                        {formatCurrency(reportData.summary.days90plus || 0)}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {Array.isArray(reportData.data) && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bucket</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{row.bucket}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">{(row.percentage * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'defaulters':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Defaulter List</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(reportData.data) && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Days Overdue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.studentName}</TableCell>
                          <TableCell>{row.admissionNo}</TableCell>
                          <TableCell>{row.class}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(row.outstanding)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                row.daysOverdue > 90
                                  ? 'bg-red-100 text-red-800'
                                  : row.daysOverdue > 60
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {row.daysOverdue} days
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'payment-methods':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Method Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(reportData.data) && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="capitalize">{row.method.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(row.amount)}
                          </TableCell>
                          <TableCell className="text-right">{(row.percentage * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-gray-600">Report data will appear here</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="classFilter">Class</Label>
              <select
                id="classFilter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="termFilter">Term</Label>
              <select
                id="termFilter"
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                <option value="">All Terms</option>
                {terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                <option value="">All Methods</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="check">Check</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleGenerateReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{reportData.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Generated on {formatDate(reportData.generatedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportPDF}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {renderReportContent()}
        </>
      )}
    </div>
  );
}

export default ReportViewer;
