import React, { useState } from 'react';
import { AlertCircle, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
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

interface FeeAdjustmentFormProps {
  studentId: string;
  feeAssignments: FeeAssignment[];
  onSuccess?: () => void;
}

const APPROVAL_THRESHOLD = 50000; // Adjustments above this require approval

export function FeeAdjustmentForm({
  studentId,
  feeAssignments,
  onSuccess,
}: FeeAdjustmentFormProps) {
  const [adjustmentType, setAdjustmentType] = useState<'refund' | 'correction' | 'additional_charge'>('refund');
  const [selectedFeeAssignment, setSelectedFeeAssignment] = useState<string>(
    feeAssignments.length > 0 ? feeAssignments[0].id : ''
  );
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedAssignment = feeAssignments.find(f => f.id === selectedFeeAssignment);
  const requiresApproval = amount ? parseFloat(amount) > APPROVAL_THRESHOLD : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!selectedFeeAssignment) {
      setError('Please select a fee assignment');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    // Validate amount based on adjustment type
    if (adjustmentType === 'refund' && selectedAssignment) {
      if (parseFloat(amount) > selectedAssignment.totalPaid) {
        setError('Refund amount cannot exceed total paid amount');
        return;
      }
    }

    if (adjustmentType === 'correction' && selectedAssignment) {
      if (parseFloat(amount) > selectedAssignment.totalAmount) {
        setError('Correction amount cannot exceed total fee amount');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tenant/finance/fee-adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feeAssignmentId: selectedFeeAssignment,
          adjustmentType,
          amount: parseFloat(amount),
          reason,
          requiresApproval,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create adjustment');
      }

      setSuccess(true);
      setAmount('');
      setReason('');
      setAdjustmentType('refund');

      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
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
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Fee Adjustment Information</p>
              <p className="mt-1">
                Adjustments above {formatCurrency(APPROVAL_THRESHOLD)} require approval. All adjustments are logged for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Record Fee Adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">Adjustment recorded successfully</p>
              </div>
            )}

            {/* Adjustment Type */}
            <div>
              <Label htmlFor="adjustmentType">Adjustment Type</Label>
              <select
                id="adjustmentType"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                <option value="refund">Refund</option>
                <option value="correction">Correction</option>
                <option value="additional_charge">Additional Charge</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {adjustmentType === 'refund' && 'Return payment to student'}
                {adjustmentType === 'correction' && 'Correct fee amount'}
                {adjustmentType === 'additional_charge' && 'Add additional charges'}
              </p>
            </div>

            {/* Fee Assignment Selection */}
            <div>
              <Label htmlFor="feeAssignment">Fee Assignment</Label>
              <select
                id="feeAssignment"
                value={selectedFeeAssignment}
                onChange={(e) => setSelectedFeeAssignment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
              >
                {feeAssignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.academicSession} - {assignment.term} ({formatCurrency(assignment.totalAmount)})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount</Label>
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
                />
              </div>
              {requiresApproval && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ This adjustment requires approval (above {formatCurrency(APPROVAL_THRESHOLD)})
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Explain the reason for this adjustment..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Recording...' : 'Record Adjustment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Fee Assignment Details */}
      {selectedAssignment && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Fee Assignment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Session & Term</p>
                <p className="font-medium">{selectedAssignment.academicSession} - {selectedAssignment.term}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium">{formatCurrency(selectedAssignment.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="font-medium text-green-600">{formatCurrency(selectedAssignment.totalPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance</p>
                <p className="font-medium text-orange-600">{formatCurrency(selectedAssignment.totalBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="font-medium">{new Date(selectedAssignment.dueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant={selectedAssignment.status === 'paid' ? 'default' : selectedAssignment.status === 'partial' ? 'secondary' : 'destructive'}>
                  {selectedAssignment.status.charAt(0).toUpperCase() + selectedAssignment.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adjustment Limits Info */}
      <Card>
        <CardHeader>
          <CardTitle>Adjustment Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment Type</TableHead>
                  <TableHead>Maximum Amount</TableHead>
                  <TableHead>Requires Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Refund</TableCell>
                  <TableCell>{selectedAssignment ? formatCurrency(selectedAssignment.totalPaid) : 'N/A'}</TableCell>
                  <TableCell>
                    {selectedAssignment && selectedAssignment.totalPaid > APPROVAL_THRESHOLD ? (
                      <Badge variant="destructive">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Correction</TableCell>
                  <TableCell>{selectedAssignment ? formatCurrency(selectedAssignment.totalAmount) : 'N/A'}</TableCell>
                  <TableCell>
                    {selectedAssignment && selectedAssignment.totalAmount > APPROVAL_THRESHOLD ? (
                      <Badge variant="destructive">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Additional Charge</TableCell>
                  <TableCell>Unlimited</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Yes (if &gt; {formatCurrency(APPROVAL_THRESHOLD)})</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FeeAdjustmentForm;
