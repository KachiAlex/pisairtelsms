import React, { useState, useEffect } from 'react'
import { FileText, TrendingUp, Award, Download, Calendar, AlertCircle, Loader2, ChevronDown, ChevronUp, Printer, User } from 'lucide-react'
import { Button } from '../../ui/button'
import { useParentContext } from '../../../contexts/ParentContext'
import { getAuthFromStorage } from '../../../lib/auth'

interface SubjectResult {
  subject: string; teacher: string; caScore: number; examScore: number;
  totalScore: number; grade: string; remark: string;
  classAverage: number; highestScore: number; lowestScore: number; position: number;
}

interface TermResult {
  term: string; academicSession: string; subjects: SubjectResult[];
  totalScore: number; averageScore: number; classPosition: string; totalStudents: number;
  attendancePercent: number; conduct: string; nextTermResumption: string; principalComment: string;
}

interface Student {
  id: string; name: string; admissionNumber: string; class: string; arm: string;
  dateOfBirth: string; gender: string;
}

interface TranscriptData {
  student: Student; sessions: TermResult[]; cumulativeGPA: number; totalSubjectsTaken: number;
}

const gradeColors: Record<string, string> = {
  A: 'text-green-700 bg-green-50 border-green-200',
  B: 'text-blue-700 bg-blue-50 border-blue-200',
  C: 'text-amber-700 bg-amber-50 border-amber-200',
  D: 'text-orange-700 bg-orange-50 border-orange-200',
  E: 'text-red-700 bg-red-50 border-red-200',
  F: 'text-red-800 bg-red-100 border-red-300',
}

export function ChildTranscript() {
  const { selectedChild } = useParentContext()
  const [data, setData] = useState<TranscriptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSession, setExpandedSession] = useState<number>(0)
  const auth = getAuthFromStorage()

  useEffect(() => { fetchTranscript() }, [selectedChild?.id])

  const fetchTranscript = async () => {
    if (!selectedChild) { setLoading(false); return }
    try {
      setLoading(true); setError(null)
      const token = auth?.token
      if (!token) { setError('Not authenticated'); return }
      const res = await fetch(`/api/parent/transcript?childId=${selectedChild.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch transcript')
      setData(await res.json())
    } catch (err) {
      console.error('Failed to fetch transcript:', err)
      setError('Failed to load transcript')
    } finally { setLoading(false) }
  }

  const handleDownload = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedChild?.name || 'transcript'}_report.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const handlePrint = () => window.print()

  if (!selectedChild) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Please select a child to view their report card.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No transcript data available</p>
      </div>
    )
  }

  const student = data.student

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Card</h1>
          <p className="text-gray-600 mt-1">Academic transcript for {student.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} className="gap-2"><Download className="w-4 h-4" />Download</Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" />Print</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" /><span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchTranscript}>Retry</Button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{student.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-sm">
              <div><p className="text-gray-500">Admission No</p><p className="font-medium text-gray-900">{student.admissionNumber}</p></div>
              <div><p className="text-gray-500">Class</p><p className="font-medium text-gray-900">{student.class} {student.arm}</p></div>
              <div><p className="text-gray-500">Gender</p><p className="font-medium text-gray-900">{student.gender}</p></div>
              <div><p className="text-gray-500">Cumulative GPA</p><p className="font-bold text-green-700">{data.cumulativeGPA.toFixed(2)}</p></div>
            </div>
          </div>
        </div>
      </div>

      {data.sessions.map((session, idx) => (
        <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setExpandedSession(expandedSession === idx ? -1 : idx)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">{session.term} · {session.academicSession}</h3>
                <p className="text-sm text-gray-500">Average: <span className="font-medium text-gray-700">{session.averageScore}%</span> · Position: <span className="font-medium text-gray-700">{session.classPosition} of {session.totalStudents}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getGradeColor(session.averageScore)}`}>{getGrade(session.averageScore)}</span>
              {expandedSession === idx ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </button>

          {expandedSession === idx && (
            <div className="border-t border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50">
                <div className="text-center"><p className="text-2xl font-bold text-blue-700">{session.subjects.length}</p><p className="text-sm text-gray-600">Subjects</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-green-700">{session.totalScore}</p><p className="text-sm text-gray-600">Total Score</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-amber-700">{session.attendancePercent}%</p><p className="text-sm text-gray-600">Attendance</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-purple-700">{session.conduct}</p><p className="text-sm text-gray-600">Conduct</p></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-700">Subject</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-700">CA (30%)</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-700">Exam (70%)</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-700">Total</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-700">Grade</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 hidden sm:table-cell">Remark</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {session.subjects.map((sub) => (
                      <tr key={sub.subject} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><p className="font-medium text-gray-900">{sub.subject}</p><p className="text-xs text-gray-500">{sub.teacher}</p></td>
                        <td className="text-center px-4 py-3 text-gray-700">{sub.caScore}</td>
                        <td className="text-center px-4 py-3 text-gray-700">{sub.examScore}</td>
                        <td className="text-center px-4 py-3"><span className="font-semibold text-gray-900">{sub.totalScore}</span></td>
                        <td className="text-center px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${gradeColors[sub.grade] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>{sub.grade}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{sub.remark}</td>
                        <td className="text-center px-4 py-3 text-gray-600 hidden md:table-cell">{sub.position}{getOrdinalSuffix(sub.position)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200 font-medium">
                    <tr>
                      <td className="px-4 py-3 text-gray-900">TOTAL / AVERAGE</td>
                      <td colSpan={2} className="text-center px-4 py-3 text-gray-700"></td>
                      <td className="text-center px-4 py-3 text-blue-700 font-bold">{session.totalScore}</td>
                      <td className="text-center px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getGradeColor(session.averageScore)}`}>{getGrade(session.averageScore)}</span>
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-gray-700">Average: {session.averageScore}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-4 bg-amber-50 border-t border-amber-100">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div><p className="text-sm font-semibold text-gray-700">Principal&apos;s Comment</p><p className="text-sm text-gray-600 mt-1">{session.principalComment}</p></div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Next term resumption: <strong>{formatDate(session.nextTermResumption)}</strong></span>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Performance Trend</h2>
        </div>
        <div className="flex items-end gap-4 h-40">
          {data.sessions.map((session, idx) => {
            const height = Math.min(session.averageScore, 100)
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-medium text-gray-700">{session.averageScore}%</div>
                <div className="w-full bg-gray-100 rounded-t-lg relative overflow-hidden" style={{ height: `${height * 1.2}px` }}>
                  <div className={`absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-500 ${session.averageScore >= 75 ? 'bg-green-400' : session.averageScore >= 60 ? 'bg-blue-400' : session.averageScore >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ height: '100%' }} />
                </div>
                <div className="text-xs text-gray-500 text-center">{session.term.replace('Term', '')}<br/>{session.academicSession.split('/')[0]}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getGrade(score: number): string {
  if (score >= 75) return 'A'; if (score >= 60) return 'B'; if (score >= 50) return 'C'
  if (score >= 45) return 'D'; if (score >= 40) return 'E'; return 'F'
}

function getGradeColor(score: number): string {
  return gradeColors[getGrade(score)] || 'text-gray-700 bg-gray-50 border-gray-200'
}

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th'
  const lastDigit = n % 10
  if (lastDigit === 1) return 'st'; if (lastDigit === 2) return 'nd'; if (lastDigit === 3) return 'rd'
  return 'th'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
