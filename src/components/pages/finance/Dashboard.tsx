import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Send, Eye, RotateCcw } from 'lucide-react';
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
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { financeApiGet } from '../../../lib/financeApi';

interface CollectionSummary {
  target: number;
  actual: number;
  rate: number;
  outstanding: number;
  byClass: Array<{ class: string; target: number; actual: number; rate: number }>;
  byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
}

interface DashboardProps {
  onRecordPayment?: () => void;
  onSendReminder?: () => void;
  onViewDefaulters?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const trendData = [
  { date: 'Feb 1', amount: 50000 },
  { date: 'Feb 2', amount: 75000 },
  { date: 'Feb 3', amount: 60000 },
  { date: 'Feb 4', amount: 85000 },
  { date: 'Feb 5', amount: 70000 },
  { date: 'Feb 6', amount: 95000 },
  { date: 'Feb 7', amount: 80000 },
];

const recentTransactions = [
  { id: 'TXN001', student: 'Adewale Johnson', amount: 50000, method: 'Bank Transfer', date: '2026-02-14' },
  { id: 'TXN002', student: 'Chioma Okafor', amount: 25000, method: 'Cash', date: '2026-02-14' },
  { id: 'TXN003', student: 'Fatima Abdullahi', amount: 120000, method: 'Online Payment', date: '2026-02-13' },
  { id: 'TXN004', student: 'Emeka Onyeka', amount: 60000, method: 'Bank Transfer', date: '2026-02-13' },
];

export function Dashboard({ onRecordPayment, onSendReminder, onViewDefaulters }: DashboardProps) {
  const [data, setData] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollectionSummary();
  }, []);

  const fetchCollectionSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeApiGet('/api/tenant/finance/reports?report=collection-summary');
      if (!response.ok) {
        throw new Error('Failed to fetch collection summary');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
      online: 'Online Payment',
      check: 'Check',
      mobile_money: 'Mobile Money',
    };
    return labels[method] || method;
  };

  // Skeleton Loader Component
  const SkeletonCard = () => (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Unable to load dashboard</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCollectionSummary}
                className="border-red-300 hover:bg-red-100"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Metrics Cards */}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Target</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.target)}</p>
                    <p className="text-sm text-gray-500 mt-1">This Term</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Actual</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(data.actual)}</p>
                    <p className="text-sm text-green-600 mt-1">{data.rate}% collected</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Rate</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{data.rate}%</p>
                    <p className="text-sm text-blue-600 mt-1">Collection Rate</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(data.outstanding)}</p>
                    <p className="text-sm text-orange-600 mt-1">Pending</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={onRecordPayment}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
            <Button
              variant="outline"
              onClick={onSendReminder}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
            <Button
              variant="outline"
              onClick={onViewDefaulters}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Defaulters
            </Button>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} name="Collections" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Method Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.byPaymentMethod}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ method, amount }) => `${getMethodLabel(method)}: ${formatCurrency(amount)}`}
                    >
                      {data.byPaymentMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.id}</TableCell>
                        <TableCell>{transaction.student}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>{transaction.method}</TableCell>
                        <TableCell>{transaction.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && !data && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No data available</p>
            <p className="text-sm text-gray-500 mt-1">Dashboard data will appear here once available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Dashboard;
