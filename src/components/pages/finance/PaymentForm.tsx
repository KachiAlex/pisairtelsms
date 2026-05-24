import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Card, CardContent } from '../../ui/card';
import { financeApiGet, financeApiPost } from '../../../lib/financeApi';

interface FeeItem {
  id: string;
  category: string;
  amount: number;
  paid: number;
  balance: number;
}

interface PaymentFormProps {
  studentId?: string;
  feeAssignmentId?: string;
  balance?: number;
  onSuccess?: () => void;
}

export function PaymentForm({
  studentId,
  feeAssignmentId,
  balance = 0,
  onSuccess,
}: PaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);

  // Fetch fee items for allocation preview
  useEffect(() => {
    if (feeAssignmentId) {
      const fetchFeeItems = async () => {
        setLoadingFees(true);
        try {
          const response = await financeApiGet(`/api/tenant/finance/fee-assignments/${feeAssignmentId}/ledger`);
          if (response.ok) {
            const data = await response.json();
            setFeeItems(data.data?.feeItems || []);
          }
        } catch (err) {
          console.error('Failed to fetch fee items:', err);
        } finally {
          setLoadingFees(false);
        }
      };
      fetchFeeItems();
    }
  }, [feeAssignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (parseFloat(amount) > balance) {
      setError(`Payment amount cannot exceed balance of ₦${balance.toLocaleString()}`);
      return;
    }
    if (!referenceNumber.trim()) {
      setError('Please enter a reference number');
      return;
    }

    setLoading(true);
    try {
      const response = await financeApiPost('/api/tenant/finance/payments', {
        feeAssignmentId,
        amount: parseFloat(amount),
        paymentMethod,
        referenceNumber,
        notes: notes || null,
        recordedBy: 'current_user', // In real app, get from auth context
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }

      // Reset form
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      setPaymentMethod('bank_transfer');

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Calculate payment allocation preview (FIFO)
  const calculateAllocation = () => {
    if (!amount || parseFloat(amount) <= 0) return [];

    const paymentAmount = parseFloat(amount);
    let remaining = paymentAmount;
    const allocation = [];

    for (const fee of feeItems) {
      if (remaining <= 0) break;
      if (fee.balance <= 0) continue;

      const allocatedAmount = Math.min(remaining, fee.balance);
      allocation.push({
        category: fee.category,
        allocated: allocatedAmount,
        balance: fee.balance,
      });
      remaining -= allocatedAmount;
    }

    return allocation;
  };

  const allocation = calculateAllocation();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Amount */}
      <div>
        <Label htmlFor="amount">Payment Amount</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-2.5 text-gray-600">₦</span>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-8"
            step="0.01"
            min="0"
            max={balance}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Balance: {formatCurrency(balance)}
        </p>
      </div>

      {/* Payment Method */}
      <div>
        <Label htmlFor="paymentMethod">Payment Method</Label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
        >
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="online">Online Payment</option>
          <option value="check">Check</option>
          <option value="mobile_money">Mobile Money</option>
        </select>
      </div>

      {/* Reference Number */}
      <div>
        <Label htmlFor="referenceNumber">Reference Number</Label>
        <Input
          id="referenceNumber"
          type="text"
          placeholder="e.g., TXN123456 or Check #"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Bank transfer reference, check number, or transaction ID
        </p>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Payment Allocation Preview */}
      {feeAssignmentId && allocation.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Payment Allocation Preview</p>
            <div className="space-y-2">
              {allocation.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.category}</p>
                    <p className="text-xs text-gray-500">Balance: {formatCurrency(item.balance)}</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(item.allocated)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance After Payment */}
      {amount && parseFloat(amount) > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-gray-600">
            Balance after payment: <span className="font-bold text-blue-600">{formatCurrency(Math.max(0, balance - parseFloat(amount)))}</span>
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
        {loading ? 'Recording Payment...' : 'Record Payment'}
      </Button>
    </form>
  );
}

export default PaymentForm;
