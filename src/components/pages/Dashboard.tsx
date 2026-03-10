import React from 'react'
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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const stats = []

const enrollmentData = []

const performanceData = []

const feeCollectionData = []

const feePipeline = []

const capacityUtilization = {
  seats: 0,
  utilized: 0,
  boarding: 0,
  day: 0,
}

const approvalQueue = []

const complianceAlerts = []

const recentActivities = []

const upcomingEvents = []

const quickActions = []

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Statistics</h3>
              <p className="text-gray-600">No statistics data available. Please implement dashboard API endpoints.</p>
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
                  <p className="text-gray-600">No enrollment data available. Please implement enrollment tracking API.</p>
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

        {/* Fee Collection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {feeCollectionData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-center">
                <div>
                  <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No fee collection data available. Please implement fee management API.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={feeCollectionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {feeCollectionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
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
                  <p className="text-gray-600">No academic performance data available. Please implement results API.</p>
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
            <p className="text-sm text-gray-500">{capacityUtilization.utilized} / {capacityUtilization.seats} seats occupied</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {capacityUtilization.seats === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No capacity utilization data available. Please implement enrollment management API.</p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Overall utilization</span>
                    <span>{Math.round((capacityUtilization.utilized / capacityUtilization.seats) * 100)}%</span>
                  </div>
                  <Progress value={(capacityUtilization.utilized / capacityUtilization.seats) * 100} className="mt-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-gray-500">Boarding</p>
                    <p className="text-lg font-semibold text-gray-900">{capacityUtilization.boarding}%</p>
                    <p className="text-xs text-gray-500">Dormitories healthy</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-gray-500">Day students</p>
                    <p className="text-lg font-semibold text-gray-900">{capacityUtilization.day}%</p>
                    <p className="text-xs text-gray-500">Transport at 62% load</p>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <p>Capacity guardrails are in the safe band. Next review in 5 days.</p>
                </div>
              </>
            )}
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
            {approvalQueue.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No operational queues available. Please implement workflow management API.</p>
              </div>
            ) : (
              approvalQueue.map((item, index) => (
                <div key={item.title} className={`rounded-2xl border p-4 ${index === approvalQueue.length - 1 ? 'border-dashed' : 'border-solid'} border-gray-100`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600">{item.owner}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{item.sla}</span>
                    <button className="text-blue-600 font-medium">Open queue</button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {complianceAlerts.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No compliance signals available. Please implement compliance monitoring API.</p>
              </div>
            ) : (
              complianceAlerts.map((alert) => (
                <div key={alert.title} className="rounded-2xl border border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        alert.severity === 'high'
                          ? 'bg-red-500'
                          : alert.severity === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                    />
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{alert.impact}</p>
                  <button className="mt-3 text-xs font-semibold text-blue-600" onClick={() => alert('View runbook functionality - would open compliance runbook for this alert')}>
                    View runbook
                  </button>
                </div>
              ))
            )}
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
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No recent activities available. Please implement activity logging API.</p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <div
                      className={`p-2 rounded-lg ${
                        activity.type === 'warning'
                          ? 'bg-yellow-100'
                          : activity.type === 'success'
                            ? 'bg-green-100'
                            : 'bg-blue-100'
                      }`}
                    >
                      {activity.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      ) : activity.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
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
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No upcoming events available. Please implement calendar management API.</p>
                </div>
              ) : (
                upcomingEvents.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{event.date}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Pipeline</CardTitle>
            <p className="text-xs text-gray-500">Current term performance</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {feePipeline.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No fee pipeline data available. Please implement fee management API.</p>
              </div>
            ) : (
              feePipeline.map((stage) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{stage.label}</span>
                    <span>{stage.value}%</span>
                  </div>
                  <Progress value={stage.value} className="mt-2" />
                </div>
              ))
            )}
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
            {quickActions.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No quick actions available. Please implement workflow management API.</p>
              </div>
            ) : (
              quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => alert(`${action.buttonLabel} functionality - would trigger ${action.title.toLowerCase()}`)}
                  className="p-4 border border-gray-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default Dashboard;
