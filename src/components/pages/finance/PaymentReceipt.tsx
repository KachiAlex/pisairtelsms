import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Printer, Download, X } from 'lucide-react';

interface PaymentReceiptProps {
  payment: {
    id: string;
    receiptNumber: string;
    paymentDate: string;
    amount: number;
    paymentMethod: string;
    status: string;
    studentName?: string;
    feeDescription?: string;
    gateway?: string | null;
    paidAt?: string | null;
    notes?: string | null;
  };
  open: boolean;
  onClose: () => void;
}

export function PaymentReceipt({ payment, open, onClose }: PaymentReceiptProps) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 200);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const receiptContent = (
    <div className="receipt-print-area bg-white p-8 max-w-lg mx-auto border border-gray-200 rounded-lg shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">PAYMENT RECEIPT</h2>
        <p className="text-sm text-gray-500 mt-1">ScholarX Education Management System</p>
        <div className="mt-4 inline-block px-4 py-1 bg-green-50 border border-green-200 rounded-full">
          <span className="text-sm font-semibold text-green-700 uppercase tracking-wide">{payment.status}</span>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Receipt No:</span>
          <span className="font-mono font-semibold text-gray-900">{payment.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Transaction ID:</span>
          <span className="font-mono text-gray-900">{payment.id}</span>
        </div>
        {payment.studentName && (
          <div className="flex justify-between">
            <span className="text-gray-600">Student:</span>
            <span className="font-medium text-gray-900">{payment.studentName}</span>
          </div>
        )}
        {payment.feeDescription && (
          <div className="flex justify-between">
            <span className="text-gray-600">Description:</span>
            <span className="font-medium text-gray-900">{payment.feeDescription}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Payment Date:</span>
          <span className="font-medium text-gray-900">{formatDate(payment.paymentDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Payment Method:</span>
          <span className="font-medium text-gray-900 capitalize">{payment.paymentMethod.replace(/_/g, ' ')}</span>
        </div>
        {payment.gateway && (
          <div className="flex justify-between">
            <span className="text-gray-600">Gateway:</span>
            <span className="font-medium text-gray-900 capitalize">{payment.gateway}</span>
          </div>
        )}
        {payment.paidAt && (
          <div className="flex justify-between">
            <span className="text-gray-600">Confirmed At:</span>
            <span className="font-medium text-gray-900">{new Date(payment.paidAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-600">Total Amount:</span>
          <span className="text-3xl font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
        </div>
      </div>

      {payment.notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Notes:</span> {payment.notes}
          </p>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-gray-400">
        <p>This is an electronically generated receipt.</p>
        <p>Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>
        {receiptContent}
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={printing}>
            <Printer className="w-4 h-4 mr-2" />
            {printing ? 'Printing...' : 'Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentReceipt;
