import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  FileText,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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

const statsCards = [
  {
    title: 'Total Students',
    value: '1,248',
    change: '+12% from last term',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Staff Members',
    value: '85',
    change: '+3 new this month',
    icon: UserCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Revenue This Term',
    value: '₦12.5M',
    change: '+18% increase',
    icon: DollarSign,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Attendance Rate',
    value: '94.2%',
    change: '+2.1% this week',
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

const attendanceData = [
  { day: 'Mon', present: 1180, absent: 68 },
  { day: 'Tue', present: 1195, absent: 53 },
  { day: 'Wed', present: 1170, absent: 78 },
  { day: 'Thu', present: 1205, absent: 43 },
  { day: 'Fri', present: 1190, absent: 58 },
];

const classPerformanceData = [
  { class: 'JSS 1', average: 72 },
  { class: 'JSS 2', average: 68 },
  { class: 'JSS 3', average: 75 },
  { class: 'SS 1', average: 70 },
  { class: 'SS 2', average: 66 },
  { class: 'SS 3', average: 78 },
];

const feeCollectionData = [
  { name: 'Collected', value: 78, amount: '₦9.7M' },
  { name: 'Pending', value: 15, amount: '₦1.9M' },
  { name: 'Overdue', value: 7, amount: '₦900K' },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const recentActivities = [
  {
    id: 1,
    action: 'Result published',
    description: 'SS3 Final Examination results published',
    time: '10 minutes ago',
    status: 'success',
  },
  {
    id: 2,
    action: 'CBT Exam scheduled',
    description: 'Mathematics midterm exam scheduled for JSS 2',
    time: '1 hour ago',
    status: 'info',
  },
  {
    id: 3,
    action: 'Fee reminder sent',
    description: '150 fee payment reminders sent to parents',
    time: '2 hours ago',
    status: 'info',
  },
  {
    id: 4,
    action: 'Low attendance alert',
    description: 'JSS 1B attendance below 85% threshold',
    time: '3 hours ago',
    status: 'warning',
  },
];

const pendingTasks = [
  { id: 1, task: 'Approve JSS 3A results', priority: 'high', count: 3 },
  { id: 2, task: 'Review exam incidents', priority: 'high', count: 2 },
  { id: 3, task: 'Process fee waivers', priority: 'medium', count: 8 },
  { id: 4, task: 'Update timetable', priority: 'medium', count: 5 },
  { id: 5, task: 'Review staff leave requests', priority: 'low', count: 4 },
];

export default function DashboardOverview() {
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

      {/* Pending Tasks & Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pending Tasks & Approvals</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.priority === 'high'
                          ? 'bg-red-500'
                          : item.priority === 'medium'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm">{item.task}</p>
                      <p className="text-xs text-gray-500">{item.count} items</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Important notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-900">5 Students at Risk</p>
                  <p className="text-xs text-red-700">Below 50% in 3+ subjects</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-orange-900">Exam Conflicts</p>
                  <p className="text-xs text-orange-700">2 timetable clashes detected</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-900">Reports Due</p>
                  <p className="text-xs text-blue-700">Term reports deadline: 5 days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance</CardTitle>
            <CardDescription>Student attendance this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10b981" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                    {feeCollectionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              {feeCollectionData.map((item, index) => (
                <div key={item.name}>
                  <div
                    className="mb-1 inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <p className="text-xs text-gray-600">{item.name}</p>
                  <p className="text-sm">{item.amount}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex gap-3 border-b pb-3 last:border-0">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                      activity.status === 'success'
                        ? 'bg-green-500'
                        : activity.status === 'warning'
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
export default DashboardOverview;
