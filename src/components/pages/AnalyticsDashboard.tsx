import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { DashboardFilters } from './analytics/DashboardFilters';
import type { AnalyticsFilters } from '../../hooks/useAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { OverviewTab } from './analytics/tabs/OverviewTab';
import { AcademicTab } from './analytics/tabs/AcademicTab';
import { PerformanceTab } from './analytics/tabs/PerformanceTab';
import { StudentProgressTab } from './analytics/tabs/StudentProgressTab';
import { TeacherPerformanceTab } from './analytics/tabs/TeacherPerformanceTab';
import { AttendanceTab } from './analytics/tabs/AttendanceTab';
import { FinancialTab } from './analytics/tabs/FinancialTab';

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const buildMetricUrl = useCallback((metric: string, f: AnalyticsFilters) => {
    const params = new URLSearchParams({ metric });
    if (f.academicSession) params.set('academicSession', f.academicSession);
    if (f.term) params.set('term', f.term);
    if (f.class) params.set('class', f.class);
    if (f.startDate) params.set('startDate', f.startDate);
    if (f.endDate) params.set('endDate', f.endDate);
    return `/api/tenant/analytics?${params.toString()}`;
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [academic, performance, studentProgress, teacherPerformance, attendance, financial] = await Promise.allSettled([
        fetchWithAuth(buildMetricUrl('academic', filters)),
        fetchWithAuth(buildMetricUrl('performance', filters)),
        fetchWithAuth(buildMetricUrl('student-progress', filters)),
        fetchWithAuth(buildMetricUrl('teacher-performance', filters)),
        fetchWithAuth(buildMetricUrl('attendance', filters)),
        fetchWithAuth(buildMetricUrl('financial', filters)),
      ]);

      if (academic.status === 'fulfilled' && academic.value?.data != null) setAcademicData(academic.value.data);
      if (performance.status === 'fulfilled' && performance.value?.data != null) setPerformanceData(performance.value.data);
      if (studentProgress.status === 'fulfilled' && studentProgress.value?.data != null) setStudentProgressData(studentProgress.value.data);
      if (teacherPerformance.status === 'fulfilled' && teacherPerformance.value?.data != null) setTeacherPerformanceData(teacherPerformance.value.data);
      if (attendance.status === 'fulfilled' && attendance.value?.data != null) setAttendanceData(attendance.value.data);
      if (financial.status === 'fulfilled' && financial.value?.data != null) setFinancialData(financial.value.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, buildMetricUrl]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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

      <DashboardFilters filters={filters} onChange={setFilters} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Failed to load analytics</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

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

export default AnalyticsDashboard;
