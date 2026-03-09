import React, { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Download, Send, Search } from 'lucide-react';
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

interface FeeRecord {
  id: string;
  studentName: string;
  admissionNo: string;
  class: string;
  feeType: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Overdue';
  lastPayment: string;
}

const mockFeeRecords: FeeRecord[] = [
  {
    id: '1',
    studentName: 'Adewale Johnson',
    admissionNo: 'SCH/2024/001',
    class: 'SS 3',
    feeType: 'Tuition',
    amount: 150000,
    paid: 150000,
    balance: 0,
    status: 'Paid',
    lastPayment: '2026-01-15',
  },
  {
    id: '2',
    studentName: 'Chioma Okafor',
    admissionNo: 'SCH/2024/002',
    class: 'SS 2',
    feeType: 'Tuition',
    amount: 150000,
    paid: 100000,
    balance: 50000,
    status: 'Partial',
    lastPayment: '2026-01-20',
  },
  {
    id: '3',
    studentName: 'Ibrahim Musa',
    admissionNo: 'SCH/2024/003',
    class: 'SS 3',
    feeType: 'Tuition',
    amount: 150000,
    paid: 0,
    balance: 150000,
    status: 'Overdue',
    lastPayment: 'N/A',
  },
  {
    id: '4',
    studentName: 'Blessing Eze',
    admissionNo: 'SCH/2024/004',
    class: 'JSS 1',
    feeType: 'Tuition',
    amount: 120000,
    paid: 120000,
    balance: 0,
    status: 'Paid',
    lastPayment: '2026-02-01',
  },
];

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
  const [feeRecords, setFeeRecords] = useState(mockFeeRecords);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = feeRecords.filter(record =>
    record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'Overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const totalExpected = feeRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalCollected = feeRecords.reduce((sum, record) => sum + record.paid, 0);
  const totalOutstanding = totalExpected - totalCollected;

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

      {/* Stats */}
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
                  {((totalCollected / totalExpected) * 100).toFixed(1)}% collected
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

      <Tabs defaultValue="fee-records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fee-records">Fee Records</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="fee-records" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by student name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Fee Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Fee Records ({filteredRecords.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.studentName}</TableCell>
                        <TableCell>{record.admissionNo}</TableCell>
                        <TableCell>{record.class}</TableCell>
                        <TableCell>{record.feeType}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.amount)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(record.paid)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(record.balance)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
                        </TableCell>
                        <TableCell>{record.lastPayment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
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
                      <TableHead>Time</TableHead>
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
                        <TableCell>{transaction.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { class: 'JSS 1', tuition: 120000, development: 20000, exam: 15000 },
              { class: 'JSS 2', tuition: 120000, development: 20000, exam: 15000 },
              { class: 'JSS 3', tuition: 130000, development: 20000, exam: 15000 },
              { class: 'SS 1', tuition: 150000, development: 25000, exam: 20000 },
              { class: 'SS 2', tuition: 150000, development: 25000, exam: 20000 },
              { class: 'SS 3', tuition: 160000, development: 25000, exam: 20000 },
            ].map((fee, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{fee.class}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tuition Fee</span>
                      <span className="font-medium">{formatCurrency(fee.tuition)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Development Levy</span>
                      <span className="font-medium">{formatCurrency(fee.development)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exam Fee</span>
                      <span className="font-medium">{formatCurrency(fee.exam)}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(fee.tuition + fee.development + fee.exam)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default FinanceManagement;
