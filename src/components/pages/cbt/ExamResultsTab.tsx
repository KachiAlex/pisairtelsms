import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, TrendingUp, TrendingDown, Users, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { tenantApiGet } from '../../../lib/tenantApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamResult {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'Passed' | 'Failed';
  timeSpent: number; // seconds
  submittedAt: string;
}

interface StudentAnswer {
  questionId: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksObtained: number;
  totalMarks: number;
}

interface DetailedResult extends ExamResult {
  answers: StudentAnswer[];
}

interface ResultsSummary {
  examId: string;
  examTitle: string;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
  results: ExamResult[];
}

interface CompletedExam {
  id: string;
  title: string;
  subject: string;
  class: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExamResultsTab() {
  const [completedExams, setCompletedExams] = useState<CompletedExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail dialog
  const [detailStudent, setDetailStudent] = useState<DetailedResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCompletedExams = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/exams?status=Completed&limit=50');
      if (res.ok) {
        const data = await res.json();
        setCompletedExams(data.data || []);
        if (data.data?.length > 0 && !selectedExamId) {
          setSelectedExamId(data.data[0].id);
        }
      }
    } catch {
      // non-critical
    }
  };

  const fetchResults = async (examId: string) => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await tenantApiGet(`/api/tenant/cbt/results/${examId}?${params}`);
      if (!res.ok) throw new Error('Failed to load results');
      const data = await res.json();
      setSummary(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedResult = async (examId: string, studentId: string) => {
    setLoadingDetail(true);
    try {
      const res = await tenantApiGet(`/api/tenant/cbt/results/${examId}/student/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailStudent(data.data);
      }
    } catch {
      alert('Failed to load detailed result');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => { fetchCompletedExams(); }, []);
  useEffect(() => { if (selectedExamId) fetchResults(selectedExamId); }, [selectedExamId, startDate, endDate]);

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!selectedExamId) return;
    window.open(`/api/tenant/cbt/results/export?examId=${selectedExamId}&format=${format}`, '_blank');
  };

  // ── Filtered results ───────────────────────────────────────────────────────

  const filteredResults = (summary?.results || []).filter(
    (r) => statusFilter === 'All' || r.status === statusFilter
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Exam selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1">
              <Label htmlFor="exam-select">Select Completed Exam</Label>
              <select id="exam-select" className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
                <option value="">-- Select an exam --</option>
                {completedExams.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} ({e.subject} · {e.class})</option>
                ))}
              </select>
            </div>
            <Button variant="outline" size="icon" className="mt-5 sm:mt-0" onClick={() => { fetchCompletedExams(); if (selectedExamId) fetchResults(selectedExamId); }} aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {completedExams.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No completed exams yet.</p>
          )}
        </CardContent>
      </Card>

      {!selectedExamId ? (
        <div className="text-center py-12 text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a completed exam to view results.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading results...</div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-3">{error}</p>
          <Button variant="outline" onClick={() => fetchResults(selectedExamId)}>Retry</Button>
        </div>
      ) : summary ? (
        <>
          {/* Analytics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Avg Score</p><p className="text-2xl font-bold text-blue-600">{summary.averageScore.toFixed(1)}%</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Pass Rate</p><p className="text-2xl font-bold text-green-600">{summary.passRate.toFixed(0)}%</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Highest</p><p className="text-2xl font-bold text-emerald-600">{summary.highestScore}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Lowest</p><p className="text-2xl font-bold text-red-600">{summary.lowestScore}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Completion</p><p className="text-2xl font-bold text-purple-600">{summary.completionRate.toFixed(0)}%</p></CardContent></Card>
          </div>

          {/* Filters & Export */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="flex gap-2">
                  {['All', 'Passed', 'Failed'].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 flex-1">
                  <Input type="date" className="text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start date" />
                  <Input type="date" className="text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End date" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                    <Download className="w-3.5 h-3.5 mr-1" />CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                    <Download className="w-3.5 h-3.5 mr-1" />PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results table */}
          <Card>
            <CardHeader><CardTitle className="text-base">{summary.examTitle} — Results ({filteredResults.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {filteredResults.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-sm">No results match the selected filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-700">Student</th>
                        <th className="text-center p-3 font-medium text-gray-700">Score</th>
                        <th className="text-center p-3 font-medium text-gray-700">Percentage</th>
                        <th className="text-center p-3 font-medium text-gray-700">Status</th>
                        <th className="text-center p-3 font-medium text-gray-700">Time</th>
                        <th className="text-center p-3 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredResults.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="p-3">{result.studentName}</td>
                          <td className="p-3 text-center font-medium">{result.score}/{result.totalMarks}</td>
                          <td className="p-3 text-center">
                            <span className={`font-semibold ${result.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {result.percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={result.status === 'Passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {result.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-gray-600">{formatTime(result.timeSpent)}</td>
                          <td className="p-3 text-center">
                            <Button variant="outline" size="sm" onClick={() => fetchDetailedResult(summary.examId, result.studentId)}>
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Detail Dialog */}
      <Dialog open={!!detailStudent} onOpenChange={(open) => { if (!open) setDetailStudent(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailStudent?.studentName} — Detailed Result
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <p className="text-center py-8 text-gray-500">Loading details...</p>
          ) : detailStudent ? (
            <div className="space-y-4 pt-2">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xs text-gray-500">Score</p><p className="text-lg font-bold">{detailStudent.score}/{detailStudent.totalMarks}</p></div>
                <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xs text-gray-500">Percentage</p><p className="text-lg font-bold">{detailStudent.percentage.toFixed(1)}%</p></div>
                <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xs text-gray-500">Status</p><Badge className={detailStudent.status === 'Passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{detailStudent.status}</Badge></div>
                <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xs text-gray-500">Time</p><p className="text-lg font-bold">{formatTime(detailStudent.timeSpent)}</p></div>
              </div>

              {/* Answers */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Answers ({detailStudent.answers?.length || 0})</h4>
                <div className="space-y-3">
                  {(detailStudent.answers || []).map((ans, idx) => (
                    <Card key={ans.questionId} className={`border-l-4 ${ans.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-gray-900">Q{idx + 1}. {ans.questionText}</p>
                          <Badge className={ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {ans.marksObtained}/{ans.totalMarks}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className={`p-2 rounded ${ans.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="text-xs text-gray-500 mb-0.5">Student Answer</p>
                            <p className="font-medium">{ans.studentAnswer || '(No answer)'}</p>
                          </div>
                          <div className="p-2 rounded bg-blue-50">
                            <p className="text-xs text-gray-500 mb-0.5">Correct Answer</p>
                            <p className="font-medium text-blue-700">{ans.correctAnswer}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
