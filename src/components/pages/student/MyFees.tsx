import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, CreditCard } from 'lucide-react';
import { Button } from '../../ui/button';

interface FeeSummary {
  totalFees: number;
  paidAmount: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
}

interface Payment {
  date: string;
  amount: number;
  method: string;
  reference: string;
  receipt: string;
}

interface FeesData {
  summary: FeeSummary;
  payments: Payment[];
  paymentPlan: { id: string; installments: number; dueDate: string; amount: number } | null;
}

const statusConfig = {
  paid: { label: 'Fully Paid', color: 'text-green-700 bg-green-50 border-green-200' },
  partial: { label: 'Partially Paid', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  unpaid: { label: 'Unpaid', color: 'text-red-700 bg-red-50 border-red-200' },
};

export function MyFees() {
  const [data, setData] = useState<FeesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const auth = localStorage.getItem('auth');
        if (!auth) { setError('Not authenticated'); return; }
        const { token } = JSON.parse(auth);
        const res = await fetch('/api/student/fees', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch fees');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFees();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fees & Payments</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-48 animate-pulse rounded-lg bg-gray-200" />
        </div>
      ) : data && (
        <>
          {/* Summary */}
          <div className={`rounded-lg border p-6 ${statusConfig[data.summary.status].color}`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig[data.summary.status].color}`}>
                  {statusConfig[data.summary.status].label}
                </span>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm opacity-70">Total Fees</p>
                    <p className="text-2xl font-bold">₦{data.summary.totalFees.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-70">Amount Paid</p>
                    <p className="text-2xl font-bold">₦{data.summary.paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-70">Balance</p>
                    <p className="text-2xl font-bold">₦{data.summary.balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <CreditCard className="h-8 w-8 opacity-40" />
            </div>
            {data.summary.balance > 0 && (
              <p className="mt-4 text-sm opacity-80">Due date: {data.summary.dueDate}</p>
            )}
          </div>

          {/* Payment history */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Payment History</h2>
            </div>
            {data.payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No payments recorded</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.payments.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{p.date}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">₦{p.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">{p.method}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.reference}</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="sm" className="gap-1 text-xs">
                            <Download className="h-3 w-3" />
                            {p.receipt}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MyFees;
