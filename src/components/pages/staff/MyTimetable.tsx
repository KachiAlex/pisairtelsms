import React, { useEffect, useState } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '../../ui/button'

interface ScheduleEntry {
  id: string
  dayOfWeek: number
  timeSlot: string
  subject: string
  className: string
  room: string
  startTime: string
  endTime: string
}

interface ExamEntry {
  id: string
  subject: string
  date: string
  time: string
  room: string
  duration: number
}

interface Term {
  id: string
  name: string
}

interface TimetableData {
  schedule: ScheduleEntry[]
  examSchedule: ExamEntry[]
  currentTerm: string
  availableTerms: Term[]
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function MyTimetable() {
  const [data, setData] = useState<TimetableData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const auth = localStorage.getItem('auth')
        if (!auth) {
          setError('Not authenticated')
          return
        }

        const { token } = JSON.parse(auth)
        const params = selectedTerm ? `?termId=${selectedTerm}` : ''
        const response = await fetch(`/api/staff/timetable${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch timetable')
        }

        const timetableData = await response.json()
        setData(timetableData)
        if (!selectedTerm && timetableData.currentTerm) {
          setSelectedTerm(timetableData.currentTerm)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching timetable:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimetable()
  }, [selectedTerm])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Timetable</h3>
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
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  const today = new Date().getDay()
  const currentDayIndex = today === 0 ? 4 : today - 1 // Adjust for Monday=0

  return (
    <div className="space-y-6">
      {/* Term Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Term:</label>
        <div className="relative">
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-8 text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            {data.availableTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Weekly Timetable Grid */}
      {data.schedule.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No schedule assigned for this term</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
                {DAYS.map((day, idx) => (
                  <th
                    key={day}
                    className={`px-4 py-3 text-left text-sm font-semibold ${
                      idx === currentDayIndex
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-gray-900'
                    }`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Get unique time slots */}
              {Array.from(
                new Set(data.schedule.map((s) => s.timeSlot))
              ).map((timeSlot) => (
                <tr key={timeSlot} className="border-b border-gray-200">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
                    {timeSlot}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const session = data.schedule.find(
                      (s) => s.timeSlot === timeSlot && s.dayOfWeek === dayIdx
                    )
                    return (
                      <td
                        key={`${timeSlot}-${dayIdx}`}
                        className={`px-4 py-3 text-sm ${
                          dayIdx === currentDayIndex
                            ? 'bg-blue-50'
                            : ''
                        }`}
                      >
                        {session ? (
                          <div className="rounded-lg bg-blue-100 p-2 border border-blue-300">
                            <p className="font-semibold text-blue-900">{session.subject}</p>
                            <p className="text-xs text-blue-700">{session.className}</p>
                            <p className="text-xs text-blue-600">Room: {session.room}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
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
      {data.examSchedule.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Exam Schedule</h2>
          <div className="space-y-3">
            {data.examSchedule.map((exam) => (
              <div key={exam.id} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{exam.subject}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {exam.date} at {exam.time}
                    </p>
                    <p className="text-sm text-gray-600">
                      Duration: {exam.duration} minutes | Room: {exam.room}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
