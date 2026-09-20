import { Award, BookOpen, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';

const formatCurrency = (amount: number | undefined | null) => {
  if (amount == null || isNaN(amount)) return '—';
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return `₦${amount.toLocaleString()}`;
};

const NA = '—';

export function OverviewTab({ data }: { data: any }) {
  const { academic, performance, attendance, financial } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{academic?.averageScore != null ? `${academic.averageScore}%` : NA}</p>
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{academic?.passRate != null ? `${academic.passRate}%` : NA}</p>
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{attendance?.overallAttendanceRate != null ? `${attendance.overallAttendanceRate}%` : NA}</p>
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
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{financial?.collectionRate != null ? `${financial.collectionRate}%` : NA}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{academic?.totalStudents ?? NA}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">At-Risk Students</p>
            <p className="text-2xl font-bold text-gray-900">{performance?.atRiskStudents ?? NA}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{financial != null ? formatCurrency(financial.totalRevenue) : NA}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
