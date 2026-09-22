import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, CalendarRange, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
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
  const navigate = useNavigate()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const slotsRes = await tenantApiGet('/api/tenant/timetable/time-slots')
      if (!slotsRes.ok) throw new Error('Failed to load configuration data')
      const slotsData = await slotsRes.json()
      setTimeSlots(Array.isArray(slotsData.data) ? slotsData.data : [])
    } catch {
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
          <p className="text-sm text-gray-500">Bell times, period lengths, and break slots</p>
        </div>
      </div>

      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarRange className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm text-gray-700">
              Academic years, terms, holidays, and exam windows now live under{' '}
              <span className="font-medium">Academic Structure → Sessions &amp; Terms</span>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/tenant/academic-sessions')}>
            Open <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      <TimeSlotManager timeSlots={timeSlots} onRefresh={fetchAll} />
    </div>
  )
}
export default ConfigureTab
