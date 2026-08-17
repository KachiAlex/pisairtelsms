import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export function AcademicTab({ data, loading }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No academic data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Students</p><p className="text-2xl font-bold">{data.totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Subjects</p><p className="text-2xl font-bold">{data.totalSubjects}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Average Score</p><p className="text-2xl font-bold">{data.averageScore}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Pass Rate</p><p className="text-2xl font-bold">{data.passRate}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Subject Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.subjectPerformance}>
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
          <CardHeader><CardTitle>Class Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.classPerformance}>
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
    </div>
  );
}
