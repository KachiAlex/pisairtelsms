import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarCheck } from 'lucide-react';
import { Button } from '../../ui/button';

interface AttendanceRecord {
  date: string;
  subject: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  reason?: string;
}

interface AttendanceData {
  records: AttendanceRecord[];
  attendancePercent: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
}

const statusConfig = {
  present: { label: 'Present', color: 'text-green-700 bg-green-50 border-green-200' },
  absent: { label: 'Absent', color: 'text-red-700 bg-red-50 border-red-200' },
  late: { label: 'Late', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  excused: { label: 'Excused', color: 'text-blue-700 bg-blue-50 border-blue-200' },
};

export function MyAttendance() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const auth = localStorage.getItem('auth');
      if (!auth) { setError('Not authenticated'); return; }
      const { token } = JSON.parse(auth);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/student/attendance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={fetchAttendance}>Filter</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchAttendance}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
      ) : data && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{data.attendancePercent}%</p>
              <p className="text-sm text-gray-600 mt-1">Overall</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{data.totalPresent}</p>
              <p className="text-sm text-green-600 mt-1">Present</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-3xl font-bold text-red-700">{data.totalAbsent}</p>
              <p className="text-sm text-red-600 mt-1">Absent</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">{data.totalLate}</p>
              <p className="text-sm text-amber-600 mt-1">Late</p>
            </div>
          </div>

          {/* Records */}
          {data.records.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <CalendarCheck className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-3 text-gray-600">No attendance records found</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.records.map((r, i) => {
                      const cfg = statusConfig[r.status];
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">{r.date}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{r.subject}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{r.reason ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyAttendance;
