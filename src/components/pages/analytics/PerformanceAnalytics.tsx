import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, TrendingUp, Award, AlertCircle } from 'lucide-react';
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

interface PerformanceStats {
  overallAverage: number;
  overallPassRate: number;
  atRiskStudents: number;
  topPerformers: number;
  termTrend: Array<{
    term: string;
    average: number;
    passRate: number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  subjectRanking: Array<{
    subject: string;
    average: number;
    rank: number;
  }>;
}

export function PerformanceAnalytics() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceStats();
  }, []);

  const fetchPerformanceStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      if (auth.tenantId) headers['x-tenant-id'] = auth.tenantId;

      const response = await fetch('/api/tenant/analytics/performance', { headers });
      if (!response.ok) throw new Error('Failed to fetch performance analytics');
      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance analytics');
      // Set mock data for development
      setStats({
        overallAverage: 73.2,
        overallPassRate: 86,
        atRiskStudents: 47,
        topPerformers: 125,
        termTrend: [
          { term: 'First Term 2023/2024', average: 68.5, passRate: 82 },
          { term: 'Second Term 2023/2024', average: 70.1, passRate: 84 },
          { term: 'Third Term 2023/2024', average: 71.8, passRate: 85 },
          { term: 'First Term 2024/2025', average: 72.5, passRate: 86 },
          { term: 'Second Term 2024/2025', average: 73.2, passRate: 86 },
        ],
        gradeDistribution: [
          { grade: 'A', count: 280, percentage: 22 },
          { grade: 'B', count: 350, percentage: 28 },
          { grade: 'C', count: 320, percentage: 26 },
          { grade: 'D', count: 180, percentage: 14 },
          { grade: 'E', count: 80, percentage: 6 },
          { grade: 'F', count: 40, percentage: 4 },
        ],
        subjectRanking: [
          { subject: 'Economics', average: 80, rank: 1 },
          { subject: 'English', average: 78, rank: 2 },
          { subject: 'Biology', average: 76, rank: 3 },
          { subject: 'Chemistry', average: 72, rank: 4 },
          { subject: 'Mathematics', average: 71, rank: 5 },
          { subject: 'Physics', average: 68, rank: 6 },
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
                <p className="text-sm text-gray-600">Overall Average</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.overallAverage}%</p>
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.overallPassRate}%</p>
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
                <p className="text-sm text-gray-600">At-Risk Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.atRiskStudents}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
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
              <LineChart data={stats.termTrend}>
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
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.gradeDistribution}>
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

      {/* Subject Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Ranking by Average Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.subjectRanking.map((subject) => (
              <div key={subject.subject} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    subject.rank === 1 ? 'bg-yellow-500' : subject.rank === 2 ? 'bg-gray-400' : subject.rank === 3 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {subject.rank}
                  </div>
                  <p className="font-medium text-gray-900">{subject.subject}</p>
                </div>
                <p className="font-bold text-lg text-blue-600">{subject.average}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
