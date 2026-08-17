import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export function StudentProgressTab({ data, loading }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No student progress data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Students</p><p className="text-2xl font-bold">{data.totalStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Improving</p><p className="text-2xl font-bold text-green-600">{data.improvingStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Declining</p><p className="text-2xl font-bold text-red-600">{data.decliningStudents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Stable</p><p className="text-2xl font-bold">{data.stableStudents}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Progress by Class</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.progressByClass}>
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
          <CardHeader><CardTitle>Risk Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.riskCategories.map((cat: any) => (
                <div key={cat.category} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{cat.category}</p>
                  <p className="text-2xl font-bold">{cat.count}</p>
                  <p className="text-sm text-gray-500">{cat.percentage}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
