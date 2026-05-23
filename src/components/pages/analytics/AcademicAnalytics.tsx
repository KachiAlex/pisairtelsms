import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, TrendingUp, TrendingDown, BookOpen, Users } from 'lucide-react';
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

interface AcademicStats {
  totalStudents: number;
  totalSubjects: number;
  averageScore: number;
  passRate: number;
  termComparison: {
    currentTerm: string;
    previousTerm: string;
    currentAverage: number;
    previousAverage: number;
  };
  subjectPerformance: Array<{
    subject: string;
    averageScore: number;
    passRate: number;
  }>;
  classPerformance: Array<{
    class: string;
    averageScore: number;
    passRate: number;
  }>;
}

export function AcademicAnalytics() {
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAcademicStats();
  }, []);

  const fetchAcademicStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.tenantId) headers['x-tenant-id'] = auth.tenantId;

      const response = await fetch('/api/tenant/analytics/academic', { headers });
      if (!response.ok) throw new Error('Failed to fetch academic analytics');
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load academic analytics');
      // Set mock data for development
      setStats({
        totalStudents: 1250,
        totalSubjects: 12,
        averageScore: 73.2,
        passRate: 86,
        termComparison: {
          currentTerm: 'Second Term 2024/2025',
          previousTerm: 'First Term 2024/2025',
          currentAverage: 73.2,
          previousAverage: 67.9,
        },
        subjectPerformance: [
          { subject: 'Mathematics', averageScore: 71, passRate: 82 },
          { subject: 'English', averageScore: 78, passRate: 91 },
          { subject: 'Physics', averageScore: 68, passRate: 75 },
          { subject: 'Chemistry', averageScore: 72, passRate: 80 },
          { subject: 'Biology', averageScore: 76, passRate: 88 },
          { subject: 'Economics', averageScore: 80, passRate: 92 },
        ],
        classPerformance: [
          { class: 'JSS 1A', averageScore: 75, passRate: 88 },
          { class: 'JSS 1B', averageScore: 72, passRate: 85 },
          { class: 'SS 1A', averageScore: 78, passRate: 90 },
          { class: 'SS 1B', averageScore: 76, passRate: 87 },
          { class: 'SS 2A', averageScore: 74, passRate: 86 },
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

  const trend = stats.termComparison.currentAverage - stats.termComparison.previousAverage;
  const trendUp = trend > 0;

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
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Subjects</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSubjects}</p>
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
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageScore}%</p>
                <div className={`flex items-center gap-1 mt-1 text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{trendUp ? '+' : ''}{trend.toFixed(1)}% vs last term</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.passRate}%</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.subjectPerformance}>
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
          <CardHeader>
            <CardTitle>Class Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.classPerformance}>
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

      {/* Term Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Term Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{stats.termComparison.previousTerm}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.termComparison.previousAverage}%</p>
              <p className="text-sm text-gray-500">Average Score</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">{stats.termComparison.currentTerm}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.termComparison.currentAverage}%</p>
              <p className="text-sm text-gray-500">Average Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
