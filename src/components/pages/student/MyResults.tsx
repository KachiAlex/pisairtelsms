import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';
import { Button } from '../../ui/button';

interface StudentResult {
  subject: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  attendancePercent: number;
  grade: string;
}

interface ResultsData {
  results: StudentResult[];
  averageScore: number;
  classAverage: number;
  academicSession: string;
  term: string;
}

export function MyResults() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [data, setData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    fetchAcademicData();
  }, []);

  useEffect(() => {
    if (session && term) {
      fetchResults();
    }
  }, [session, term]);

  const fetchAcademicData = async () => {
    try {
      const yearsRes = await fetch('/api/tenant/timetable/calendar?resource=academic-years');
      const yearsData = await yearsRes.json();
      const years = yearsData.data?.map((y: any) => y.name) || [];
      setSessions(years);

      const termsRes = await fetch('/api/tenant/timetable/calendar?resource=terms');
      const termsData = await termsRes.json();
      const termNames = termsData.data?.map((t: any) => t.name) || [];
      setTerms(termNames);

      // Set defaults
      if (years.length > 0) setSession(years[0]);
      if (termNames.length > 0) setTerm(termNames[0]);
    } catch (err) {
      console.error('Failed to fetch academic data:', err);
      // Fallback
      setSessions(['2025/2026', '2024/2025', '2023/2024']);
      setTerms(['First', 'Second', 'Third']);
      setSession('2025/2026');
      setTerm('First');
    }
  };

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const auth = localStorage.getItem('auth');
      if (!auth) { setError('Not authenticated'); return; }
      const { token } = JSON.parse(auth);
      const res = await fetch(`/api/student/results?academicSession=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch results');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const gradeColor = (grade: string) => {
    if (grade === 'A') return 'text-green-700 bg-green-50';
    if (grade === 'B') return 'text-blue-700 bg-blue-50';
    if (grade === 'C') return 'text-amber-700 bg-amber-50';
    return 'text-red-700 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <div className="flex gap-3">
          <select
            value={session}
            onChange={e => setSession(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={term}
            onChange={e => setTerm(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {terms.map(t => <option key={t} value={t}>{t} Term</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setSession(s => s)}>Retry</Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Your Average</p>
              <p className="text-3xl font-bold text-blue-900">{data.averageScore}%</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Class Average</p>
              <p className="text-3xl font-bold text-gray-900">{data.classAverage}%</p>
            </div>
          </div>

          {/* Results table */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{session} — {term} Term</h2>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download Slip
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">CA (20)</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Exam (80)</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Total (100)</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Attendance</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.results.map((r) => (
                    <tr key={r.subject} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.subject}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{r.caScore}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{r.examScore}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${r.totalScore >= data.classAverage ? 'text-green-700' : 'text-red-700'}`}>
                        {r.totalScore}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{r.attendancePercent}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColor(r.grade)}`}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MyResults;
