import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, TrendingUp, Clock, DollarSign, Calendar } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { AnnouncementsSection } from './AnnouncementsSection';
import { MessagesSection } from './MessagesSection';
import { Button } from '../../ui/button';

interface StudentData {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    class: string;
    arm: string;
  };
  metrics: {
    gpa: number;
    attendancePercent: number;
    nextExam: {
      subject: string;
      date: string;
      time: string;
    } | null;
    feeBalance: number;
  };
  recentAnnouncements: Array<{
    id: string;
    title: string;
    date: string;
    preview: string;
  }>;
  recentMessages: Array<{
    id: string;
    sender: string;
    subject: string;
    date: string;
    isRead: boolean;
  }>;
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const auth = localStorage.getItem('auth');
        if (!auth) {
          setError('Not authenticated');
          return;
        }

        const { token } = JSON.parse(auth);
        const response = await fetch('/api/student/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        console.error('Error fetching dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const unreadCount = data.recentMessages.filter(m => !m.isRead).length;
  const gpaStatus = data.metrics.gpa >= 3.5 ? 'good' : data.metrics.gpa >= 3.0 ? 'warning' : 'critical';
  const attendanceStatus = data.metrics.attendancePercent >= 90 ? 'good' : data.metrics.attendancePercent >= 80 ? 'warning' : 'critical';
  const feeStatus = data.metrics.feeBalance === 0 ? 'good' : data.metrics.feeBalance < 50000 ? 'warning' : 'critical';

  return (
    <div className="space-y-6">
      {/* Student Info Header */}
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{data.student.name}</h1>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-blue-100">Admission Number</p>
            <p className="font-semibold">{data.student.admissionNumber}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Class</p>
            <p className="font-semibold">{data.student.class} {data.student.arm}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Academic Session</p>
            <p className="font-semibold">2025/2026 - First Term</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="GPA"
          value={data.metrics.gpa.toFixed(2)}
          icon={TrendingUp}
          status={gpaStatus}
        />
        <MetricCard
          title="Attendance"
          value={`${data.metrics.attendancePercent}%`}
          icon={Calendar}
          status={attendanceStatus}
        />
        <MetricCard
          title="Next Exam"
          value={data.metrics.nextExam?.subject || 'N/A'}
          icon={Clock}
          status="good"
        />
        <MetricCard
          title="Fee Balance"
          value={`₦${data.metrics.feeBalance.toLocaleString()}`}
          icon={DollarSign}
          status={feeStatus}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Announcements */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Announcements</h2>
            <AnnouncementsSection
              announcements={data.recentAnnouncements}
              isLoading={false}
              onViewAll={() => navigate('/student/communications')}
            />
          </div>
        </div>

        {/* Messages */}
        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Messages</h2>
            <MessagesSection
              messages={data.recentMessages}
              isLoading={false}
              unreadCount={unreadCount}
              onViewAll={() => navigate('/student/messages')}
            />
          </div>
        </div>
      </div>

      {/* Next Exam Info */}
      {data.metrics.nextExam && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-900">Upcoming Exam</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-amber-700">Subject</p>
              <p className="font-semibold text-amber-900">{data.metrics.nextExam.subject}</p>
            </div>
            <div>
              <p className="text-sm text-amber-700">Date</p>
              <p className="font-semibold text-amber-900">{data.metrics.nextExam.date}</p>
            </div>
            <div>
              <p className="text-sm text-amber-700">Time</p>
              <p className="font-semibold text-amber-900">{data.metrics.nextExam.time}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
