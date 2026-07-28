import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { PaymentForm } from './PaymentForm';
import BulkPaymentUpload from './BulkPaymentUpload';
import { PaymentReceipt } from './PaymentReceipt';

interface Payment {
  id: string;
  feeAssignmentId: string;
  studentName: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  receiptNumber: string;
  paymentDate: string;
  status: string;
}

interface PaymentProcessingProps {
  onClose?: () => void;
}

export function PaymentProcessing({ onClose }: PaymentProcessingProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGateway, setFilterGateway] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('single');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Fetch payments
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
        if (auth.tenantId) headers['x-tenant-id'] = auth.tenantId;

        const params = new URLSearchParams();
        if (filterMethod !== 'all') params.append('paymentMethod', filterMethod);
        if (filterStatus !== 'all') params.append('status', filterStatus);
        if (filterGateway !== 'all') params.append('gateway', filterGateway);
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        const response = await fetch(`/api/tenant/finance/payments?${params.toString()}`, { headers });
        if (!response.ok) {
          throw new Error('Failed to fetch payments');
        }

        const data = await response.json();
        setPayments(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [filterMethod, filterStatus, filterGateway, dateFrom, dateTo, refreshTrigger]);

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.studentName.toLowerCase().includes(searchLower) ||
      payment.referenceNumber.toLowerCase().includes(searchLower) ||
      payment.receiptNumber.toLowerCase().includes(searchLower)
    );
  });

  const handlePaymentSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleBulkUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('history');
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reconciled':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'reversed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ['ID', 'Student Name', 'Amount', 'Method', 'Reference', 'Receipt', 'Date', 'Status'];
    const rows = filteredPayments.map((p) => [
      p.id, p.studentName, p.amount, p.paymentMethod, p.referenceNumber, p.receiptNumber, p.paymentDate, p.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Single Payment</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        {/* Single Payment Tab */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Record Single Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentForm onSuccess={handlePaymentSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Upload Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Payment Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkPaymentUpload onSuccess={handleBulkUploadSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Student name, reference, or receipt..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="method">Payment Method</Label>
                  <select
                    id="method"
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                  >
                    <option value="all">All Methods</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online Payment</option>
                    <option value="check">Check</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="success">Success</option>
                    <option value="verified">Verified</option>
                    <option value="failed">Failed</option>
                    <option value="reconciled">Reconciled</option>
                    <option value="reversed">Reversed</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="gateway">Gateway</Label>
                  <select
                    id="gateway"
                    value={filterGateway}
                    onChange={(e) => setFilterGateway(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                  >
                    <option value="all">All Gateways</option>
                    <option value="paystack">Paystack</option>
                    <option value="flutterwave">Flutterwave</option>
                    <option value="moniepoint">Moniepoint</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredPayments.length === 0}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}

              {/* Payments Table */}
              {!loading && filteredPayments.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.studentName}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell className="capitalize">{payment.paymentMethod.replace('_', ' ')}</TableCell>
                          <TableCell className="text-sm text-gray-600">{payment.referenceNumber}</TableCell>
                          <TableCell className="text-sm text-gray-600">{payment.receiptNumber}</TableCell>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {(payment.status === 'success' || payment.status === 'verified') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setReceiptDialogOpen(true);
                                }}
                              >
                                <Download className="w-3 h-3" />
                                Receipt
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredPayments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No payments found</p>
                </div>
              )}

              {/* Summary */}
              {!loading && filteredPayments.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Total: {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))} ({filteredPayments.length} payments)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt Dialog */}
      {selectedPayment && (
        <PaymentReceipt
          payment={{
            ...selectedPayment,
            studentName: selectedPayment.studentName,
            feeDescription: 'Fee Payment',
          }}
          open={receiptDialogOpen}
          onClose={() => {
            setReceiptDialogOpen(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}

export default PaymentProcessing;
