import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, BookOpen, Calendar, Award, Loader2, DollarSign, AlertCircle, CheckCircle, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const formatCurrency = (amount: number) => {
  return `₦${(amount / 1000000).toFixed(1)}M`;
};

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [academicData, setAcademicData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [studentProgressData, setStudentProgressData] = useState<any>(null);
  const [teacherPerformanceData, setTeacherPerformanceData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);

  const fetchWithAuth = async (url: string) => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
        const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch data');
    return response.json();
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [academic, performance, studentProgress, teacherPerformance, attendance, financial] = await Promise.allSettled([
        fetchWithAuth('/api/tenant/analytics/academic'),
        fetchWithAuth('/api/tenant/analytics/performance'),
        fetchWithAuth('/api/tenant/analytics/student-progress'),
        fetchWithAuth('/api/tenant/analytics/teacher-performance'),
        fetchWithAuth('/api/tenant/attendance/analytics/dashboard'),
        fetchWithAuth('/api/tenant/analytics/financial'),
      ]);

      if (academic.status === 'fulfilled') setAcademicData(academic.value.data);
      if (performance.status === 'fulfilled') setPerformanceData(performance.value.data);
      if (studentProgress.status === 'fulfilled') setStudentProgressData(studentProgress.value.data);
      if (teacherPerformance.status === 'fulfilled') setTeacherPerformanceData(teacherPerformance.value.data);
      if (attendance.status === 'fulfilled') setAttendanceData(attendance.value.data);
      if (financial.status === 'fulfilled') setFinancialData(financial.value.data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  if (loading && !academicData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-sm text-gray-600 mt-1">Comprehensive academic and operational insights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="student-progress">Student Progress</TabsTrigger>
          <TabsTrigger value="teacher-performance">Teacher Performance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewTab data={{ academic: academicData, performance: performanceData, attendance: attendanceData, financial: financialData }} />
        </TabsContent>

        {/* Academic Tab */}
        <TabsContent value="academic">
          <AcademicTab data={academicData} loading={loading} onRefresh={loadAllData} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <PerformanceTab data={performanceData} loading={loading} onRefresh={loadAllData} />
        </TabsContent>

        {/* Student Progress Tab */}
        <TabsContent value="student-progress">
          <StudentProgressTab data={studentProgressData} loading={loading} onRefresh={loadAllData} />
        </TabsContent>

        {/* Teacher Performance Tab */}
        <TabsContent value="teacher-performance">
          <TeacherPerformanceTab data={teacherPerformanceData} loading={loading} onRefresh={loadAllData} />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <AttendanceTab data={attendanceData} loading={loading} onRefresh={loadAllData} />
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial">
          <FinancialTab data={financialData} loading={loading} onRefresh={loadAllData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data }: { data: any }) {
  const { academic, performance, attendance, financial } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{academic?.averageScore || 0}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{academic?.passRate || 0}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Attendance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{attendance?.overallAttendanceRate || 0}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{financial?.collectionRate || 0}%</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{academic?.totalStudents || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">At-Risk Students</p>
            <p className="text-2xl font-bold text-gray-900">{performance?.atRiskStudents || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{financial ? formatCurrency(financial.totalRevenue) : '₦0M'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Academic Tab Component
function AcademicTab({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No academic data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Students</p><p className="text-2xl font-bold">{data.totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Subjects</p><p className="text-2xl font-bold">{data.totalSubjects}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Average Score</p><p className="text-2xl font-bold">{data.averageScore}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Pass Rate</p><p className="text-2xl font-bold">{data.passRate}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Subject Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score %" />
                <Bar dataKey="passRate" fill="#10b981" name="Pass Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Class Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.classPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score %" />
                <Bar dataKey="passRate" fill="#10b981" name="Pass Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Performance Tab Component
function PerformanceTab({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No performance data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Overall Average</p><p className="text-2xl font-bold">{data.overallAverage}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Pass Rate</p><p className="text-2xl font-bold">{data.overallPassRate}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Top Performers</p><p className="text-2xl font-bold">{data.topPerformers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">At-Risk Students</p><p className="text-2xl font-bold">{data.atRiskStudents}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.termTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="term" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={2} name="Average %" />
                <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} name="Pass Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Number of Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Student Progress Tab Component
function StudentProgressTab({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No student progress data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Students</p><p className="text-2xl font-bold">{data.totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Improving</p><p className="text-2xl font-bold text-green-600">{data.improvingStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Declining</p><p className="text-2xl font-bold text-red-600">{data.decliningStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Stable</p><p className="text-2xl font-bold">{data.stableStudents}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Progress by Class</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.progressByClass}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageImprovement" fill="#3b82f6" name="Avg Improvement %" />
                <Bar dataKey="studentsOnTrack" fill="#10b981" name="On Track" />
                <Bar dataKey="studentsBehind" fill="#ef4444" name="Behind" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risk Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.riskCategories.map((cat: any) => (
                <div key={cat.category} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{cat.category}</p>
                  <p className="text-2xl font-bold">{cat.count}</p>
                  <p className="text-sm text-gray-500">{cat.percentage}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Teacher Performance Tab Component
function TeacherPerformanceTab({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No teacher performance data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Teachers</p><p className="text-2xl font-bold">{data.totalTeachers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Average Rating</p><p className="text-2xl font-bold">{data.averageRating}/5</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Top Performers</p><p className="text-2xl font-bold">{data.topPerformers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Needs Improvement</p><p className="text-2xl font-bold">{data.needsImprovement}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="averageRating" stroke="#3b82f6" strokeWidth={2} name="Avg Rating" />
                <Line type="monotone" dataKey="studentSatisfaction" stroke="#10b981" strokeWidth={2} name="Student Satisfaction %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Teacher Ranking</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.teacherRanking.map((teacher: any, index: number) => (
                <div key={teacher.teacher} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>{index + 1}</div>
                    <div>
                      <p className="font-medium">{teacher.teacher}</p>
                      <p className="text-sm text-gray-600">{teacher.subject}</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg text-blue-600">{teacher.rating}/5</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Attendance Tab Component
function AttendanceTab({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No attendance data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Overall Attendance</p><p className="text-2xl font-bold">{data.overallAttendanceRate}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Present Today</p><p className="text-2xl font-bold">{data.presentToday}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Absent Today</p><p className="text-2xl font-bold">{data.absentToday}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Late Today</p><p className="text-2xl font-bold">{data.lateToday}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendanceRate" stroke="#3b82f6" strokeWidth={2} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Class Attendance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.classAttendance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendanceRate" fill="#3b82f6" name="Attendance %" />
                <Bar dataKey="present" fill="#10b981" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Financial Tab Component
function FinancialTab({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No financial data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Revenue</p><p className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Collected</p><p className="text-2xl font-bold">{formatCurrency(data.totalCollected)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Outstanding</p><p className="text-2xl font-bold">{formatCurrency(data.outstandingBalance)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Collection Rate</p><p className="text-2xl font-bold">{data.collectionRate}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyRevenue}>
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
          <CardHeader><CardTitle>Fee Structure Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.feeStructureBreakdown} cx="50%" cy="50%" labelLine={false} label={({ category, percentage }) => `${category} (${percentage}%)`} outerRadius={80} fill="#8884d8" dataKey="amount">
                  {data.feeStructureBreakdown.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
