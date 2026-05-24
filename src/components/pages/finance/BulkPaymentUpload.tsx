import React, { useState } from 'react';
import { Loader, AlertCircle, Download, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { financeApiPost } from '../../../lib/financeApi';

interface PaymentRecord {
  studentId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  receiptNumber: string;
  paymentDate: string;
  paymentTime: string;
  recordedBy: string;
  notes?: string;
}

interface BulkPaymentUploadProps {
  onSuccess?: () => void;
}

export function BulkPaymentUpload({ onSuccess }: BulkPaymentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<PaymentRecord[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      'student_id',
      'amount',
      'payment_method',
      'reference_number',
      'receipt_number',
      'payment_date',
      'payment_time',
      'recorded_by',
      'notes',
    ];

    const csv = [
      headers.join(','),
      'STU001,50000,bank_transfer,TXN123456,RCP001,2025-01-15,09:30:00,John Doe,',
      'STU002,75000,cash,CASH001,RCP002,2025-01-15,10:00:00,John Doe,',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): PaymentRecord[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain header and at least one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const records: PaymentRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values.length < 8 || values.every((v) => !v)) continue;

      const record: PaymentRecord = {
        studentId: values[headers.indexOf('student_id')] || '',
        amount: parseFloat(values[headers.indexOf('amount')] || '0'),
        paymentMethod: values[headers.indexOf('payment_method')] || '',
        referenceNumber: values[headers.indexOf('reference_number')] || '',
        receiptNumber: values[headers.indexOf('receipt_number')] || '',
        paymentDate: values[headers.indexOf('payment_date')] || '',
        paymentTime: values[headers.indexOf('payment_time')] || '',
        recordedBy: values[headers.indexOf('recorded_by')] || '',
        notes: values[headers.indexOf('notes')] || undefined,
      };

      records.push(record);
    }

    return records;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setSuccess(null);
    setShowPreview(false);

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    try {
      const text = await selectedFile.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        setError('No valid payment records found in CSV');
        return;
      }

      // Validate records
      const validationErrors: string[] = [];
      records.forEach((record, idx) => {
        if (!record.studentId) validationErrors.push(`Row ${idx + 2}: Missing student_id`);
        if (!record.amount || record.amount <= 0) validationErrors.push(`Row ${idx + 2}: Invalid amount`);
        if (!record.paymentMethod) validationErrors.push(`Row ${idx + 2}: Missing payment_method`);
        if (!record.referenceNumber) validationErrors.push(`Row ${idx + 2}: Missing reference_number`);
        if (!record.receiptNumber) validationErrors.push(`Row ${idx + 2}: Missing receipt_number`);
        if (!record.paymentDate) validationErrors.push(`Row ${idx + 2}: Missing payment_date`);
        if (!record.paymentTime) validationErrors.push(`Row ${idx + 2}: Missing payment_time`);
        if (!record.recordedBy) validationErrors.push(`Row ${idx + 2}: Missing recorded_by`);
      });

      if (validationErrors.length > 0) {
        setError(`Validation errors:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n... and ${validationErrors.length - 5} more` : ''}`);
        return;
      }

      setFile(selectedFile);
      setPreview(records);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }
  };

  const handleSubmit = async () => {
    if (!file || preview.length === 0) {
      setError('Please select and validate a CSV file first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await financeApiPost('/api/tenant/finance/payments?action=bulk', {
        payments: preview,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload payments');
      }

      const data = await response.json();
      setSuccess(`Successfully uploaded ${data.data.length} payments`);
      setFile(null);
      setPreview([]);
      setShowPreview(false);

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
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
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Download Template */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={downloadTemplate}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download CSV Template
        </Button>
      </div>

      {/* File Upload */}
      <div>
        <Label htmlFor="csvFile">Upload CSV File</Label>
        <Input
          id="csvFile"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mt-1"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Upload a CSV file with payment records. Download the template to see the required format.
        </p>
      </div>

      {/* Preview */}
      {showPreview && preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview ({preview.length} payments)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 10).map((payment, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{payment.studentId}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="capitalize">{payment.paymentMethod.replace('_', ' ')}</TableCell>
                      <TableCell className="text-sm text-gray-600">{payment.referenceNumber}</TableCell>
                      <TableCell className="text-sm text-gray-600">{payment.receiptNumber}</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {preview.length > 10 && (
              <p className="text-sm text-gray-600">
                ... and {preview.length - 10} more payments
              </p>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                Total: {formatCurrency(preview.reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Uploading...' : 'Submit Payments'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BulkPaymentUpload;
