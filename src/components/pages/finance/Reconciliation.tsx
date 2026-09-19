import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Check, X, Upload, Download, Filter } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { financeApiGet, financeApiFetch } from '../../../lib/financeApi';

interface UnmatchedTransaction {
  id: string;
  type: 'payment' | 'deposit';
  amount: number;
  date: string;
  reference: string;
  description: string;
  status: 'pending' | 'matched' | 'exception';
}

interface MatchedTransaction {
  id: string;
  paymentId: string;
  depositId: string;
  amount: number;
  paymentDate: string;
  depositDate: string;
  bankReference: string;
  matchedAt: string;
  matchedBy: string;
  status: 'all' | 'pending' | 'exception';
}

export function Reconciliation() {
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<UnmatchedTransaction[]>([]);
  const [matchedTransactions, setMatchedTransactions] = useState<MatchedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedTransaction | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<UnmatchedTransaction | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [matching, setMatching] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'exception'>('all');
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositDate, setDepositDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositReference, setDepositReference] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [savingDeposit, setSavingDeposit] = useState(false);

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const fetchReconciliationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeApiGet('/api/tenant/finance/reconciliation/unmatched');
      if (!response.ok) {
        throw new Error('Failed to fetch reconciliation data');
      }
      const data = await response.json();
      setUnmatchedTransactions(data.unmatched || []);
      setMatchedTransactions(data.matched || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchTransactions = async () => {
    if (!selectedPayment || !selectedDeposit) {
      setError('Please select both a payment and a deposit');
      return;
    }

    if (selectedPayment.amount !== selectedDeposit.amount) {
      setError('Payment and deposit amounts must match');
      return;
    }

    setMatching(true);
    setError(null);
    try {
      const response = await financeApiFetch('/api/tenant/finance/reconciliation/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          depositId: selectedDeposit.id,
          bankReference: bankReference || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to match transactions');
      }

      // Reset form and refresh data
      setSelectedPayment(null);
      setSelectedDeposit(null);
      setBankReference('');
      await fetchReconciliationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to match transactions');
    } finally {
      setMatching(false);
    }
  };

  const handleBulkMatch = async (file: File) => {
    setMatching(true);
    setError(null);
    try {
      const text = await file.text();
      const rows = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !/^payment id/i.test(line))
        .map((line) => {
          const [paymentId, depositId, bankReference] = line.split(',').map((c) => c.trim());
          return { paymentId, depositId, bankReference: bankReference || undefined };
        })
        .filter((r) => r.paymentId && r.depositId);

      if (rows.length === 0) {
        throw new Error('No valid rows found — expected "Payment ID,Deposit ID,Bank Reference"');
      }

      const response = await financeApiFetch('/api/tenant/finance/reconciliation/bulk-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconciliations: rows }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to bulk match transactions');
      }
      if (result.errors?.length) {
        setError(`Applied ${result.data?.length ?? 0} of ${rows.length} matches — ${result.errors[0]}`);
      }

      await fetchReconciliationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk match transactions');
    } finally {
      setMatching(false);
    }
  };

  const handleRecordDeposit = async () => {
    if (!depositDate || !depositAmount || !depositReference) {
      setError('Deposit date, amount, and reference are required');
      return;
    }
    setSavingDeposit(true);
    setError(null);
    try {
      const response = await financeApiFetch('/api/tenant/finance/reconciliation/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositDate,
          amount: parseFloat(depositAmount),
          reference: depositReference,
          description: depositDescription || undefined,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to record deposit');
      }
      setDepositDate('');
      setDepositAmount('');
      setDepositReference('');
      setDepositDescription('');
      setShowDepositForm(false);
      await fetchReconciliationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record deposit');
    } finally {
      setSavingDeposit(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = 'Payment ID,Deposit ID,Bank Reference\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reconciliation-template.csv';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-100 text-green-800">Matched</Badge>;
      case 'exception':
        return <Badge className="bg-red-100 text-red-800">Exception</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const payments = unmatchedTransactions.filter((t) => t.type === 'payment');
  const deposits = unmatchedTransactions.filter((t) => t.type === 'deposit');
  const filteredMatched = matchedTransactions.filter(
    (t) => filterStatus === 'all' || t.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Unmatched Payments</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Unmatched Deposits</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{deposits.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(deposits.reduce((sum, d) => sum + d.amount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Matched Transactions</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{matchedTransactions.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(matchedTransactions.reduce((sum, m) => sum + m.amount, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="match" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="match">Manual Match</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="matched">Matched Transactions</TabsTrigger>
        </TabsList>

        {/* Manual Match Tab */}
        <TabsContent value="match" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payments Column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unmatched Payments ({payments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : payments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No unmatched payments</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        onClick={() => setSelectedPayment(payment)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPayment?.id === payment.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{payment.reference}</p>
                            <p className="text-xs text-gray-600 mt-1">{formatDate(payment.date)}</p>
                          </div>
                          <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{payment.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deposits Column */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Unmatched Deposits ({deposits.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowDepositForm((v) => !v)}>
                  {showDepositForm ? 'Hide' : '+ Record Deposit'}
                </Button>
              </CardHeader>
              <CardContent>
                {showDepositForm && (
                  <div className="mb-4 p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50">
                    <p className="text-xs text-gray-600">
                      Record a deposit that hit the school bank account (from a bank statement or alert).
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={depositDate}
                        onChange={(e) => setDepositDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount (₦)"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Bank reference / narration"
                      value={depositReference}
                      onChange={(e) => setDepositReference(e.target.value)}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={depositDescription}
                      onChange={(e) => setDepositDescription(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleRecordDeposit}
                      disabled={savingDeposit}
                      className="w-full"
                    >
                      {savingDeposit ? 'Saving…' : 'Save Deposit'}
                    </Button>
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : deposits.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No unmatched deposits</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {deposits.map((deposit) => (
                      <div
                        key={deposit.id}
                        onClick={() => setSelectedDeposit(deposit)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedDeposit?.id === deposit.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{deposit.reference}</p>
                            <p className="text-xs text-gray-600 mt-1">{formatDate(deposit.date)}</p>
                          </div>
                          <p className="font-semibold text-sm">{formatCurrency(deposit.amount)}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{deposit.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Match Form */}
          {selectedPayment && selectedDeposit && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">Match Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Payment</Label>
                    <p className="font-medium mt-1">{selectedPayment.reference}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Deposit</Label>
                    <p className="font-medium mt-1">{selectedDeposit.reference}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(selectedDeposit.amount)}</p>
                  </div>
                </div>

                {selectedPayment.amount !== selectedDeposit.amount && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-md">
                    <p className="text-sm text-red-800">
                      Amount mismatch: {formatCurrency(selectedPayment.amount)} vs{' '}
                      {formatCurrency(selectedDeposit.amount)}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="bankReference">Bank Reference (Optional)</Label>
                  <Input
                    id="bankReference"
                    placeholder="Enter bank reference number"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleMatchTransactions}
                    disabled={matching || selectedPayment.amount !== selectedDeposit.amount}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {matching && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                    {matching ? 'Matching...' : 'Confirm Match'}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedPayment(null);
                      setSelectedDeposit(null);
                      setBankReference('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bulk Upload Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bulk Reconciliation Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Upload a CSV file with payment and deposit matches. Download the template to get started.
                </p>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="mb-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-xs text-gray-500 mb-4">or click to browse</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleBulkMatch(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="csvUpload"
                  />
                  <Button
                    onClick={() => document.getElementById('csvUpload')?.click()}
                    variant="outline"
                  >
                    Select File
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matched Transactions Tab */}
        <TabsContent value="matched" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matched Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : matchedTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No matched transactions</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Deposit ID</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Deposit Date</TableHead>
                        <TableHead>Bank Reference</TableHead>
                        <TableHead>Matched By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMatched.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium text-sm">{match.paymentId}</TableCell>
                          <TableCell className="text-sm">{match.depositId}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(match.amount)}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(match.paymentDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(match.depositDate)}</TableCell>
                          <TableCell className="text-sm">{match.bankReference || '-'}</TableCell>
                          <TableCell className="text-sm">{match.matchedBy}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Reconciliation;
