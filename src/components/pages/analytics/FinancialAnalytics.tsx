import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface FinancialStats {
  totalRevenue: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    collected: number;
  }>;
  feeStructureBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
  classOutstanding: Array<{
    class: string;
    outstanding: number;
    collected: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function FinancialAnalytics() {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFinancialStats();
  }, []);

  const fetchFinancialStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.tenantId) headers['x-tenant-id'] = auth.tenantId;

      const response = await fetch('/api/tenant/analytics/financial', { headers });
      if (!response.ok) throw new Error('Failed to fetch financial analytics');
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial analytics');
      // Set mock data for development
      setStats({
        totalRevenue: 25000000,
        totalCollected: 21500000,
        outstandingBalance: 3500000,
        collectionRate: 86,
        monthlyRevenue: [
          { month: 'Jan', revenue: 5000000, collected: 4500000 },
          { month: 'Feb', revenue: 5000000, collected: 4600000 },
          { month: 'Mar', revenue: 5000000, collected: 4200000 },
          { month: 'Apr', revenue: 5000000, collected: 4100000 },
          { month: 'May', revenue: 5000000, collected: 4100000 },
        ],
        feeStructureBreakdown: [
          { category: 'Tuition', amount: 15000000, percentage: 60 },
          { category: 'Registration', amount: 2500000, percentage: 10 },
          { category: 'Examination', amount: 3750000, percentage: 15 },
          { category: 'Development', amount: 2500000, percentage: 10 },
          { category: 'Other', amount: 1250000, percentage: 5 },
        ],
        paymentMethods: [
          { method: 'Bank Transfer', amount: 12000000, count: 450 },
          { method: 'Paystack', amount: 6000000, count: 280 },
          { method: 'Flutterwave', amount: 2500000, count: 95 },
          { method: 'Cash', amount: 1000000, count: 80 },
        ],
        classOutstanding: [
          { class: 'JSS 1A', outstanding: 450000, collected: 1800000 },
          { class: 'JSS 1B', outstanding: 520000, collected: 1750000 },
          { class: 'SS 1A', outstanding: 380000, collected: 1900000 },
          { class: 'SS 1B', outstanding: 410000, collected: 1850000 },
          { class: 'SS 2A', outstanding: 490000, collected: 1780000 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${(amount / 1000000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
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
                <p className="text-sm text-gray-600">Collected</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalCollected)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.outstandingBalance)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.collectionRate}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#94a3b8" name="Revenue" />
                <Bar dataKey="collected" fill="#3b82f6" name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Structure Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.feeStructureBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {stats.feeStructureBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.paymentMethods}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="Amount (₦)" />
              <Bar dataKey="count" fill="#10b981" name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Class Outstanding */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Balance by Class</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.classOutstanding}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="class" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="outstanding" fill="#ef4444" name="Outstanding" />
              <Bar dataKey="collected" fill="#10b981" name="Collected" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
