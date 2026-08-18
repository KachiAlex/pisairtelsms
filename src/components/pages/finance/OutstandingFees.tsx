import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { financeApiGet } from '../../../lib/financeApi';

interface OutstandingFee {
  id: string;
  studentName: string;
  admissionNo: string;
  class: string;
  feeType: string;
  amount: number;
  paid: number;
  balance: number;
  daysOverdue: number;
  lastPaymentDate: string | null;
  academicSession: string;
  term: string;
}

export function OutstandingFees() {
  const [fees, setFees] = useState<OutstandingFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [sortBy, setSortBy] = useState<'balance' | 'daysOverdue'>('balance');

  useEffect(() => {
    fetchOutstandingFees();
  }, []);

  const fetchOutstandingFees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApiGet('/api/tenant/finance/fee-assignments?status=outstanding');
      const json = await res.json();
      setFees(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch outstanding fees');
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFees = fees
    .filter(fee => {
      const searchLower = searchTerm.toLowerCase();
      return (
        fee.studentName.toLowerCase().includes(searchLower) ||
        fee.admissionNo.toLowerCase().includes(searchLower)
      );
    })
    .filter(fee => filterClass === 'all' || fee.class === filterClass)
    .sort((a, b) => {
      if (sortBy === 'balance') return b.balance - a.balance;
      return b.daysOverdue - a.daysOverdue;
    });

  const totalOutstanding = fees.reduce((sum, fee) => sum + fee.balance, 0);
  const totalStudents = fees.length;
  const criticalOverdue = fees.filter(f => f.daysOverdue > 90).length;

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const getOverdueColor = (days: number) => {
    if (days > 90) return 'bg-red-100 text-red-800';
    if (days > 30) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getOverdueLabel = (days: number) => {
    if (days > 90) return `${days} days (Critical)`;
    if (days > 30) return `${days} days (Urgent)`;
    return `${days} days`;
  };

  const classes = [...new Set(fees.map(f => f.class))];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalOutstanding)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Students with Outstanding</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{totalStudents}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical (90+ days)</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{criticalOverdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search by student name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Filter by Class</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'balance' | 'daysOverdue')}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="balance">Highest Balance</option>
                  <option value="daysOverdue">Most Overdue</option>
                </select>
              </div>
            </div>
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
                <p className="font-medium text-red-900">Error loading outstanding fees</p>
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
            <div className="animate-pulse">Loading outstanding fees...</div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Fees Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No outstanding fees found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Last Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFees.map(fee => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.studentName}</TableCell>
                        <TableCell>{fee.admissionNo}</TableCell>
                        <TableCell>{fee.class}</TableCell>
                        <TableCell>{fee.feeType}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fee.amount)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(fee.paid)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">{formatCurrency(fee.balance)}</TableCell>
                        <TableCell>
                          <Badge className={getOverdueColor(fee.daysOverdue)}>
                            {getOverdueLabel(fee.daysOverdue)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {fee.lastPaymentDate
                            ? new Date(fee.lastPaymentDate).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OutstandingFees;
