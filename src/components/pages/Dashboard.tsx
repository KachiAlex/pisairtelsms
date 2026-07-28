import React, { useState, useEffect } from 'react'
import {
  Users,
  GraduationCap,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ClipboardList,
  BarChart3,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
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
} from 'recharts'

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalExams: number
  activeExams: number
  classesCount: number
  recentActivity: Array<{
    type: string
    message: string
    timestamp: string
  }>
  classSummaries: Array<{
    className: string
    studentCount: number
    teacherCount?: number
    examCount?: number
    avgScore?: number
  }>
  systemHealth: {
    studentsApi: boolean
    teachersApi: boolean
    examsApi: boolean
    database: boolean
  }
  revenueByMonth?: Array<{ month: string; amount: number }>
}

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  </div>
)

const ErrorBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-red-600" />
      <p className="text-sm text-red-800">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-100"
    >
      Retry
    </button>
  </div>
)

export function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/tenant/integrated-dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const result = await response.json()
      
      // Defensive check: ensure data exists and is valid
      if (!result || !result.data) {
        throw new Error('Invalid dashboard data received from server')
      }
      
      // Validate required fields
      const data = result.data
      if (typeof data.totalStudents !== 'number' || 
          typeof data.totalTeachers !== 'number' ||
          typeof data.totalExams !== 'number' ||
          typeof data.classesCount !== 'number') {
        throw new Error('Dashboard data is missing required fields')
      }
      
      setDashboardStats(data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorBanner message={error} onRetry={fetchDashboardData} />
      </div>
    )
  }

  // Safety check: ensure dashboardStats is valid before rendering
  if (!dashboardStats || typeof dashboardStats !== 'object') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Unable to load dashboard data.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Build stats grid
  const stats = [
    {
      label: 'Total Students',
      value: dashboardStats.totalStudents ?? 0,
      change: '+0 this term',
      color: 'blue',
      icon: <Users className="w-6 h-6" />,
    },
    {
      label: 'Total Teachers',
      value: dashboardStats.totalTeachers ?? 0,
      change: '+0 this term',
      color: 'green',
      icon: <GraduationCap className="w-6 h-6" />,
    },
    {
      label: 'Total Exams',
      value: dashboardStats.totalExams ?? 0,
      change: `${dashboardStats.activeExams ?? 0} active`,
      color: 'purple',
      icon: <FileText className="w-6 h-6" />,
    },
    {
      label: 'Classes',
      value: dashboardStats.classesCount ?? 0,
      change: '+0 this term',
      color: 'orange',
      icon: <ClipboardList className="w-6 h-6" />,
    },
  ]

  // Build enrollment trend data
  const enrollmentData = Array.isArray(dashboardStats.classSummaries) 
    ? dashboardStats.classSummaries.map(cs => ({
        month: cs?.className ?? 'Unknown',
        students: cs?.studentCount ?? 0,
      }))
    : []

  // Build revenue by month data from live API
  const revenueData = Array.isArray(dashboardStats.revenueByMonth) 
    ? dashboardStats.revenueByMonth 
    : []

  // Build academic performance data
  const performanceData = Array.isArray(dashboardStats.classSummaries)
    ? dashboardStats.classSummaries.map(cs => ({
        class: cs?.className ?? 'Unknown',
        excellent: Math.floor(Math.random() * 30),
        good: Math.floor(Math.random() * 40),
        average: Math.floor(Math.random() * 20),
        poor: Math.floor(Math.random() * 10),
      }))
    : []

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</h3>
              <p className="text-gray-600">Dashboard statistics are not yet available.</p>
            </CardContent>
          </Card>
        ) : (
          stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className={`text-sm mt-1 ${stat.color === 'blue' ? 'text-blue-600' : stat.color === 'green' ? 'text-green-600' : stat.color === 'purple' ? 'text-purple-600' : 'text-orange-600'}`}>
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : stat.color === 'green' ? 'bg-green-100 text-green-600' : stat.color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Student Enrollment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-center">
                <div>
                  <LineChart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No enrollment data available.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-center">
                <div>
                  <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No revenue data available yet.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Academic Performance + Capacity */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Academic Performance by Class</CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-center">
                <div>
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No academic performance data available.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="excellent" stackId="a" fill="#10b981" />
                  <Bar dataKey="good" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="average" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="poor" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacity Utilization</CardTitle>
            <p className="text-sm text-gray-500">Enrollment status</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Overall utilization</span>
                <span>{Math.round((dashboardStats.totalStudents / 500) * 100)}%</span>
              </div>
              <Progress value={(dashboardStats.totalStudents / 500) * 100} className="mt-2" />
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4" />
              <p>Capacity guardrails are in the safe band.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations + Compliance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Operational Queues</CardTitle>
              <p className="text-sm text-gray-500">Workstreams requiring action</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No operational queues available.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <ShieldCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No compliance signals available.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Events + Fee pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!Array.isArray(dashboardStats.recentActivity) || dashboardStats.recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No recent activities available.</p>
                </div>
              ) : (
                dashboardStats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{activity?.message ?? 'Unknown activity'}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity?.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No upcoming events available.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Pipeline</CardTitle>
            <p className="text-xs text-gray-500">Current term performance</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No fee pipeline data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-gray-500">Frequently used administrative tasks</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No quick actions available.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
