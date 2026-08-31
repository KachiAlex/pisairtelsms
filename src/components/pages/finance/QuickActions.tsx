import React, { useState } from 'react';
import { DollarSign, Calendar, Gift, Send, AlertCircle } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { PaymentForm } from './PaymentForm.js';
import { PaymentPlanForm } from './PaymentPlanForm.js';
import { ExemptionForm } from './ExemptionForm.js';

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

interface QuickActionsProps {
  studentId: string;
  feeAssignments: FeeAssignment[];
  onRecordPayment?: (studentId: string, feeAssignmentId: string) => void;
  onCreatePaymentPlan?: (feeAssignmentId: string) => void;
  onApplyExemption?: (feeAssignmentId: string) => void;
  onSendReminder?: (studentId: string) => void;
}

export function QuickActions({
  studentId,
  feeAssignments,
  onRecordPayment,
  onCreatePaymentPlan,
  onApplyExemption,
  onSendReminder,
}: QuickActionsProps) {
  const [openPayment, setOpenPayment] = useState(false);
  const [openPaymentPlan, setOpenPaymentPlan] = useState(false);
  const [openExemption, setOpenExemption] = useState(false);
  const [selectedFeeAssignment, setSelectedFeeAssignment] = useState<FeeAssignment | null>(null);
  const [reminderSent, setReminderSent] = useState(false);

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      partial: 'secondary',
      pending: 'destructive',
    };
    return variants[status] || 'outline';
  };

  const handleSendReminder = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll just show a success message
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 3000);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setOpenPayment(false);
    setSelectedFeeAssignment(null);
    // Trigger parent refresh
    if (onRecordPayment && selectedFeeAssignment) {
      onRecordPayment(studentId, selectedFeeAssignment.id);
    }
  };

  const handlePaymentPlanSuccess = () => {
    setOpenPaymentPlan(false);
    if (onCreatePaymentPlan && selectedFeeAssignment) {
      onCreatePaymentPlan(selectedFeeAssignment.id);
    }
  };

  const handleExemptionSuccess = () => {
    setOpenExemption(false);
    if (onApplyExemption && selectedFeeAssignment) {
      onApplyExemption(selectedFeeAssignment.id);
    }
  };

  if (feeAssignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No fee assignments found</p>
          <p className="text-sm text-gray-500 mt-1">This student has no active fee assignments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Available Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Dialog open={openPayment} onOpenChange={setOpenPayment}>
              <DialogTrigger asChild>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setSelectedFeeAssignment(feeAssignments[0]);
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                {selectedFeeAssignment && (
                  <PaymentForm
                    studentId={studentId}
                    feeAssignmentId={selectedFeeAssignment.id}
                    balance={selectedFeeAssignment.totalBalance}
                    onSuccess={handlePaymentSuccess}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={openPaymentPlan} onOpenChange={setOpenPaymentPlan}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFeeAssignment(feeAssignments[0]);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Payment Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Payment Plan</DialogTitle>
                </DialogHeader>
                {selectedFeeAssignment && (
                  <PaymentPlanForm
                    feeAssignmentId={selectedFeeAssignment.id}
                    totalAmount={selectedFeeAssignment.totalBalance}
                    onSuccess={handlePaymentPlanSuccess}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={openExemption} onOpenChange={setOpenExemption}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFeeAssignment(feeAssignments[0]);
                  }}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Apply Exemption
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Apply Exemption</DialogTitle>
                </DialogHeader>
                {selectedFeeAssignment && (
                  <ExemptionForm
                    studentId={studentId}
                    feeAssignmentId={selectedFeeAssignment.id}
                    maxAmount={selectedFeeAssignment.totalBalance}
                    onSuccess={handleExemptionSuccess}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={handleSendReminder}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
          </div>

          {reminderSent && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">Reminder sent successfully</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session & Term</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.academicSession} - {assignment.term}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(assignment.totalAmount)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(assignment.totalPaid)}</TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {formatCurrency(assignment.totalBalance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(assignment.status)}>
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={openPayment && selectedFeeAssignment?.id === assignment.id} onOpenChange={setOpenPayment}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedFeeAssignment(assignment)}
                            >
                              Pay
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Record Payment</DialogTitle>
                            </DialogHeader>
                            <PaymentForm
                              studentId={studentId}
                              feeAssignmentId={assignment.id}
                              balance={assignment.totalBalance}
                              onSuccess={handlePaymentSuccess}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default QuickActions;
