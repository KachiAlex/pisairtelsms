import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { AcademicAnalytics } from './analytics/AcademicAnalytics';
import { PerformanceAnalytics } from './analytics/PerformanceAnalytics';
import { StudentProgressAnalytics } from './analytics/StudentProgressAnalytics';
import { TeacherPerformanceAnalytics } from './analytics/TeacherPerformanceAnalytics';
import { AttendanceAnalyticsTab } from './analytics/AttendanceAnalyticsTab';
import { FinancialAnalytics } from './analytics/FinancialAnalytics';

export function AnalyticsReports() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-sm text-gray-600 mt-1">Comprehensive academic and operational insights</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <Tabs defaultValue="academic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="student-progress">Student Progress</TabsTrigger>
            <TabsTrigger value="teacher-performance">Teacher Performance</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Analytics</TabsTrigger>
            <TabsTrigger value="financial">Financial Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="academic">
            <AcademicAnalytics />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceAnalytics />
          </TabsContent>

          <TabsContent value="student-progress">
            <StudentProgressAnalytics />
          </TabsContent>

          <TabsContent value="teacher-performance">
            <TeacherPerformanceAnalytics />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceAnalyticsTab />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialAnalytics />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default AnalyticsReports;
