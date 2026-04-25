import React, { useState } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';

interface ExemptionFormProps {
  studentId: string;
  feeAssignmentId: string;
  maxAmount: number;
  onSuccess?: () => void;
}

export function ExemptionForm({
  studentId,
  feeAssignmentId,
  maxAmount,
  onSuccess,
}: ExemptionFormProps) {
  const [exemptionType, setExemptionType] = useState('scholarship');
  const [exemptionMethod, setExemptionMethod] = useState('fixed'); // fixed or percentage
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedAmount = exemptionMethod === 'percentage' && percentage
    ? (maxAmount * parseFloat(percentage)) / 100
    : exemptionMethod === 'fixed' && amount
    ? parseFloat(amount)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!exemptionType) {
      setError('Please select an exemption type');
      return;
    }
    if (exemptionMethod === 'fixed' && (!amount || parseFloat(amount) <= 0)) {
      setError('Please enter a valid amount');
      return;
    }
    if (exemptionMethod === 'percentage' && (!percentage || parseFloat(percentage) <= 0 || parseFloat(percentage) > 100)) {
      setError('Please enter a valid percentage (0-100)');
      return;
    }
    if (calculatedAmount > maxAmount) {
      setError(`Exemption amount cannot exceed balance of ₦${maxAmount.toLocaleString()}`);
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the exemption');
      return;
    }
    if (!effectiveFrom) {
      setError('Please select an effective from date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tenant/finance/fee-assignments/exemptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          feeAssignmentId,
          exemptionType,
          amount: exemptionMethod === 'fixed' ? parseFloat(amount) : null,
          percentage: exemptionMethod === 'percentage' ? parseFloat(percentage) : null,
          reason,
          approvedBy: 'current_user', // In real app, get from auth context
          effectiveFrom,
          effectiveTo: effectiveTo || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create exemption');
      }

      // Reset form
      setAmount('');
      setPercentage('');
      setReason('');
      setEffectiveFrom('');
      setEffectiveTo('');
      setExemptionType('scholarship');
      setExemptionMethod('fixed');

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Exemption Type */}
      <div>
        <Label htmlFor="exemptionType">Exemption Type</Label>
        <select
          id="exemptionType"
          value={exemptionType}
          onChange={(e) => setExemptionType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
        >
          <option value="scholarship">Scholarship</option>
          <option value="financial_hardship">Financial Hardship</option>
          <option value="staff_child">Staff Child</option>
          <option value="merit">Merit</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Exemption Method */}
      <div>
        <Label>Exemption Method</Label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="fixed"
              checked={exemptionMethod === 'fixed'}
              onChange={(e) => setExemptionMethod(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm">Fixed Amount</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="percentage"
              checked={exemptionMethod === 'percentage'}
              onChange={(e) => setExemptionMethod(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm">Percentage</span>
          </label>
        </div>
      </div>

      {/* Amount or Percentage */}
      {exemptionMethod === 'fixed' ? (
        <div>
          <Label htmlFor="amount">Exemption Amount</Label>
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
              max={maxAmount}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Maximum: {formatCurrency(maxAmount)}
          </p>
        </div>
      ) : (
        <div>
          <Label htmlFor="percentage">Exemption Percentage</Label>
          <div className="relative mt-1">
            <Input
              id="percentage"
              type="number"
              placeholder="0"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="pr-8"
              step="0.01"
              min="0"
              max="100"
            />
            <span className="absolute right-3 top-2.5 text-gray-600">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Calculated amount: {formatCurrency(calculatedAmount)}
          </p>
        </div>
      )}

      {/* Reason */}
      <div>
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          placeholder="Explain the reason for this exemption..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1"
          rows={2}
        />
      </div>

      {/* Effective From */}
      <div>
        <Label htmlFor="effectiveFrom">Effective From</Label>
        <Input
          id="effectiveFrom"
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Effective To (Optional) */}
      <div>
        <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
        <Input
          id="effectiveTo"
          type="date"
          value={effectiveTo}
          onChange={(e) => setEffectiveTo(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank for indefinite exemption
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
        {loading ? 'Applying Exemption...' : 'Apply Exemption'}
      </Button>
    </form>
  );
}

export default ExemptionForm;
