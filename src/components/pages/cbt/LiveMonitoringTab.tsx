import React, { useState, useEffect, useRef } from 'react';
import { Users, Flag, RefreshCw, AlertCircle, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { tenantApiGet, tenantApiPut } from '../../../lib/tenantApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProgress {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  questionsAnswered: number;
  totalQuestions: number;
  currentQuestion: number;
  status: 'Active' | 'Completed' | 'Paused' | 'Flagged';
  timeRemaining: number; // seconds
  completionPercentage: number;
  lastActivityTime: string;
  flagReason?: string;
}

interface MonitoringData {
  examId: string;
  examTitle: string;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
  students: StudentProgress[];
}

interface OngoingExam {
  id: string;
  title: string;
  subject: string;
  class: string;
}

interface SnapshotMeta {
  id: string;
  student_id: string;
  captured_at: string;
  student_name: string | null;
  admission_no: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-700',
  Paused: 'bg-yellow-100 text-yellow-700',
  Flagged: 'bg-red-100 text-red-700',
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveMonitoringTab() {
  const [ongoingExams, setOngoingExams] = useState<OngoingExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Flag dialog
  const [flagStudent, setFlagStudent] = useState<StudentProgress | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  // Camera snapshots gallery
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapFilter, setSnapFilter] = useState<string>('All');
  const [viewer, setViewer] = useState<{ meta: SnapshotMeta; image: string | null; loading: boolean } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchOngoingExams = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/exams?status=Ongoing&limit=50');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : [];
        setOngoingExams(list);
        if (list.length > 0 && !selectedExamId) {
          setSelectedExamId(list[0].id);
        }
      }
    } catch {
      // non-critical
    }
  };

  const fetchMonitoring = async (examId: string) => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tenantApiGet(`/api/tenant/cbt/monitoring?id=${examId}`);
      if (!res.ok) throw new Error('Failed to load monitoring data');
      const data = await res.json();
      setMonitoring(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async (examId: string) => {
    setSnapshotsLoading(true);
    try {
      const res = await tenantApiGet(`/api/tenant/cbt/security/${examId}/snapshots`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      // non-critical
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const openSnapshot = async (meta: SnapshotMeta) => {
    setViewer({ meta, image: null, loading: true });
    try {
      const res = await tenantApiGet(
        `/api/tenant/cbt/security/${selectedExamId}/snapshot-image?snapshotId=${meta.id}`
      );
      const data = res.ok ? await res.json() : null;
      setViewer({ meta, image: data?.data?.image ?? null, loading: false });
    } catch {
      setViewer({ meta, image: null, loading: false });
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchOngoingExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchMonitoring(selectedExamId);
      fetchSnapshots(selectedExamId);
      pollRef.current = setInterval(() => fetchMonitoring(selectedExamId), 10000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedExamId]);

  // ── Flag handler ───────────────────────────────────────────────────────────

  const handleFlag = async () => {
    if (!flagStudent || !flagReason.trim() || !selectedExamId) return;
    setFlagging(true);
    try {
      const res = await tenantApiPut(
        `/api/tenant/cbt/monitoring?id=${selectedExamId}&action=flag&studentId=${flagStudent.studentId}`,
        { reason: flagReason.trim() }
      );
      if (!res.ok) throw new Error('Failed to flag student');
      setFlagStudent(null);
      setFlagReason('');
      fetchMonitoring(selectedExamId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Flag failed');
    } finally {
      setFlagging(false);
    }
  };

  // ── Filtered students ──────────────────────────────────────────────────────

  const filteredStudents = (monitoring?.students || []).filter(
    (s) => statusFilter === 'All' || s.status === statusFilter
  );

  const flaggedCount = (monitoring?.students || []).filter((s) => s.status === 'Flagged').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Exam selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1">
              <Label htmlFor="exam-select">Select Ongoing Exam</Label>
              <select id="exam-select" className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
                <option value="">-- Select an exam --</option>
                {ongoingExams.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} ({e.subject} · {e.class})</option>
                ))}
              </select>
            </div>
            <Button variant="outline" size="icon" className="mt-5 sm:mt-0" onClick={() => { fetchOngoingExams(); if (selectedExamId) fetchMonitoring(selectedExamId); }} aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {ongoingExams.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No ongoing exams at the moment.</p>
          )}
        </CardContent>
      </Card>

      {!selectedExamId ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select an ongoing exam to monitor students.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading monitoring data...</div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-3">{error}</p>
          <Button variant="outline" onClick={() => fetchMonitoring(selectedExamId)}>Retry</Button>
        </div>
      ) : monitoring ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-gray-900">{monitoring.totalStudents}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Active</p><p className="text-2xl font-bold text-green-600">{monitoring.activeStudents}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Completed</p><p className="text-2xl font-bold text-gray-600">{monitoring.completedStudents}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Flagged</p><p className="text-2xl font-bold text-red-600">{flaggedCount}</p></CardContent></Card>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['All', 'Active', 'Completed', 'Paused', 'Flagged'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Student table */}
          <Card>
            <CardHeader><CardTitle className="text-base">{monitoring.examTitle} — Student Progress</CardTitle></CardHeader>
            <CardContent className="p-0">
              {filteredStudents.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-sm">No students match the selected filter.</p>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="p-4">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{student.studentName || student.studentId}</p>
                            <p className="text-xs text-gray-500">{student.admissionNo ? `${student.admissionNo} · ` : ''}{student.questionsAnswered}/{student.totalQuestions} answered</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <Badge className={STATUS_COLORS[student.status]}>{student.status}</Badge>
                            <p className="text-xs text-gray-500 mt-1">{formatTime(student.timeRemaining)} left</p>
                          </div>
                          {student.status !== 'Flagged' && student.status !== 'Completed' && (
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700"
                              onClick={() => { setFlagStudent(student); setFlagReason(''); }}>
                              <Flag className="w-3.5 h-3.5 mr-1" />Flag
                            </Button>
                          )}
                          {student.status === 'Flagged' && student.flagReason && (
                            <span className="text-xs text-red-600 max-w-[120px] truncate" title={student.flagReason}>
                              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />{student.flagReason}
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress value={student.completionPercentage} className="h-1.5" />
                      <p className="text-xs text-gray-400 mt-1 text-right">{student.completionPercentage}%</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Camera snapshots gallery */}
          <Card>
            <CardHeader className="cursor-pointer select-none" onClick={() => setSnapshotsOpen((o) => !o)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Camera Snapshots
                  {snapshots.length > 0 && <Badge className="bg-gray-100 text-gray-700">{snapshots.length}</Badge>}
                </CardTitle>
                {snapshotsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </CardHeader>
            {snapshotsOpen && (
              <CardContent>
                {snapshotsLoading ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Loading snapshots...</p>
                ) : snapshots.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No snapshots captured for this exam. Snapshots are only collected when the exam's
                    security settings have "Require camera" enabled.
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {['All', ...new Set(snapshots.map((s) => s.student_name || s.student_id))].map((name) => (
                        <button key={name} onClick={() => setSnapFilter(name)}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${snapFilter === name ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                          {name === 'All' ? name : `${name} (${snapshots.filter((s) => (s.student_name || s.student_id) === name).length})`}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                      {snapshots
                        .filter((s) => snapFilter === 'All' || (s.student_name || s.student_id) === snapFilter)
                        .map((snap) => (
                          <button key={snap.id} onClick={() => openSnapshot(snap)}
                            className="border rounded-md p-2 text-left hover:border-blue-400 hover:shadow-sm transition-all bg-gray-50">
                            <div className="aspect-video bg-gray-200 rounded flex items-center justify-center mb-1.5">
                              <Camera className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-xs font-medium text-gray-800 truncate">{snap.student_name || snap.student_id}</p>
                            <p className="text-[10px] text-gray-500">{snap.admission_no ? `${snap.admission_no} · ` : ''}{new Date(snap.captured_at).toLocaleTimeString()}</p>
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </>
      ) : null}

      {/* Snapshot viewer */}
      <Dialog open={!!viewer} onOpenChange={(open) => { if (!open) setViewer(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewer?.meta.student_name || viewer?.meta.student_id}
              <span className="block text-xs font-normal text-gray-500 mt-1">
                {viewer?.meta.admission_no ? `${viewer.meta.admission_no} · ` : ''}
                {viewer ? new Date(viewer.meta.captured_at).toLocaleString() : ''}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[240px] bg-gray-100 rounded-md">
            {viewer?.loading ? (
              <p className="text-sm text-gray-500">Loading image...</p>
            ) : viewer?.image ? (
              <img src={viewer.image} alt="Proctoring snapshot" className="max-h-[70vh] w-auto rounded" />
            ) : (
              <p className="text-sm text-red-600">Failed to load snapshot</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={!!flagStudent} onOpenChange={(open) => { if (!open) setFlagStudent(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Flag Student</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">Flagging <strong>{flagStudent?.studentName}</strong> for suspicious activity.</p>
            <div>
              <Label htmlFor="flag-reason">Reason *</Label>
              <textarea id="flag-reason" rows={3} className="w-full mt-1 border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={flagReason} onChange={(e) => setFlagReason(e.target.value)} placeholder="Describe the suspicious activity..." />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleFlag} disabled={flagging || !flagReason.trim()}>
                {flagging ? 'Flagging...' : 'Flag Student'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setFlagStudent(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
