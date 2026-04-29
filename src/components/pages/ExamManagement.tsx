import React, { useState, useEffect } from 'react';
import { Play, Clock, Users, FileText } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { QuestionBankTab } from './cbt/QuestionBankTab';
import { ExamCreationTab } from './cbt/ExamCreationTab';
import { LiveMonitoringTab } from './cbt/LiveMonitoringTab';
import { ExamResultsTab } from './cbt/ExamResultsTab';
import { SecuritySettingsTab } from './cbt/SecuritySettingsTab';
import { tenantApiGet } from '../../lib/tenantApi';

// ─── Error Boundary ───────────────────────────────────────────────────────────

class TabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tab rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-red-900 font-semibold mb-2">Tab Rendering Error</h3>
          <p className="text-red-700 text-sm mb-3">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Dashboard stats ───────────────────────────────────────────────────────────

interface DashboardStats {
  totalQuestions: number;
  ongoingExams: number;
  scheduledExams: number;
  activeStudents: number;
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ExamManagement() {
  const [stats, setStats] = useState<DashboardStats>({ totalQuestions: 0, ongoingExams: 0, scheduledExams: 0, activeStudents: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [questionsRes, examsRes] = await Promise.all([
          tenantApiGet('/api/tenant/cbt/questions/stats'),
          tenantApiGet('/api/tenant/cbt/exams?limit=100'),
        ]);

        if (questionsRes.ok) {
          const qData = await questionsRes.json();
          setStats((s) => ({ ...s, totalQuestions: qData.data?.total || 0 }));
        }

        if (examsRes.ok) {
          const eData = await examsRes.json();
          const exams: Array<{ status: string; participants?: number }> = eData.data || [];
          const ongoing = exams.filter((e) => e.status === 'Ongoing');
          const scheduled = exams.filter((e) => e.status === 'Scheduled');
          const activeStudents = ongoing.reduce((sum, e) => sum + (e.participants || 0), 0);
          setStats((s) => ({
            ...s,
            ongoingExams: ongoing.length,
            scheduledExams: scheduled.length,
            activeStudents,
          }));
        }
      } catch {
        // stats are non-critical
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CBT & Examination Management</h1>
        <p className="text-sm text-gray-600 mt-1">Create, schedule and monitor computer-based tests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ongoing Exams" value={stats.ongoingExams} color="text-green-600" icon={<Play className="w-5 h-5 text-green-600" />} />
        <StatCard label="Scheduled" value={stats.scheduledExams} color="text-blue-600" icon={<Clock className="w-5 h-5 text-blue-600" />} />
        <StatCard label="Active Students" value={stats.activeStudents} color="text-purple-600" icon={<Users className="w-5 h-5 text-purple-600" />} />
        <StatCard label="Question Bank" value={stats.totalQuestions.toLocaleString()} color="text-orange-600" icon={<FileText className="w-5 h-5 text-orange-600" />} />
      </div>

      {/* Tabs */}
      <TabErrorBoundary>
        <Tabs defaultValue="exams" className="space-y-4">
          <TabsList>
            <TabsTrigger value="exams">All Exams</TabsTrigger>
            <TabsTrigger value="live">Live Monitoring</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="results">Exam Results</TabsTrigger>
            <TabsTrigger value="security">Security Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="exams">
            <ExamCreationTab />
          </TabsContent>

          <TabsContent value="live">
            <LiveMonitoringTab />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionBankTab />
          </TabsContent>

          <TabsContent value="results">
            <ExamResultsTab />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettingsTab />
          </TabsContent>
        </Tabs>
      </TabErrorBoundary>
    </div>
  );
}
