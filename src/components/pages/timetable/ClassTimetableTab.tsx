import React, { useEffect, useState } from 'react'
import { Plus, RefreshCcw, Wand2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Badge } from '../../ui/badge'
import { TimetableEntryModal } from './TimetableEntryModal'
import { AutoScheduleDialog } from './AutoScheduleDialog'

const DAY_HEADERS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_NUMS = [1, 2, 3, 4, 5]

interface ScheduleEntry {
  id: string
  timeSlotId: string
  subjectName: string
  teacherName: string
  roomId?: string
  dayOfWeek: number
}

interface ClassSchedule {
  id: string
  classId: string
  termId: string
  entries: ScheduleEntry[]
}

interface TimeSlot {
  id: string
  name: string
  startTime: string
  endTime: string
  isBreak: boolean
  sequence: number
}

interface Term {
  id: string
  name: string
  academicYear: string
}

const CLASSES = ['JSS 1A', 'JSS 1B', 'JSS 2A', 'JSS 2B', 'JSS 3A', 'SS 1A', 'SS 1B', 'SS 2A', 'SS 2B', 'SS 3A']

export function ClassTimetableTab() {
  const [terms, setTerms] = useState<Term[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedClass, setSelectedClass] = useState(CLASSES[0])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [schedule, setSchedule] = useState<ClassSchedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalSlot, setModalSlot] = useState<{ timeSlotId: string; dayOfWeek: number } | null>(null)
  const [showAutoSchedule, setShowAutoSchedule] = useState(false)

  useEffect(() => {
    async function loadConfig() {
      try {
        const [calRes, slotsRes] = await Promise.all([
          fetch('/api/tenant/timetable/calendar'),
          fetch('/api/tenant/timetable/time-slots'),
        ])
        const calData = await calRes.json()
        const slotsData = await slotsRes.json()
        const fetchedTerms: Term[] = Array.isArray(calData.data?.terms) ? calData.data.terms : []
        setTerms(fetchedTerms)
        setTimeSlots(Array.isArray(slotsData.data) ? slotsData.data.filter((s: TimeSlot) => !s.isBreak) : [])
        if (fetchedTerms.length > 0) setSelectedTerm(fetchedTerms[0].id)
      } catch {
        setError('Failed to load configuration')
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    if (!selectedTerm) return
    loadSchedule()
  }, [selectedClass, selectedTerm])

  async function loadSchedule() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenant/timetable/class-schedules?classId=${encodeURIComponent(selectedClass)}&termId=${selectedTerm}`)
      const data = await res.json()
      const schedules: ClassSchedule[] = data.data || []
      if (schedules.length > 0) {
        const detailRes = await fetch(`/api/tenant/timetable/class-schedules?scheduleId=${schedules[0].id}`)
        const detailData = await detailRes.json()
        setSchedule(detailData.data)
      } else {
        setSchedule(null)
      }
    } catch {
      setError('Failed to load class schedule')
    } finally {
      setLoading(false)
    }
  }

  async function ensureScheduleExists(): Promise<string | null> {
    if (schedule) return schedule.id
    try {
      const res = await fetch('/api/tenant/timetable/class-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClass, termId: selectedTerm }),
      })
      const data = await res.json()
      return data.data?.id || null
    } catch {
      return null
    }
  }

  function getCellEntry(timeSlotId: string, dayOfWeek: number): ScheduleEntry | undefined {
    return schedule?.entries.find(e => e.timeSlotId === timeSlotId && e.dayOfWeek === dayOfWeek)
  }

  function openModal(timeSlotId: string, dayOfWeek: number) {
    setModalSlot({ timeSlotId, dayOfWeek })
    setShowModal(true)
  }

  async function handleEntrySaved() {
    setShowModal(false)
    await loadSchedule()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-48"><SelectValue placeholder={terms.length === 0 ? 'No terms yet' : undefined} /></SelectTrigger>
          <SelectContent>
            {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academicYear})</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadSchedule}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowAutoSchedule(true)} disabled={!selectedTerm} className="border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50">
          <Wand2 className="h-4 w-4 mr-1" /> Auto Schedule
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{selectedClass} — Weekly Timetable</CardTitle>
          <CardDescription>Click any empty cell to assign a subject and teacher</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Time Slot</TableHead>
                    {DAY_HEADERS.map(d => <TableHead key={d} className="text-center">{d}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-8">
                        No time slots configured. Go to Configure → Time Slots to set up your school day.
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeSlots.map(slot => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium text-xs text-gray-700">
                          <p>{slot.name}</p>
                          <p className="text-gray-400">{slot.startTime}–{slot.endTime}</p>
                        </TableCell>
                        {DAY_NUMS.map(day => {
                          const entry = getCellEntry(slot.id, day)
                          return (
                            <TableCell key={day} className="text-center p-1">
                              {entry ? (
                                <div className="rounded-lg bg-blue-50 border border-blue-100 p-1.5 text-xs">
                                  <p className="font-semibold text-blue-800">{entry.subjectName}</p>
                                  <p className="text-blue-600">{entry.teacherName}</p>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openModal(slot.id, day)}
                                  className="w-full h-10 rounded-lg border border-dashed border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400 transition flex items-center justify-center"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && modalSlot && (
        <TimetableEntryModal
          scheduleId={schedule?.id || null}
          timeSlotId={modalSlot.timeSlotId}
          dayOfWeek={modalSlot.dayOfWeek}
          classId={selectedClass}
          termId={selectedTerm}
          onSaved={handleEntrySaved}
          onClose={() => setShowModal(false)}
          ensureSchedule={ensureScheduleExists}
        />
      )}

      <AutoScheduleDialog
        classId={selectedClass}
        termId={selectedTerm}
        open={showAutoSchedule}
        onClose={() => setShowAutoSchedule(false)}
        onScheduled={() => {
          setShowAutoSchedule(false)
          loadSchedule()
        }}
      />
    </div>
  )
}
