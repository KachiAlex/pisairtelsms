import React, { useEffect, useState } from 'react'
import { RefreshCcw, Building2, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Badge } from '../../ui/badge'
import { HallAssignmentPanel } from './HallAssignmentPanel'
import { InvigilatorAssignmentPanel } from './InvigilatorAssignmentPanel'

export interface ExamSchedule {
  id: string
  examPeriodId: string
  subjectName: string
  examDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  examType: string
  hallAssignments: { id: string; hallName: string; studentCount: number }[]
  invigilators: { id: string; staffName: string; hallId: string }[]
}

interface ExamPeriod {
  id: string
  name: string
  termId: string
  startDate: string
  endDate: string
}

const EXAM_TYPE_COLORS: Record<string, string> = {
  written: 'bg-blue-100 text-blue-700',
  cbt: 'bg-purple-100 text-purple-700',
  practical: 'bg-emerald-100 text-emerald-700',
  oral: 'bg-amber-100 text-amber-700',
}

export function ExamScheduleTab() {
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [exams, setExams] = useState<ExamSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedExam, setExpandedExam] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tenant/timetable/calendar?resource=exam-periods')
      .then(r => r.json())
      .then(d => {
        const periods: ExamPeriod[] = d.data || []
        setExamPeriods(periods)
        if (periods.length > 0) setSelectedPeriod(periods[0].id)
      })
      .catch(() => setError('Failed to load exam periods'))
  }, [])

  useEffect(() => {
    if (!selectedPeriod) return
    loadExams()
  }, [selectedPeriod])

  async function loadExams() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenant/timetable/exam-schedules?examPeriodId=${selectedPeriod}`)
      const data = await res.json()
      // Fetch full details for each exam
      const examIds: string[] = (data.data || []).map((e: ExamSchedule) => e.id)
      const details = await Promise.all(
        examIds.map(id => fetch(`/api/tenant/timetable/exam-schedules?examId=${id}`).then(r => r.json()).then(d => d.data))
      )
      setExams(details.filter(Boolean))
    } catch {
      setError('Failed to load exam schedules')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select exam period" /></SelectTrigger>
          <SelectContent>
            {examPeriods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadExams}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {examPeriods.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p className="text-sm">No exam periods configured.</p>
            <p className="text-xs mt-1">Go to Configure → Exam Periods to set up exam windows first.</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {exams.length === 0 && selectedPeriod && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <p className="text-sm">No exams scheduled for this period yet.</p>
                <p className="text-xs mt-1">Click "Add Exam" to schedule the first exam.</p>
              </CardContent>
            </Card>
          )}

          {exams.map(exam => (
            <Card key={exam.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedExam(expandedExam === exam.id ? null : exam.id)}
              >
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs ${EXAM_TYPE_COLORS[exam.examType] || 'bg-gray-100 text-gray-700'}`}>
                    {exam.examType.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="font-semibold text-gray-900">{exam.subjectName}</p>
                    <p className="text-xs text-gray-500">{exam.examDate} • {exam.startTime}–{exam.endTime} ({exam.durationMinutes} min)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {exam.hallAssignments.length} hall{exam.hallAssignments.length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    {exam.invigilators.length} invigilator{exam.invigilators.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {expandedExam === exam.id && (
                <div className="border-t border-gray-100 p-4 grid gap-4 md:grid-cols-2">
                  <HallAssignmentPanel exam={exam} onRefresh={loadExams} />
                  <InvigilatorAssignmentPanel exam={exam} onRefresh={loadExams} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
