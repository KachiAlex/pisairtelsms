import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { financeApiGet } from '../../../lib/financeApi';

interface Payment {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  status: string;
}

interface ReversalRecord {
  paymentId: string;
  reason: string;
  approvalRequired: boolean;
  approvalStatus: string;
}

interface PaymentReversalProps {
  onClose?: () => void;
}

export function PaymentReversal({ onClose }: PaymentReversalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalHistory, setReversalHistory] = useState<ReversalRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const REVERSAL_THRESHOLD = 100000; // Amount above which approval is required

  // Fetch payments
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await financeApiGet('/api/tenant/finance/payments?status=verified,reconciled');
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
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.studentName.toLowerCase().includes(searchLower) ||
      payment.receiptNumber.toLowerCase().includes(searchLower) ||
      payment.studentId.toLowerCase().includes(searchLower)
    );
  });

  const handleReversal = async () => {
    if (!selectedPayment) {
      setError('Please select a payment');
      return;
    }

    if (!reversalReason.trim()) {
      setError('Please provide a reason for reversal');
      return;
    }

    setReversalLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/tenant/finance/payments/${selectedPayment.id}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reversalReason,
          requiresApproval: selectedPayment.amount > REVERSAL_THRESHOLD,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reverse payment');
      }

      const data = await response.json();

      // Add to reversal history
      const newRecord: ReversalRecord = {
        paymentId: selectedPayment.id,
        reason: reversalReason,
        approvalRequired: selectedPayment.amount > REVERSAL_THRESHOLD,
        approvalStatus: selectedPayment.amount > REVERSAL_THRESHOLD ? 'pending' : 'approved',
      };
      setReversalHistory([newRecord, ...reversalHistory]);

      setSuccess(
        selectedPayment.amount > REVERSAL_THRESHOLD
          ? `Reversal request submitted for approval. Amount: ₦${selectedPayment.amount.toLocaleString()}`
          : `Payment reversed successfully. Amount: ₦${selectedPayment.amount.toLocaleString()}`
      );

      // Reset form
      setSelectedPayment(null);
      setReversalReason('');

      // Refresh payments list
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setReversalLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setShowHistory(false)}
          className={`px-4 py-2 font-medium border-b-2 ${
            !showHistory
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Reverse Payment
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`px-4 py-2 font-medium border-b-2 ${
            showHistory
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Reversal History
        </button>
      </div>

      {/* Reverse Payment Tab */}
      {!showHistory && (
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search Payments</Label>
            <Input
              id="search"
              placeholder="Student name, receipt number, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {/* Payments List */}
          {!loading && filteredPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Payment to Reverse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.receiptNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.studentName}</p>
                              <p className="text-xs text-gray-500">{payment.studentId}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell className="capitalize">{payment.paymentMethod.replace('_', ' ')}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={selectedPayment?.id === payment.id ? 'default' : 'outline'}
                              onClick={() => setSelectedPayment(payment)}
                            >
                              {selectedPayment?.id === payment.id ? 'Selected' : 'Select'}
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

          {/* Empty State */}
          {!loading && filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments available for reversal</p>
            </div>
          )}

          {/* Reversal Form */}
          {selectedPayment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reversal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Summary */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Receipt:</span> {selectedPayment.receiptNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Student:</span> {selectedPayment.studentName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Amount:</span> {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>

                {/* Approval Notice */}
                {selectedPayment.amount > REVERSAL_THRESHOLD && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">
                      This reversal requires approval as the amount exceeds ₦{REVERSAL_THRESHOLD.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <Label htmlFor="reason">Reason for Reversal</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why this payment is being reversed..."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleReversal}
                    disabled={reversalLoading || !reversalReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {reversalLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    {reversalLoading ? 'Processing...' : 'Reverse Payment'}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedPayment(null);
                      setReversalReason('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Reversal History Tab */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reversal Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            {reversalHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Approval Required</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reversalHistory.map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{record.paymentId}</TableCell>
                        <TableCell className="text-sm">{record.reason}</TableCell>
                        <TableCell>{record.approvalRequired ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(record.approvalStatus)}`}>
                            {record.approvalStatus}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No reversal history</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PaymentReversal;
