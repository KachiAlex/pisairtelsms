import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle, Download, CreditCard, Loader2, CheckCircle, Clock, Upload,
  Smartphone, X
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { PaymentReceipt } from '../finance/PaymentReceipt';

interface FeeAssignment {
  id: string;
  feeStructureId: string;
  academicSession: string;
  term: string;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  status: 'pending' | 'partial' | 'paid';
  dueDate: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'success' | 'failed' | 'verified';
  gateway: string | null;
  receiptNumber: string;
  paymentDate: string;
  notes: string | null;
}

interface ActiveGateway {
  gateway: 'paystack' | 'flutterwave' | 'moniepoint';
  publicKey: string;
}

function getAuth() {
  try {
    const stored = localStorage.getItem('auth');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch { return null; }
}

const statusConfig: Record<string, { label: string; color: string; badge: string }> = {
  paid: { label: 'Fully Paid', color: 'text-green-700 bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' },
  partial: { label: 'Partially Paid', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  pending: { label: 'Pending Payment', color: 'text-red-700 bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  success: { label: 'Successful', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  verified: { label: 'Verified', color: 'bg-blue-100 text-blue-700' },
};

export function MyFees() {
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeGateway, setActiveGateway] = useState<ActiveGateway | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingAssignment, setPayingAssignment] = useState<FeeAssignment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualMethod, setManualMethod] = useState('Bank Transfer');
  const [manualNotes, setManualNotes] = useState('');
  const [manualProofUrl, setManualProofUrl] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  const auth = getAuth();
  const tenantId = auth?.tenantId;
  const studentId = auth?.userId;

  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
      };
  if (auth?.token) apiHeaders['Authorization'] = `Bearer ${auth.token}`;

  const fetchData = useCallback(async () => {
    if (!tenantId || !studentId) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const assignmentsRes = await fetch(`/api/tenant/finance/fee-assignments?studentId=${studentId}`, { headers: apiHeaders });
      if (assignmentsRes.ok) {
        const result = await assignmentsRes.json();
        setAssignments(result.data || []);
      }

      const paymentsRes = await fetch(`/api/tenant/finance/payments?studentId=${studentId}`, { headers: apiHeaders });
      if (paymentsRes.ok) {
        const result = await paymentsRes.json();
        setPayments(result.data || []);
      }

      const gatewayRes = await fetch('/api/tenant/finance/payments?action=active-gateway', { headers: apiHeaders });
      if (gatewayRes.ok) {
        const result = await gatewayRes.json();
        setActiveGateway(result.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return `\u20A6${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  };

  const handlePayNow = async (assignment: FeeAssignment) => {
    if (!activeGateway) {
      setError('No payment gateway is configured. Please contact your school administrator.');
      return;
    }

    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0 || amount > assignment.totalBalance) {
      setError(`Enter a valid amount between 1 and ${assignment.totalBalance}`);
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      const gatewayRef = `PAY-${Date.now()}`;
      const initiateRes = await fetch('/api/tenant/finance/payments?action=initiate', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          studentId,
          feeAssignmentId: assignment.id,
          feeStructureId: assignment.feeStructureId,
          amount,
          gatewayRef,
        }),
      });

      if (!initiateRes.ok) {
        const data = await initiateRes.json();
        throw new Error(data.error || 'Failed to initiate payment');
      }

      if (activeGateway.gateway === 'paystack') {
        await loadPaystackScript();
        const handler = (window as any).PaystackPop.setup({
          key: activeGateway.publicKey,
          email: `${studentId}@student.scholarx.app`,
          amount: amount * 100,
          ref: gatewayRef,
          callback: async (response: { reference: string; status: string }) => {
            if (response.status === 'success') {
              await verifyPayment(response.reference);
            }
          },
          onClose: () => {
            setProcessingPayment(false);
          },
        });
        handler.openIframe();
      } else {
        setError(`${activeGateway.gateway} integration coming soon. Please use manual payment.`);
        setProcessingPayment(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setProcessingPayment(false);
    }
  };

  const verifyPayment = async (gatewayRef: string) => {
    try {
      const res = await fetch('/api/tenant/finance/payments?action=verify', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ gatewayRef }),
      });

      if (!res.ok) throw new Error('Verification failed');

      setPaymentSuccess('Payment successful! Your balance will be updated shortly.');
      setPayingAssignment(null);
      setPayAmount('');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!payingAssignment) return;
    const amount = parseFloat(manualAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSubmittingManual(true);
    setError(null);

    try {
      const res = await fetch('/api/tenant/finance/payments?action=manual', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          studentId,
          feeAssignmentId: payingAssignment.id,
          feeStructureId: payingAssignment.feeStructureId,
          amount,
          paymentMethod: manualMethod,
          notes: manualNotes,
          proofUrl: manualProofUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit payment');
      }

      setManualDialogOpen(false);
      setManualAmount('');
      setManualNotes('');
      setManualProofUrl('');
      setPaymentSuccess('Payment proof submitted! It will be reviewed by the admin.');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmittingManual(false);
    }
  };

  const loadPaystackScript = (): Promise<void> => {
    return new Promise((resolve) => {
      if ((window as any).PaystackPop) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  const totalBalance = assignments.reduce((sum, a) => sum + a.totalBalance, 0);
  const totalPaid = assignments.reduce((sum, a) => sum + a.totalPaid, 0);
  const totalExpected = assignments.reduce((sum, a) => sum + a.totalAmount, 0);

  const overallStatus: 'paid' | 'partial' | 'pending' =
    totalBalance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Fees &amp; Payments</h1>
        <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-48 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fees &amp; Payments</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs text-red-600 underline">Dismiss</button>
        </div>
      )}

      {paymentSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{paymentSuccess}</p>
          <button onClick={() => setPaymentSuccess(null)} className="ml-auto text-xs text-green-600 underline">Dismiss</button>
        </div>
      )}

      {/* Overall Summary */}
      <div className={`rounded-lg border p-4 sm:p-6 ${statusConfig[overallStatus]?.color || statusConfig.pending.color}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig[overallStatus]?.color || statusConfig.pending.color}`}>
              {statusConfig[overallStatus]?.label || 'Pending Payment'}
            </span>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm opacity-70">Total Fees</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalExpected)}</p>
              </div>
              <div>
                <p className="text-sm opacity-70">Amount Paid</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-sm opacity-70">Balance</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </div>
          <CreditCard className="h-8 w-8 opacity-40 flex-shrink-0 hidden sm:block" />
        </div>
        {activeGateway && (
          <div className="mt-4 flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700">
              <Smartphone className="w-3 h-3 mr-1" />
              {activeGateway.gateway} active
            </Badge>
            <span className="text-xs opacity-70">Pay online or upload proof manually</span>
          </div>
        )}
      </div>

      {/* Fee Assignments */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">Fee Breakdown</h2>
        {assignments.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            No fee assignments found
          </div>
        ) : (
          assignments.map(assignment => (
            <Card key={assignment.id} className={assignment.totalBalance <= 0 ? 'border-green-200 bg-green-50/20' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{assignment.academicSession} &mdash; {assignment.term}</p>
                      <Badge className={statusConfig[assignment.status]?.badge || statusConfig.pending.badge}>
                        {statusConfig[assignment.status]?.label || 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-500">Total: <span className="font-medium text-gray-900">{formatCurrency(assignment.totalAmount)}</span></span>
                      <span className="text-gray-500">Paid: <span className="font-medium text-green-600">{formatCurrency(assignment.totalPaid)}</span></span>
                      <span className="text-gray-500">Balance: <span className="font-medium text-red-600">{formatCurrency(assignment.totalBalance)}</span></span>
                    </div>
                    {assignment.dueDate && (
                      <p className="text-xs text-gray-400 mt-1">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>

                  {assignment.totalBalance > 0 && (
                    <div className="flex gap-2">
                      {activeGateway && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            setPayingAssignment(assignment);
                            setPayAmount(String(assignment.totalBalance));
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Pay Now
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPayingAssignment(assignment);
                          setManualAmount(String(assignment.totalBalance));
                          setManualDialogOpen(true);
                        }}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Pay Manually
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No payments recorded yet</div>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${payment.status === 'success' || payment.status === 'verified' ? 'bg-green-100' : payment.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'}`}>
                      {payment.status === 'success' || payment.status === 'verified' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : payment.status === 'pending' ? (
                        <Clock className="w-4 h-4 text-amber-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-gray-900">{formatCurrency(payment.amount)}</p>
                        <Badge className={paymentStatusConfig[payment.status]?.color || 'bg-gray-100 text-gray-700'}>
                          {paymentStatusConfig[payment.status]?.label || payment.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{payment.paymentMethod} &bull; {payment.receiptNumber}</p>
                      <p className="text-xs text-gray-400">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {(payment.status === 'success' || payment.status === 'verified') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 self-start sm:self-auto"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setReceiptDialogOpen(true);
                      }}
                    >
                      <Download className="w-3 h-3" />
                      Receipt
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Now Dialog */}
      <Dialog open={!!payingAssignment && !manualDialogOpen} onOpenChange={() => { setPayingAssignment(null); setPayAmount(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              Pay {formatCurrency(parseFloat(payAmount) || 0)} for {payingAssignment?.academicSession} &mdash; {payingAssignment?.term}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount to Pay</Label>
              <Input
                id="pay-amount"
                type="number"
                min={1}
                max={payingAssignment?.totalBalance}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <p className="text-xs text-gray-500">Outstanding balance: {formatCurrency(payingAssignment?.totalBalance || 0)}</p>
            </div>
            {activeGateway?.gateway === 'paystack' && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                You will be redirected to Paystack to complete the payment securely.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayingAssignment(null); setPayAmount(''); }}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => payingAssignment && handlePayNow(payingAssignment)}
              disabled={processingPayment || !payAmount}
            >
              {processingPayment ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              {processingPayment ? 'Processing...' : 'Proceed to Pay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Payment Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payment Proof</DialogTitle>
            <DialogDescription>
              Submit proof of payment for {payingAssignment?.academicSession} &mdash; {payingAssignment?.term}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="manual-amount">Amount Paid</Label>
              <Input
                id="manual-amount"
                type="number"
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-method">Payment Method</Label>
              <select
                id="manual-method"
                value={manualMethod}
                onChange={e => setManualMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option>Bank Transfer</option>
                <option>Cash Deposit</option>
                <option>Mobile Transfer</option>
                <option>POS</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-notes">Notes (optional)</Label>
              <Input
                id="manual-notes"
                value={manualNotes}
                onChange={e => setManualNotes(e.target.value)}
                placeholder="e.g., Bank name, teller number, date..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-proof">Proof URL (optional)</Label>
              <Input
                id="manual-proof"
                type="url"
                value={manualProofUrl}
                onChange={e => setManualProofUrl(e.target.value)}
                placeholder="https://... link to receipt screenshot"
              />
              <p className="text-xs text-gray-500">Upload your receipt to a cloud service and paste the link here.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleManualSubmit}
              disabled={submittingManual || !manualAmount}
            >
              {submittingManual ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {submittingManual ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {selectedPayment && (
        <PaymentReceipt
          payment={{
            ...selectedPayment,
            studentName: auth?.userId ? 'Student' : undefined,
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

export default MyFees;
