import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, TrendingUp, Users, BookOpen, Award } from 'lucide-react';
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

interface TeacherPerformanceStats {
  totalTeachers: number;
  averageRating: number;
  topPerformers: number;
  needsImprovement: number;
  teacherRanking: Array<{
    teacher: string;
    subject: string;
    averageScore: number;
    passRate: number;
    rating: number;
  }>;
  subjectComparison: Array<{
    subject: string;
    teacherAverage: number;
    schoolAverage: number;
  }>;
  performanceTrend: Array<{
    month: string;
    averageRating: number;
    studentSatisfaction: number;
  }>;
}

export function TeacherPerformanceAnalytics() {
  const [stats, setStats] = useState<TeacherPerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeacherPerformanceStats();
  }, []);

  const fetchTeacherPerformanceStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.tenantId) headers['x-tenant-id'] = auth.tenantId;

      const response = await fetch('/api/tenant/analytics/teacher-performance', { headers });
      if (!response.ok) throw new Error('Failed to fetch teacher performance analytics');
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher performance analytics');
      // Set mock data for development
      setStats({
        totalTeachers: 45,
        averageRating: 4.2,
        topPerformers: 18,
        needsImprovement: 5,
        teacherRanking: [
          { teacher: 'Mrs. Angela', subject: 'Mathematics', averageScore: 78, passRate: 92, rating: 4.8 },
          { teacher: 'Mr. Femi', subject: 'Physics', averageScore: 75, passRate: 88, rating: 4.6 },
          { teacher: 'Mrs. Chioma', subject: 'English', averageScore: 82, passRate: 95, rating: 4.9 },
          { teacher: 'Mr. Ibrahim', subject: 'Chemistry', averageScore: 74, passRate: 85, rating: 4.4 },
          { teacher: 'Mrs. Grace', subject: 'Biology', averageScore: 79, passRate: 90, rating: 4.7 },
        ],
        subjectComparison: [
          { subject: 'Mathematics', teacherAverage: 78, schoolAverage: 71 },
          { subject: 'English', teacherAverage: 82, schoolAverage: 78 },
          { subject: 'Physics', teacherAverage: 75, schoolAverage: 68 },
          { subject: 'Chemistry', teacherAverage: 74, schoolAverage: 72 },
          { subject: 'Biology', teacherAverage: 79, schoolAverage: 76 },
        ],
        performanceTrend: [
          { month: 'Jan', averageRating: 4.1, studentSatisfaction: 85 },
          { month: 'Feb', averageRating: 4.2, studentSatisfaction: 87 },
          { month: 'Mar', averageRating: 4.1, studentSatisfaction: 86 },
          { month: 'Apr', averageRating: 4.3, studentSatisfaction: 88 },
          { month: 'May', averageRating: 4.2, studentSatisfaction: 87 },
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
                <p className="text-sm text-gray-600">Total Teachers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTeachers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageRating}/5</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Top Performers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.topPerformers}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Needs Improvement</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.needsImprovement}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.performanceTrend}>
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
          <CardHeader>
            <CardTitle>Subject Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.subjectComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="teacherAverage" fill="#3b82f6" name="Teacher Avg %" />
                <Bar dataKey="schoolAverage" fill="#94a3b8" name="School Avg %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.teacherRanking.map((teacher, index) => (
              <div key={teacher.teacher} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{teacher.teacher}</p>
                    <p className="text-sm text-gray-600">{teacher.subject}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-blue-600">{teacher.rating}/5</p>
                  <p className="text-xs text-gray-500">Rating</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
