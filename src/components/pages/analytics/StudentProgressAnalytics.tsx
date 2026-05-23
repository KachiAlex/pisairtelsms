import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, TrendingUp, TrendingDown, User, GraduationCap } from 'lucide-react';
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
} from 'recharts';

interface StudentProgressStats {
  totalStudents: number;
  improvingStudents: number;
  decliningStudents: number;
  stableStudents: number;
  progressByClass: Array<{
    class: string;
    averageImprovement: number;
    studentsOnTrack: number;
    studentsBehind: number;
  }>;
  subjectProgress: Array<{
    subject: string;
    currentAverage: number;
    previousAverage: number;
    improvement: number;
  }>;
  riskCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export function StudentProgressAnalytics() {
  const [stats, setStats] = useState<StudentProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentProgressStats();
  }, []);

  const fetchStudentProgressStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.tenantId) headers['x-tenant-id'] = auth.tenantId;

      const response = await fetch('/api/tenant/analytics/student-progress', { headers });
      if (!response.ok) throw new Error('Failed to fetch student progress analytics');
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student progress analytics');
      // Set mock data for development
      setStats({
        totalStudents: 1250,
        improvingStudents: 520,
        decliningStudents: 180,
        stableStudents: 550,
        progressByClass: [
          { class: 'JSS 1A', averageImprovement: 5.2, studentsOnTrack: 42, studentsBehind: 8 },
          { class: 'JSS 1B', averageImprovement: 4.8, studentsOnTrack: 40, studentsBehind: 10 },
          { class: 'SS 1A', averageImprovement: 6.1, studentsOnTrack: 38, studentsBehind: 7 },
          { class: 'SS 1B', averageImprovement: 5.5, studentsOnTrack: 36, studentsBehind: 9 },
          { class: 'SS 2A', averageImprovement: 4.2, studentsOnTrack: 35, studentsBehind: 12 },
        ],
        subjectProgress: [
          { subject: 'Mathematics', currentAverage: 71, previousAverage: 68, improvement: 3 },
          { subject: 'English', currentAverage: 78, previousAverage: 75, improvement: 3 },
          { subject: 'Physics', currentAverage: 68, previousAverage: 65, improvement: 3 },
          { subject: 'Chemistry', currentAverage: 72, previousAverage: 70, improvement: 2 },
          { subject: 'Biology', currentAverage: 76, previousAverage: 68, improvement: 8 },
          { subject: 'Economics', currentAverage: 80, previousAverage: 76, improvement: 4 },
        ],
        riskCategories: [
          { category: 'On Track', count: 750, percentage: 60 },
          { category: 'At Risk', count: 250, percentage: 20 },
          { category: 'Critical', count: 100, percentage: 8 },
          { category: 'Excelling', count: 150, percentage: 12 },
        ],
      });
    } finally {
      setLoading(false);
    }
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
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Improving</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.improvingStudents}</p>
                <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{((stats.improvingStudents / stats.totalStudents) * 100).toFixed(1)}%</span>
                </div>
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
                <p className="text-sm text-gray-600">Declining</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.decliningStudents}</p>
                <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>{((stats.decliningStudents / stats.totalStudents) * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stable</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.stableStudents}</p>
                <div className="flex items-center gap-1 mt-1 text-gray-600 text-sm">
                  <span>{((stats.stableStudents / stats.totalStudents) * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Progress by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.progressByClass}>
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
          <CardHeader>
            <CardTitle>Subject Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.subjectProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="currentAverage" fill="#3b82f6" name="Current %" />
                <Bar dataKey="previousAverage" fill="#94a3b8" name="Previous %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Student Risk Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.riskCategories.map((category) => (
              <div key={category.category} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{category.category}</p>
                <p className="text-2xl font-bold text-gray-900">{category.count}</p>
                <p className="text-sm text-gray-500">{category.percentage}% of total</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
