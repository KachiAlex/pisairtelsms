import React from 'react';
import { TrendingUp, TrendingDown, Users, BookOpen, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const performanceTrend = [
  { term: 'Term 1', average: 65, passRate: 78 },
  { term: 'Term 2', average: 68, passRate: 82 },
  { term: 'Term 3', average: 72, passRate: 85 },
  { term: 'Term 1', average: 70, passRate: 80 },
  { term: 'Term 2', average: 73, passRate: 86 },
];

const subjectPerformance = [
  { subject: 'Mathematics', score: 72 },
  { subject: 'English', score: 78 },
  { subject: 'Physics', score: 68 },
  { subject: 'Chemistry', score: 70 },
  { subject: 'Biology', score: 75 },
  { subject: 'Economics', score: 80 },
];

const attendanceData = [
  { month: 'Sep', attendance: 92 },
  { month: 'Oct', attendance: 89 },
  { month: 'Nov', attendance: 94 },
  { month: 'Dec', attendance: 87 },
  { month: 'Jan', attendance: 91 },
  { month: 'Feb', attendance: 93 },
];

const classComparison = [
  {
    class: 'JSS 1',
    Mathematics: 68,
    English: 72,
    Science: 70,
    SocialStudies: 75,
  },
  {
    class: 'JSS 2',
    Mathematics: 70,
    English: 74,
    Science: 72,
    SocialStudies: 77,
  },
  {
    class: 'JSS 3',
    Mathematics: 72,
    English: 76,
    Science: 74,
    SocialStudies: 79,
  },
  {
    class: 'SS 1',
    Mathematics: 65,
    English: 70,
    Science: 68,
    SocialStudies: 72,
  },
  {
    class: 'SS 2',
    Mathematics: 67,
    English: 72,
    Science: 70,
    SocialStudies: 74,
  },
  {
    class: 'SS 3',
    Mathematics: 75,
    English: 80,
    Science: 78,
    SocialStudies: 82,
  },
];

const topPerformers = [
  { name: 'Fatima Abdullahi', class: 'SS 3', gpa: 4.85, position: 1 },
  { name: 'Oluwaseun Balogun', class: 'SS 3', gpa: 4.78, position: 2 },
  { name: 'Chioma Okafor', class: 'SS 2', gpa: 4.72, position: 3 },
  { name: 'Adewale Johnson', class: 'SS 3', gpa: 4.65, position: 4 },
  { name: 'Ibrahim Musa', class: 'SS 2', gpa: 4.58, position: 5 },
];

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-sm text-gray-600 mt-1">Comprehensive academic and operational insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">73.2%</p>
                <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+5.3% vs last term</span>
                </div>
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
                <p className="text-2xl font-bold text-gray-900 mt-1">86%</p>
                <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+4% vs last term</span>
                </div>
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
                <p className="text-sm text-gray-600">Avg Attendance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">91%</p>
                <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+2% vs last term</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At-Risk Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">47</p>
                <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>-12 vs last term</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="term" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={2} name="Average Score %" />
                <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} name="Pass Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Student Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#8b5cf6" strokeWidth={2} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Class Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Class Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Mathematics" fill="#3b82f6" />
                <Bar dataKey="English" fill="#10b981" />
                <Bar dataKey="Science" fill="#f59e0b" />
                <Bar dataKey="SocialStudies" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers - This Term</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {student.position}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.class}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-blue-600">{student.gpa.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">GPA</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subject Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Subject Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={subjectPerformance}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="School Average" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Best Performing Subject</p>
            <p className="text-xl font-bold text-gray-900">Economics</p>
            <p className="text-sm text-green-600 mt-1">80% average score</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Needs Improvement</p>
            <p className="text-xl font-bold text-gray-900">Physics</p>
            <p className="text-sm text-orange-600 mt-1">68% average score</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Most Improved</p>
            <p className="text-xl font-bold text-gray-900">Biology</p>
            <p className="text-sm text-blue-600 mt-1">+12% improvement</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default AnalyticsDashboard;
