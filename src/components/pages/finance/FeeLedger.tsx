import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCcw, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';

interface FeeAssignment {
  id: string;
  studentId: string;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  status: 'pending' | 'partial' | 'paid';
  dueDate: string;
  academicSession: string;
  term: string;
}

interface Payment {
  id: string;
  feeAssignmentId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  receiptNumber: string;
  paymentDate: string;
  paymentTime: string;
  recordedBy: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface Exemption {
  id: string;
  studentId: string;
  feeAssignmentId: string;
  exemptionType: string;
  amount: number;
  percentage: number | null;
  reason: string;
  approvedBy: string;
  approvalDate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

interface FeeLedgerData {
  assignment: FeeAssignment;
  exemptions: Exemption[];
}

interface FeeLedgerProps {
  studentId: string;
}

export function FeeLedger({ studentId }: FeeLedgerProps) {
  const [ledgerData, setLedgerData] = useState<Map<string, FeeLedgerData>>(new Map());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLedgerData();
  }, [studentId]);

  const fetchLedgerData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch fee assignments for this student
      const assignmentsResponse = await fetch(
        `/api/tenant/finance/fee-assignments?studentId=${studentId}`
      );
      if (!assignmentsResponse.ok) {
        throw new Error('Failed to fetch fee assignments');
      }
      const assignmentsData = await assignmentsResponse.json();
      const assignments = assignmentsData.data || [];

      // Fetch ledger data for each assignment
      const ledgerMap = new Map<string, FeeLedgerData>();
      const allPayments: Payment[] = [];

      for (const assignment of assignments) {
        try {
          const ledgerResponse = await fetch(
            `/api/tenant/finance/fee-assignments/${assignment.id}/ledger`
          );
          if (ledgerResponse.ok) {
            const ledgerResult = await ledgerResponse.json();
            ledgerMap.set(assignment.id, ledgerResult.data);
          }

          // Fetch payments for this assignment
          const paymentsResponse = await fetch(
            `/api/tenant/finance/payments?feeAssignmentId=${assignment.id}`
          );
          if (paymentsResponse.ok) {
            const paymentsResult = await paymentsResponse.json();
            allPayments.push(...(paymentsResult.data || []));
          }
        } catch (err) {
          console.error(`Error fetching ledger for assignment ${assignment.id}:`, err);
        }
      }

      setLedgerData(ledgerMap);
      setPayments(allPayments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      partial: 'secondary',
      pending: 'destructive',
      verified: 'default',
      reconciled: 'default',
      reversed: 'outline',
    };
    return variants[status] || 'outline';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
      online: 'Online Payment',
      check: 'Check',
      mobile_money: 'Mobile Money',
    };
    return labels[method] || method;
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
    </TableRow>
  );

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Unable to load fee ledger</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLedgerData}
              className="border-red-300 hover:bg-red-100"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fee Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map(i => (
                  <SkeletonRow key={i} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build timeline of all transactions
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'fee' | 'payment' | 'exemption';
    status: string;
    details?: any;
  }> = [];

  // Add fees
  ledgerData.forEach((ledger) => {
    transactions.push({
      date: ledger.assignment.dueDate,
      description: `Fee Assignment - ${ledger.assignment.academicSession} ${ledger.assignment.term}`,
      amount: ledger.assignment.totalAmount,
      type: 'fee',
      status: ledger.assignment.status,
      details: ledger.assignment,
    });

    // Add exemptions
    ledger.exemptions.forEach((exemption) => {
      transactions.push({
        date: exemption.createdAt,
        description: `Exemption - ${exemption.exemptionType}: ${exemption.reason}`,
        amount: -(exemption.amount || 0),
        type: 'exemption',
        status: 'applied',
        details: exemption,
      });
    });
  });

  // Add payments
  payments.forEach((payment) => {
    transactions.push({
      date: payment.paymentDate,
      description: `Payment - ${getPaymentMethodLabel(payment.paymentMethod)} (Ref: ${payment.referenceNumber})`,
      amount: -payment.amount,
      type: 'payment',
      status: payment.status,
      details: payment,
    });
  });

  // Sort by date
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Fee History</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No transactions found</p>
            <p className="text-sm text-gray-500 mt-1">Fee history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(transaction.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell className="text-right">
                      <span className={transaction.amount > 0 ? 'text-orange-600' : 'text-green-600'}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(transaction.status)}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary */}
        {transactions.length > 0 && (
          <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Fees</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'fee')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Paid</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(
                  Math.abs(
                    transactions
                      .filter(t => t.type === 'payment')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(
                  transactions.reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FeeLedger;
