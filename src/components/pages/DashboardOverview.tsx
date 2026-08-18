import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  FileText,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

function tenantHeaders(): Record<string, string> {
  const tenantId =
    (typeof window !== 'undefined' && localStorage.getItem('tenantId')) ||
    'default-tenant';
  return { 'Content-Type': 'application/json' };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n}`;
}

interface DashboardData {
  totalStudents: number;
  totalTeachers: number;
  classesCount: number;
  recentActivity: { type: string; message: string; timestamp: string }[];
  classSummaries: { className: string; studentCount: number; avgScore: number }[];
  revenueByMonth: { month: string; amount: number }[];
}

interface FinancialData {
  totalRevenue: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;
}

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [finance, setFinance] = useState<FinancialData | null>(null);

  useEffect(() => {
    const headers = tenantHeaders();
    Promise.all([
      fetch('/api/tenant/integrated-dashboard', { headers }).then((r) => r.json()),
      fetch('/api/tenant/analytics/financial', { headers }).then((r) => r.json()),
    ])
      .then(([dashRes, finRes]) => {
        if (dashRes.data) setDash(dashRes.data);
        if (finRes.data) setFinance(finRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const feeCollectionData = finance
    ? [
        { name: 'Collected', value: finance.collectionRate, amount: fmt(finance.totalCollected) },
        {
          name: 'Outstanding',
          value: 100 - finance.collectionRate,
          amount: fmt(finance.outstandingBalance),
        },
      ]
    : [];

  const classPerformanceData = (dash?.classSummaries ?? []).map((s) => ({
    class: s.className,
    average: Math.round(s.avgScore),
  }));

  const revenueData = (dash?.revenueByMonth ?? []).map((m) => ({
    month: m.month,
    amount: m.amount,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Students',
      value: dash ? dash.totalStudents.toLocaleString() : '—',
      change: `${dash?.classesCount ?? 0} classes`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Staff Members',
      value: dash ? dash.totalTeachers.toLocaleString() : '—',
      change: 'Active teachers',
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Revenue Collected',
      value: finance ? fmt(finance.totalCollected) : '—',
      change: finance ? `${finance.collectionRate}% collection rate` : '',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Outstanding Balance',
      value: finance ? fmt(finance.outstandingBalance) : '—',
      change: finance ? `of ${fmt(finance.totalRevenue)} total` : '',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">
          Welcome back! Here's what's happening with your school today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl">{stat.value}</div>
                <p className="text-xs text-gray-600 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activities & Quick Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            {(!dash?.recentActivity || dash.recentActivity.length === 0) ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {dash.recentActivity.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex gap-3 border-b pb-3 last:border-0">
                    <div className="mt-1 h-2 w-2 rounded-full flex-shrink-0 bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Summary</CardTitle>
            <CardDescription>Key counts at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-900">{dash?.totalStudents ?? 0} Students</p>
                  <p className="text-xs text-blue-700">Across {dash?.classesCount ?? 0} classes</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-900">{dash?.totalTeachers ?? 0} Teachers</p>
                  <p className="text-xs text-green-700">Active staff members</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                <DollarSign className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-purple-900">{finance?.collectionRate ?? 0}% Collected</p>
                  <p className="text-xs text-purple-700">{fmt(finance?.totalCollected ?? 0)} of {fmt(finance?.totalRevenue ?? 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {revenueData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly collections</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="amount" fill="#8b5cf6" name="Collected (₦)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {classPerformanceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Class Performance</CardTitle>
              <CardDescription>Average scores by class</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={classPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Average Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {feeCollectionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fee Collection Status</CardTitle>
              <CardDescription>Current term fee collection breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={feeCollectionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {feeCollectionData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                {feeCollectionData.map((item, index) => (
                  <div key={item.name}>
                    <div
                      className="mb-1 inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <p className="text-xs text-gray-600">{item.name}</p>
                    <p className="text-sm font-medium">{item.amount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <Users className="mr-2 h-4 w-4" />
              Enroll Student
            </Button>
            <Button variant="outline" className="justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button variant="outline" className="justify-start">
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
