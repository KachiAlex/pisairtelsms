import React, { useState } from 'react';
import { Loader, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent } from '../../ui/card';
import { financeApiPost } from '../../../lib/financeApi';

interface PaymentPlanFormProps {
  feeAssignmentId: string;
  totalAmount: number;
  onSuccess?: () => void;
}

export function PaymentPlanForm({
  feeAssignmentId,
  totalAmount,
  onSuccess,
}: PaymentPlanFormProps) {
  const [numberOfInstallments, setNumberOfInstallments] = useState('3');
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installmentAmount = numberOfInstallments ? (totalAmount / parseInt(numberOfInstallments)).toFixed(2) : '0.00';

  const generateInstallmentSchedule = () => {
    if (!startDate || !numberOfInstallments) return [];

    const schedule = [];
    const start = new Date(startDate);

    for (let i = 1; i <= parseInt(numberOfInstallments); i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        number: i,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: parseFloat(installmentAmount),
      });
    }

    return schedule;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!numberOfInstallments || parseInt(numberOfInstallments) < 2) {
      setError('Number of installments must be at least 2');
      return;
    }
    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    setLoading(true);
    try {
      const response = await financeApiPost('/api/tenant/finance/payment-plans', {
        feeAssignmentId,
        numberOfInstallments: parseInt(numberOfInstallments),
        installmentAmount: parseFloat(installmentAmount),
        startDate,
        createdBy: 'current_user', // In real app, get from auth context
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment plan');
      }

      // Reset form
      setNumberOfInstallments('3');
      setStartDate('');

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

  const schedule = generateInstallmentSchedule();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Total Amount */}
      <div>
        <Label>Total Amount</Label>
        <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Number of Installments */}
      <div>
        <Label htmlFor="numberOfInstallments">Number of Installments</Label>
        <Input
          id="numberOfInstallments"
          type="number"
          min="2"
          max="12"
          value={numberOfInstallments}
          onChange={(e) => setNumberOfInstallments(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Installment amount: {formatCurrency(parseFloat(installmentAmount))}
        </p>
      </div>

      {/* Start Date */}
      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          First installment will be due one month after start date
        </p>
      </div>

      {/* Installment Schedule Preview */}
      {schedule.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Installment Schedule</p>
            <div className="space-y-2">
              {schedule.map((installment) => (
                <div key={installment.number} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">Installment {installment.number}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(installment.amount)}</p>
                    <p className="text-xs text-gray-500">{new Date(installment.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
        {loading ? 'Creating Plan...' : 'Create Payment Plan'}
      </Button>
    </form>
  );
}

export default PaymentPlanForm;
