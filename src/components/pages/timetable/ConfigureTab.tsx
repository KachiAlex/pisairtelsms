import React, { useEffect, useState } from 'react'
import { Settings, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { AcademicYearManager } from './AcademicYearManager'
import { TermManager } from './TermManager'
import { HolidayManager } from './HolidayManager'
import { ExamPeriodManager } from './ExamPeriodManager'
import { TimeSlotManager } from './TimeSlotManager'
import { tenantApiGet } from '../../../lib/tenantApi'

export interface Term {
  id: string
  name: string
  startDate: string
  endDate: string
  academicYear: string
}

export interface Holiday {
  id: string
  termId: string
  name: string
  startDate: string
  endDate: string
}

export interface ExamPeriod {
  id: string
  termId: string
  name: string
  startDate: string
  endDate: string
}

export interface TimeSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  durationMinutes: number
  dayOfWeek: number
  isBreak: boolean
  sequence: number
}

export function ConfigureTab() {
  const [terms, setTerms] = useState<Term[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('calendar')

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [calRes, slotsRes] = await Promise.all([
        tenantApiGet('/api/tenant/timetable/calendar'),
        tenantApiGet('/api/tenant/timetable/time-slots'),
      ])
      if (!calRes.ok || !slotsRes.ok) throw new Error('Failed to load configuration data')
      const calData = await calRes.json()
      const slotsData = await slotsRes.json()
      setTerms(Array.isArray(calData.data?.terms) ? calData.data.terms : [])
      setHolidays(Array.isArray(calData.data?.holidays) ? calData.data.holidays : [])
      setExamPeriods(Array.isArray(calData.data?.examPeriods) ? calData.data.examPeriods : [])
      setTimeSlots(Array.isArray(slotsData.data) ? slotsData.data : [])
    } catch (e) {
      setError('Failed to load configuration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-600">
          <p>{error}</p>
          <button onClick={fetchAll} className="mt-3 text-sm text-blue-600 underline">Retry</button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Timetable Configuration</h2>
          <p className="text-sm text-gray-500">Set up your school calendar, time slots, and break times</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            School Calendar
          </TabsTrigger>
          <TabsTrigger value="timeslots">
            <Clock className="h-4 w-4 mr-2" />
            Time Slots & Breaks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6 mt-4">
          <AcademicYearManager onRefresh={fetchAll} />
          <TermManager terms={terms} onRefresh={fetchAll} />
          <HolidayManager holidays={holidays} terms={terms} onRefresh={fetchAll} />
          <ExamPeriodManager examPeriods={examPeriods} terms={terms} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="timeslots" className="mt-4">
          <TimeSlotManager timeSlots={timeSlots} onRefresh={fetchAll} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
