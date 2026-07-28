import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Printer, Mail } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { financeApiGet, financeApiPost } from '../../../lib/financeApi';

interface Receipt {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  balance: number;
  recordedBy: string;
}

interface ReceiptGeneratorProps {
  onClose?: () => void;
}

export function ReceiptGenerator({ onClose }: ReceiptGeneratorProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Fetch receipts
  useEffect(() => {
    const fetchReceipts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await financeApiGet('/api/tenant/finance/payments');
        if (!response.ok) {
          throw new Error('Failed to fetch receipts');
        }

        const data = await response.json();
        const receiptsData = (data.data || []).map((payment: any) => ({
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          studentName: payment.studentName,
          studentId: payment.studentId,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          balance: payment.balance || 0,
          recordedBy: payment.recordedBy,
        }));
        setReceipts(receiptsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const filteredReceipts = receipts.filter((receipt) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      receipt.studentName.toLowerCase().includes(searchLower) ||
      receipt.receiptNumber.toLowerCase().includes(searchLower) ||
      receipt.studentId.toLowerCase().includes(searchLower)
    );
  });

  const handlePrint = () => {
    if (!selectedReceipt) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${selectedReceipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .label { font-weight: 500; }
          .value { text-align: right; }
          .total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>PAYMENT RECEIPT</h1>
            <p>Receipt #: ${selectedReceipt.receiptNumber}</p>
          </div>

          <div class="section">
            <div class="section-title">Student Information</div>
            <div class="row">
              <span class="label">Name:</span>
              <span class="value">${selectedReceipt.studentName}</span>
            </div>
            <div class="row">
              <span class="label">Student ID:</span>
              <span class="value">${selectedReceipt.studentId}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Payment Details</div>
            <div class="row">
              <span class="label">Amount Paid:</span>
              <span class="value">₦${selectedReceipt.amount.toLocaleString()}</span>
            </div>
            <div class="row">
              <span class="label">Payment Method:</span>
              <span class="value">${selectedReceipt.paymentMethod.replace('_', ' ')}</span>
            </div>
            <div class="row">
              <span class="label">Reference Number:</span>
              <span class="value">${selectedReceipt.referenceNumber}</span>
            </div>
            <div class="row">
              <span class="label">Payment Date:</span>
              <span class="value">${new Date(selectedReceipt.paymentDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Balance</div>
            <div class="row total">
              <span class="label">Outstanding Balance:</span>
              <span class="value">₦${selectedReceipt.balance.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p>This is an official receipt. Please keep it for your records.</p>
            <p>Recorded by: ${selectedReceipt.recordedBy}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmailReceipt = async () => {
    if (!selectedReceipt) return;

    setEmailLoading(true);
    setError(null);

    try {
      const response = await financeApiPost(`/api/tenant/finance/payments/${selectedReceipt.id}/receipt`, {
        action: 'email',
      });

      if (!response.ok) {
        throw new Error('Failed to email receipt');
      }

      alert('Receipt emailed successfully to guardian');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to email receipt');
    } finally {
      setEmailLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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

      {/* Search */}
      <div>
        <Label htmlFor="search">Search Receipts</Label>
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

      {/* Receipts List */}
      {!loading && filteredReceipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Receipts ({filteredReceipts.length})</CardTitle>
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
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{receipt.studentName}</p>
                          <p className="text-xs text-gray-500">{receipt.studentId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(receipt.amount)}</TableCell>
                      <TableCell>{formatDate(receipt.paymentDate)}</TableCell>
                      <TableCell className="capitalize">{receipt.paymentMethod.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReceipt(receipt);
                            setShowPreview(true);
                          }}
                        >
                          View
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
      {!loading && filteredReceipts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No receipts found</p>
        </div>
      )}

      {/* Receipt Preview */}
      {showPreview && selectedReceipt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipt Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Receipt Display */}
            <div className="border rounded-lg p-6 bg-gray-50 space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">PAYMENT RECEIPT</h2>
                <p className="text-gray-600">Receipt #: {selectedReceipt.receiptNumber}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Student Name</p>
                  <p className="font-medium">{selectedReceipt.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Student ID</p>
                  <p className="font-medium">{selectedReceipt.studentId}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-bold">{formatCurrency(selectedReceipt.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{selectedReceipt.paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-medium">{selectedReceipt.referenceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Date:</span>
                  <span className="font-medium">{formatDate(selectedReceipt.paymentDate)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Outstanding Balance:</span>
                  <span className="text-blue-600">{formatCurrency(selectedReceipt.balance)}</span>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500 pt-4 border-t">
                <p>This is an official receipt. Please keep it for your records.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button
                onClick={handleEmailReceipt}
                disabled={emailLoading}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                {emailLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Email to Guardian
              </Button>
              <Button
                onClick={() => setShowPreview(false)}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ReceiptGenerator;
