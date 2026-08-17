import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export function TeacherPerformanceTab({ data, loading }: { data: any; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <Card><CardContent className="p-8 text-center text-gray-500">No teacher performance data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Total Teachers</p><p className="text-2xl font-bold">{data.totalTeachers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Average Rating</p><p className="text-2xl font-bold">{data.averageRating}/5</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Top Performers</p><p className="text-2xl font-bold">{data.topPerformers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-600">Needs Improvement</p><p className="text-2xl font-bold">{data.needsImprovement}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.performanceTrend}>
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
          <CardHeader><CardTitle>Teacher Ranking</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.teacherRanking.map((teacher: any, index: number) => (
                <div key={teacher.teacher} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>{index + 1}</div>
                    <div>
                      <p className="font-medium">{teacher.teacher}</p>
                      <p className="text-sm text-gray-600">{teacher.subject}</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg text-blue-600">{teacher.rating}/5</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
