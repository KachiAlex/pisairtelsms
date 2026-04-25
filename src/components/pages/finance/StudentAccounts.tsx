import { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { FeeLedger } from './FeeLedger';
import { QuickActions } from './QuickActions';
import { FeeAdjustmentForm } from './FeeAdjustmentForm';
import { ExemptionManagement } from './ExemptionManagement';

interface Student {
  id: string;
  admissionNo: string;
  name: string;
  class: string;
  arm: string;
  status: string;
}

interface FeeAssignment {
  id: string;
  studentId: string;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  status: 'pending' | 'partial' | 'paid';
  dueDate: string;
  academicSession: string;
  term: string;
}

interface StudentAccountsProps {
  onRecordPayment?: (studentId: string, feeAssignmentId: string) => void;
  onCreatePaymentPlan?: (feeAssignmentId: string) => void;
  onApplyExemption?: (feeAssignmentId: string) => void;
  onSendReminder?: (studentId: string) => void;
}

export function StudentAccounts({
  onRecordPayment,
  onCreatePaymentPlan,
  onApplyExemption,
  onSendReminder,
}: StudentAccountsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [feeAssignments, setFeeAssignments] = useState<Map<string, FeeAssignment[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudentsAndFees();
  }, []);

  const fetchStudentsAndFees = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentsResponse = await fetch('/api/tenant/students');
      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students');
      }
      const studentsData = await studentsResponse.json();
      setStudents(studentsData.data || []);

      // Fetch fee assignments for all students
      const feesResponse = await fetch('/api/tenant/finance/fee-assignments');
      if (!feesResponse.ok) {
        throw new Error('Failed to fetch fee assignments');
      }
      const feesData = await feesResponse.json();
      const feesByStudent = new Map<string, FeeAssignment[]>();
      (feesData.data || []).forEach((fee: FeeAssignment) => {
        if (!feesByStudent.has(fee.studentId)) {
          feesByStudent.set(fee.studentId, []);
        }
        feesByStudent.get(fee.studentId)!.push(fee);
      });
      setFeeAssignments(feesByStudent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !classFilter || student.class === classFilter;
    return matchesSearch && matchesClass;
  });

  const getStudentFees = (studentId: string) => {
    return feeAssignments.get(studentId) || [];
  };

  const getStudentSummary = (studentId: string) => {
    const fees = getStudentFees(studentId);
    return {
      totalFees: fees.reduce((sum, f) => sum + f.totalAmount, 0),
      totalPaid: fees.reduce((sum, f) => sum + f.totalPaid, 0),
      totalBalance: fees.reduce((sum, f) => sum + f.totalBalance, 0),
      overdue: fees.filter(f => new Date(f.dueDate) < new Date()).reduce((sum, f) => sum + f.totalBalance, 0),
    };
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      partial: 'secondary',
      pending: 'destructive',
    };
    return variants[status] || 'outline';
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getUniqueClasses = () => {
    return [...new Set(students.map(s => s.class))].sort();
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
    </TableRow>
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
                  <p className="font-medium text-red-900">Unable to load student accounts</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStudentsAndFees}
                className="border-red-300 hover:bg-red-100"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedStudent ? (
        <>
          {/* Search and Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or admission number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Filter className="w-4 h-4 text-gray-600 mt-3" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Classes</option>
                    {getUniqueClasses().map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Accounts ({filteredStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Total Fees</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5].map(i => (
                        <SkeletonRow key={i} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No students found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Total Fees</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => {
                        const summary = getStudentSummary(student.id);
                        const fees = getStudentFees(student.id);
                        const overallStatus = fees.length === 0 ? 'pending' : 
                          fees.every(f => f.status === 'paid') ? 'paid' :
                          fees.some(f => f.status === 'paid') ? 'partial' : 'pending';

                        return (
                          <TableRow key={student.id} className="cursor-pointer hover:bg-gray-50">
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.admissionNo}</TableCell>
                            <TableCell>{student.class} {student.arm}</TableCell>
                            <TableCell className="text-right">{formatCurrency(summary.totalFees)}</TableCell>
                            <TableCell className="text-right font-medium text-orange-600">
                              {formatCurrency(summary.totalBalance)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadge(overallStatus)}>
                                {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedStudent(student)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Student Detail View */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
              <p className="text-gray-600 text-sm mt-1">
                Admission No: {selectedStudent.admissionNo} | Class: {selectedStudent.class} {selectedStudent.arm}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStudent(null);
              }}
            >
              Back to List
            </Button>
          </div>

          {/* Fee Summary Cards */}
          {(() => {
            const summary = getStudentSummary(selectedStudent.id);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Fees</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalFees)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.totalPaid)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Balance</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(summary.totalBalance)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.overdue)}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Tabs for Ledger and Actions */}
          <Tabs defaultValue="ledger" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="ledger">Fee Ledger</TabsTrigger>
              <TabsTrigger value="actions">Quick Actions</TabsTrigger>
              <TabsTrigger value="adjustment">Fee Adjustment</TabsTrigger>
              <TabsTrigger value="exemptions">Exemptions</TabsTrigger>
            </TabsList>

            <TabsContent value="ledger" className="space-y-4">
              <FeeLedger studentId={selectedStudent.id} />
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <QuickActions
                studentId={selectedStudent.id}
                feeAssignments={getStudentFees(selectedStudent.id)}
                onRecordPayment={onRecordPayment}
                onCreatePaymentPlan={onCreatePaymentPlan}
                onApplyExemption={onApplyExemption}
                onSendReminder={onSendReminder}
              />
            </TabsContent>

            <TabsContent value="adjustment" className="space-y-4">
              <FeeAdjustmentForm
                studentId={selectedStudent.id}
                feeAssignments={getStudentFees(selectedStudent.id)}
                onSuccess={() => {
                  fetchStudentsAndFees();
                }}
              />
            </TabsContent>

            <TabsContent value="exemptions" className="space-y-4">
              {getStudentFees(selectedStudent.id).length > 0 && (
                <ExemptionManagement
                  studentId={selectedStudent.id}
                  feeAssignmentId={getStudentFees(selectedStudent.id)[0].id}
                  maxAmount={getStudentFees(selectedStudent.id)[0].totalBalance}
                  onExemptionApplied={() => {
                    fetchStudentsAndFees();
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default StudentAccounts;
