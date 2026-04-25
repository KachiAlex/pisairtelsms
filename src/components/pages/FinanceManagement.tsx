import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Download, Send, Search, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Dashboard from './finance/Dashboard';
import FeeStructureConfig from './finance/FeeStructureConfig';
import StudentAccounts from './finance/StudentAccounts';
import PaymentProcessing from './finance/PaymentProcessing';
import Reconciliation from './finance/Reconciliation';
import ReportViewer from './finance/ReportViewer';
import AuditLog from './finance/AuditLog';

interface FeeRecord {
  id: string;
  studentName: string;
  admissionNo: string;
  class: string;
  feeType: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid';
  lastPaymentDate: string | null;
  academicSession: string;
  term: string;
  createdAt: string;
  updatedAt: string;
}

const revenueData = [
  { month: 'Aug', revenue: 4200000 },
  { month: 'Sep', revenue: 4800000 },
  { month: 'Oct', revenue: 3900000 },
  { month: 'Nov', revenue: 4500000 },
  { month: 'Dec', revenue: 3800000 },
  { month: 'Jan', revenue: 5200000 },
];

const recentTransactions = [
  { id: 'TXN001', student: 'Adewale Johnson', amount: 50000, method: 'Bank Transfer', date: '2026-02-14', time: '09:30 AM' },
  { id: 'TXN002', student: 'Chioma Okafor', amount: 25000, method: 'Cash', date: '2026-02-14', time: '10:15 AM' },
  { id: 'TXN003', student: 'Fatima Abdullahi', amount: 120000, method: 'Online Payment', date: '2026-02-13', time: '03:45 PM' },
  { id: 'TXN004', student: 'Emeka Onyeka', amount: 60000, method: 'Bank Transfer', date: '2026-02-13', time: '11:20 AM' },
];

export function FinanceManagement() {
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchFeeRecords();
  }, []);

  const fetchFeeRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tenant/finance');
      if (!response.ok) {
        throw new Error('Failed to fetch fee records');
      }
      const result = await response.json();
      setFeeRecords(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching fee records');
      setFeeRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = feeRecords.filter(record =>
    record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partial':
        return 'Partial';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const totalExpected = feeRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalCollected = feeRecords.reduce((sum, record) => sum + record.paid, 0);
  const totalOutstanding = totalExpected - totalCollected;

  const handleRecordPayment = () => {
    setActiveTab('payments');
  };

  const handleSendReminder = () => {
    // This would open a reminder dialog
    console.log('Send reminder clicked');
  };

  const handleViewDefaulters = () => {
    setActiveTab('reports');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Fee Management</h1>
          <p className="text-sm text-gray-600 mt-1">Track fee collection and financial transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            Send Reminder
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Unable to load fee records</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFeeRecords}
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
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expected</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpected)}</p>
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
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalCollected)}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0'}% collected
                  </p>
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
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalOutstanding)}</p>
                  <p className="text-sm text-orange-600 mt-1">
                    {feeRecords.filter(r => r.balance > 0).length} students
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today's Collection</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">₦75,000</p>
                  <p className="text-sm text-purple-600 mt-1">2 payments</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && feeRecords.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No fee records found</p>
            <p className="text-sm text-gray-500 mt-1">Fee records will appear here once they are created</p>
          </CardContent>
        </Card>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="fee-config">Fee Config</TabsTrigger>
          <TabsTrigger value="student-accounts">Student Accounts</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <Dashboard
            onRecordPayment={handleRecordPayment}
            onSendReminder={handleSendReminder}
            onViewDefaulters={handleViewDefaulters}
          />
        </TabsContent>

        {/* Fee Config Tab */}
        <TabsContent value="fee-config" className="space-y-4">
          <FeeStructureConfig />
        </TabsContent>

        {/* Student Accounts Tab */}
        <TabsContent value="student-accounts" className="space-y-4">
          <StudentAccounts />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <PaymentProcessing />
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Reconciliation />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <ReportViewer />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default FinanceManagement;
