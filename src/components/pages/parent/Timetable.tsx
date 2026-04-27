import { useState, useEffect } from 'react'
import { Calendar, Download, AlertCircle } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'
import { getAuthFromStorage } from '../../../lib/auth'

interface TimeSlot {
  day: string
  time: string
  subject: string
  teacher: string
  room: string
}

interface ExamSchedule {
  subject: string
  date: string
  time: string
  duration: number
  room: string
}

interface TimetableData {
  classSchedule: TimeSlot[]
  examSchedule: ExamSchedule[]
  holidays: Array<{ date: string; name: string }>
  terms: Array<{ id: string; name: string; startDate: string; endDate: string }>
}

export function Timetable() {
  const { selectedChild } = useParentContext()
  const [timetable, setTimetable] = useState<TimetableData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState('')
  const [viewMode, setViewMode] = useState<'weekly' | 'exam' | 'holidays'>('weekly')

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

  const fetchTimetable = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    try {
      const auth = getAuthFromStorage()
      const termId = selectedTerm || 'current'
      const res = await fetch(
        `/api/parent/timetable?childId=${selectedChild.id}&termId=${termId}`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      )
      if (!res.ok) throw new Error('Failed to fetch timetable')
      const data = await res.json()
      setTimetable(data)
      if (!selectedTerm && data.terms?.length > 0) {
        setSelectedTerm(data.terms[0].id)
      }
      setError(null)
    } catch (err) {
      setError('Failed to load timetable')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTimetable()
  }, [selectedChild, selectedTerm])

  const handleDownload = () => {
    const content = `
TIMETABLE FOR ${selectedChild?.name}
Generated: ${new Date().toLocaleDateString()}

CLASS SCHEDULE:
${timetable?.classSchedule.map(slot => 
  `${slot.day} ${slot.time}: ${slot.subject} (${slot.teacher}) - Room ${slot.room}`
).join('\n')}

EXAM SCHEDULE:
${timetable?.examSchedule.map(exam =>
  `${exam.subject}: ${exam.date} at ${exam.time} (${exam.duration}min) - Room ${exam.room}`
).join('\n')}

HOLIDAYS:
${timetable?.holidays.map(h => `${h.date}: ${h.name}`).join('\n')}
    `
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timetable-${selectedChild?.id}.txt`
    a.click()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Timetable</h1>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
            <button
              onClick={fetchTimetable}
              className="text-xs text-red-700 hover:text-red-900 font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Term</label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timetable?.terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} ({term.startDate} - {term.endDate})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 self-end"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['weekly', 'exam', 'holidays'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                viewMode === mode
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Schedule */}
      {viewMode === 'weekly' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-900 w-20">Time</th>
                {days.map(day => (
                  <th key={day} className="px-4 py-3 text-left font-semibold text-gray-900">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{time}</td>
                  {days.map(day => {
                    const slot = timetable?.classSchedule.find(
                      s => s.day === day && s.time === time
                    )
                    return (
                      <td key={`${day}-${time}`} className="px-4 py-3">
                        {slot ? (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <p className="font-medium text-blue-900 text-xs">{slot.subject}</p>
                            <p className="text-xs text-blue-700">{slot.teacher}</p>
                            <p className="text-xs text-blue-600">Room {slot.room}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exam Schedule */}
      {viewMode === 'exam' && (
        <div className="space-y-3">
          {timetable?.examSchedule && timetable.examSchedule.length > 0 ? (
            timetable.examSchedule.map((exam, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{exam.subject}</h3>
                    <div className="grid grid-cols-2 gap-3 mt-2 text-sm text-gray-600">
                      <div>
                        <p className="text-xs text-gray-500">Date & Time</p>
                        <p className="font-medium text-gray-900">
                          {new Date(exam.date).toLocaleDateString()} at {exam.time}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duration & Room</p>
                        <p className="font-medium text-gray-900">
                          {exam.duration} minutes · Room {exam.room}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-100">
              <Calendar className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No exam schedule available</p>
            </div>
          )}
        </div>
      )}

      {/* Holidays */}
      {viewMode === 'holidays' && (
        <div className="space-y-3">
          {timetable?.holidays && timetable.holidays.length > 0 ? (
            timetable.holidays.map((holiday, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{holiday.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(holiday.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-100">
              <Calendar className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No holidays scheduled</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
