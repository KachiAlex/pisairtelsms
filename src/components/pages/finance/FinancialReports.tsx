import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { financeApiGet } from '../../../lib/financeApi';

interface ReportData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface CategoryData {
  name: string;
  value: number;
}

export function FinancialReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      await financeApiGet('/api/tenant/finance/reports');
      // Simulated data for demonstration
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report data');
      setLoading(false);
    }
  };

  // Sample data
  const revenueData: ReportData[] = [
    { month: 'Jan', revenue: 4200000, expenses: 1200000, profit: 3000000 },
    { month: 'Feb', revenue: 4800000, expenses: 1400000, profit: 3400000 },
    { month: 'Mar', revenue: 3900000, expenses: 1100000, profit: 2800000 },
    { month: 'Apr', revenue: 4500000, expenses: 1300000, profit: 3200000 },
    { month: 'May', revenue: 3800000, expenses: 1000000, profit: 2800000 },
    { month: 'Jun', revenue: 5200000, expenses: 1500000, profit: 3700000 },
  ];

  const feeBreakdown: CategoryData[] = [
    { name: 'Tuition', value: 45 },
    { name: 'Accommodation', value: 25 },
    { name: 'Activities', value: 15 },
    { name: 'Other', value: 15 },
  ];

  const paymentMethods: CategoryData[] = [
    { name: 'Bank Transfer', value: 45 },
    { name: 'Online Payment', value: 35 },
    { name: 'Cash', value: 15 },
    { name: 'Cheque', value: 5 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const formatCurrency = (amount: number) => `₦${(amount / 1000000).toFixed(1)}M`;
  const formatCurrencyFull = (amount: number) => `₦${amount.toLocaleString()}`;

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = revenueData.reduce((sum, item) => sum + item.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalExpenses)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalProfit)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{profitMargin}%</p>
              </div>
              <PieChartIcon className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Error loading reports</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">Loading financial reports...</div>
          </CardContent>
        </Card>
      )}

      {/* Reports Tabs */}
      {!loading && !error && (
        <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Fee Breakdown</TabsTrigger>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Revenue Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    <Bar dataKey="expenses" fill="#f59e0b" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Breakdown */}
          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fee Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={feeBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {feeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feeBreakdown.map((item, index) => (
                <Card key={item.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{item.name}</p>
                        <p className="text-2xl font-bold mt-1">{item.value}%</p>
                      </div>
                      <div
                        className="w-12 h-12 rounded-lg"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="methods" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((item, index) => (
                <Card key={item.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{item.name}</p>
                        <p className="text-2xl font-bold mt-1">{item.value}%</p>
                      </div>
                      <div
                        className="w-12 h-12 rounded-lg"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Summary */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm text-gray-600">Total Revenue (6 months)</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrencyFull(totalRevenue)}</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <p className="text-sm text-gray-600">Total Expenses (6 months)</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrencyFull(totalExpenses)}</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm text-gray-600">Net Profit (6 months)</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrencyFull(totalProfit)}</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4">
                    <p className="text-sm text-gray-600">Profit Margin</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{profitMargin}%</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold text-gray-900 mb-4">Key Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Monthly Revenue</span>
                      <span className="font-semibold">{formatCurrencyFull(totalRevenue / 6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Monthly Expenses</span>
                      <span className="font-semibold">{formatCurrencyFull(totalExpenses / 6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Monthly Profit</span>
                      <span className="font-semibold">{formatCurrencyFull(totalProfit / 6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Highest Monthly Revenue</span>
                      <span className="font-semibold">{formatCurrencyFull(Math.max(...revenueData.map(r => r.revenue)))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Lowest Monthly Revenue</span>
                      <span className="font-semibold">{formatCurrencyFull(Math.min(...revenueData.map(r => r.revenue)))}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default FinancialReports;
